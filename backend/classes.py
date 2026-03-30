from datetime import datetime
from typing import Optional

from pydantic import BaseModel

class UserRequestBody(BaseModel):
    authToken: str


class CreateUser(UserRequestBody):
    firstName: str 
    lastName: str


class UpdateProfile(UserRequestBody):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    profilePicture: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None


class UpdatePreferences(UserRequestBody):
    sound: Optional[bool] = None
    haptic: Optional[bool] = None
    listening: Optional[bool] = None


class UpdateNotifications(UserRequestBody):
    daily: Optional[bool] = None
    streak: Optional[bool] = None


class UpdatePrivacy(UserRequestBody):
    analytics: Optional[bool] = None
    location: Optional[bool] = None


class UpdateUser(UpdateProfile, UpdatePrivacy, UpdateNotifications, UpdatePreferences):
    pass