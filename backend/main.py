from contextlib import asynccontextmanager
from math import floor
from typing import Optional
from fastapi import FastAPI
from firebase_admin import auth
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import datetime
from daily_task import daily_task, setup_scheduler
from firestore_setup import UserProgress, db
from constants import BASE_XP_PER_CORRECT, MAX_LEVEL, RECENT_WINDOW_MAX

@asynccontextmanager
async def lifespan(app: FastAPI):
    # on start
    print("setting up scheduler")
    scheduler = setup_scheduler()
    daily = db.collection("exercises").document("daily").get().to_dict() # type: ignore
    daily_date = datetime.date.fromtimestamp(daily.get("date").timestamp()) # type: ignore
    if datetime.date.today() > daily_date: # type: ignore
        daily_task()

    # on shutdown
    yield
    scheduler.shutdown()
    print("shutting down scheduler")
app = FastAPI(lifespan=lifespan)
origins = [
    "http://localhost:8081",
    "http://127.0.0.1:8081"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,    
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CreateProfileRequestBody(BaseModel):
    firstName: str 
    lastName: str
    authToken: str

class UpdateProfileRequestBody(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    profilePicture: Optional[str] = None
    authToken: str

class CreateProgressRequestBody(BaseModel):
    authToken: str

class SubmitDailyRequestBody(BaseModel):
    answer: str
    authToken: str


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/user")
def get_user():
    # NOTE: hard-coded for now (demo/testing)
    user_id = "pU1z2BwT9l0hO1p6R34a"

    snap = db.collection("users").document(user_id).get()
    if not snap.exists: # type: ignore
        return {"error": "user not found"}

    data = snap.to_dict() or {} # type: ignore
    data.setdefault("level", 1)
    data.setdefault("currentXp", 0)
    data.setdefault("streak", 0)
    data.setdefault("uid", user_id)
    return data


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}


@app.post("/create-profile")
async def create_profile(profile: CreateProfileRequestBody):
    # TODO: validate auth_token here
    decoded_token = auth.verify_id_token(profile.authToken)
    email = decoded_token["email"]
    uid = decoded_token["uid"]

    # add a new user
    db.collection("users").document(uid).set({
        "firstName": profile.firstName,
        "lastName": profile.lastName,
        "email": email,
        "uid": uid,
        "profile_picture": "",
        "level": 1,
        "currentXp": 0,
        "streak": 0
    })

    # add a new progress document
    await create_progress(CreateProgressRequestBody(authToken=profile.authToken))

    return "success"

@app.post("/update-profile")
async def update_profile(update: UpdateProfileRequestBody):
    decoded_token = auth.verify_id_token(update.authToken)
    email = decoded_token["email"]
    uid = decoded_token["uid"]

    new_doc = {}

    if update.firstName != None:
        new_doc["firstName"] = update.firstName

    if update.lastName != None:
        new_doc["lastName"] = update.lastName

    if update.profilePicture != None:
        new_doc["profilePicture"] = update.profilePicture

    db.collection("users").document(uid).update(new_doc)
    return

@app.post("/create-progress")
async def create_progress(request: CreateProgressRequestBody):
    decoded_token = auth.verify_id_token(request.authToken)
    email = decoded_token["email"]
    uid = decoded_token["uid"]

    # add a document for tracking this user's progress
    db.collection("progress").document(uid).set({
        "xp": 0.0,
        "level": 1,
        "streak": 0,
        "lastPlayedDate": None,
        "exercisesCompleted": 0,
        "correctAnswers": 0,
        "totalAnswers": 0,
        "weeklyCompletedDays": [],
        "recentHistory": []
    })

    return

@app.post("/submit-daily")
async def submit_daily(request: SubmitDailyRequestBody):
    decoded_token = auth.verify_id_token(request.authToken)
    email = decoded_token["email"]
    uid = decoded_token["uid"]

    response = {"isCorrect": False, "xpGained": 0, "success": True, "errorMessage": "No error"}

    # get progress if it exists. instatiate it if it doesn't
    doc = db.collection("progress").document(uid).get()
    if not doc.exists: # type: ignore
        await create_progress(CreateProgressRequestBody(authToken=request.authToken))
        doc = db.collection("progress").document(uid).get()
    progress = doc.to_dict() # type: ignore
    progress = UserProgress(**progress) # type: ignore

    # check if they've already completed today's daily
    lastPlayedDate = None if progress.lastPlayedDate is None else datetime.date.fromtimestamp(progress.lastPlayedDate.timestamp())
    today = datetime.date.today()
    if lastPlayedDate == today:
        response["success"] = False
        response["errorMessage"] = "You've already completed the daily challenge"
        return response
    
    # check if the answer is correct and update history accordingly
    daily = db.collection("exercises").document("daily").get().to_dict() # type: ignore
    isCorrect = request.answer == daily["answer"] # type: ignore
    if isCorrect:
        # update streak
        # TODO: make the daily task also reset streaks
        progress.streak += 1 # type: ignore
        progress.recentHistory.append(True)
        progress.lastPlayedDate = datetime.datetime.now()
        response["isCorrect"] = True
        
        # award xp
        accuracy = sum(progress.recentHistory) / len(progress.recentHistory)
        mult = xpMultiplierFromAccuracy(accuracy)
        xpGained = max(1, round(BASE_XP_PER_CORRECT * mult)) # usually 4..7
        progress.xp += xpGained
        response["xpGained"] = xpGained
    else:
        progress.recentHistory.append(False)
        response["isCorrect"] = False

    if len(progress.recentHistory) > RECENT_WINDOW_MAX:
        progress.recentHistory.pop(0)

    # write back to the doc
    print(progress)
    db.collection("progress").document(uid).set(progress.model_dump()) # type: ignore

    return response

def xpMultiplierFromAccuracy(accuracy):
  a = max(0, min(1, accuracy))
  if (a < 0.6): return 0.8
  if (a < 0.8): return 1.0
  if (a < 0.9): return 1.2
  return 1.4

def xpToLevelUp(level):
    # Level 1–20: 20 XP each (fast)
    if (level <= 20): return 20
    # Level 21–100: 20 + (level-20)*2 (slower)
    return 20 + (level - 20) * 2

def getLevel(xp):
    level = 1
    while (level < MAX_LEVEL):
        need = xpToLevelUp(level)
        if (xp < need): break
        xp -= need
        level += 1

    return level