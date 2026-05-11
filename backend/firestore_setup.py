import datetime
from typing import Optional

import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

# Init Firebase Admin once
# cred = credentials.Certificate(os.environ["PATH_TO_FIREBASE_ADMIN_KEY"])
cred = credentials.Certificate({
    "type": "service_account",
    "project_id": os.environ["PROJECT_ID"],
    "private_key": os.environ["PRIVATE_KEY"].replace("\\n", "\n"),
    "client_email": os.environ["CLIENT_EMAIL"],
    "token_uri": "https://oauth2.googleapis.com/token",
})
if not firebase_admin._apps:
    firebase_admin.initialize_app(
        cred,
        {"databaseURL": "https://ear-training-8f082.firebaseio.com"},
    )

db = firestore.client()

class UserProgress(BaseModel):
    xp: float
    level: int
    streak: int
    lastPlayedDate: Optional[datetime.datetime] = None
    exercisesCompleted: int
    correctAnswers: int
    totalAnswers: int
    weeklyCompletedDays: list[int]
    recentHistory: list[bool]