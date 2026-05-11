from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import random
from firestore_setup import db
import datetime

def setup_scheduler():
    scheduler = BackgroundScheduler()
    trigger = CronTrigger(hour=0, minute=0)
    scheduler.add_job(daily_task, trigger)
    scheduler.start()
    return scheduler

def daily_task():
    print("updating daily challenge")
    db.collection("exercises").document("daily").set({
        "answer": random.choice(["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"]),
        "date": datetime.datetime.now()
    })