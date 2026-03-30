from classes import CreateUser, UpdateUser
from fastapi import FastAPI
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, auth
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os

load_dotenv()

# Init Firebase Admin once
cred = credentials.Certificate(os.environ["PATH_TO_FIREBASE_ADMIN_KEY"])
if not firebase_admin._apps:
    firebase_admin.initialize_app(
        cred,
        {"databaseURL": "https://ear-training-8f082.firebaseio.com"},
    )

db = firestore.client()
# doc = db.collection("users").document("pU1z2BwT9l0hO1p6R34a").get()

# if (doc.exists): # type: ignore
#     print(doc.to_dict()) # type: ignore

app = FastAPI()
origins = [
    "http://localhost:8081"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,    
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
async def create_profile(profile: CreateUser):
    # TODO: validate auth_token here
    decoded_token = auth.verify_id_token(profile.authToken)
    email = decoded_token["email"]
    uid = decoded_token["uid"]
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

    return "success"

@app.post("/update-profile")
async def update_profile(update: UpdateUser):
    decoded_token = auth.verify_id_token(update.authToken)
    email = decoded_token["email"]
    uid = decoded_token["uid"]
    req_dict = update.model_dump(exclude_none=True)
    print(req_dict)

    db.collection("users").document(uid).update(req_dict)
    return update