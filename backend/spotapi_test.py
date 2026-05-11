from dotenv import load_dotenv
from spotapi import (
    Login, 
    Config, 
    NoopLogger,
    User, 
    solver_clients, 
    PrivatePlaylist, 
    MongoSaver,
    JSONSaver
)
import os
import json

load_dotenv()

cfg = Config(
    solver=solver_clients.Capsolver("YOUR_API_KEY", proxy="YOUR_PROXY"), # Proxy is optional
    logger=NoopLogger(),
    # You can add a proxy by passing a custom TLSClient
)

cookies = {}
with open("cookies.json") as file:
    data = json.load(file)
    for d in data:
        cookies.update({
            d["name"]: d["value"]
        }) 

dump = {
    "identifier": os.environ["SPOTIFY_EMAIL"],
    "password": os.environ["SPOTIFY_PASSWORD"],
    "cookies": cookies
}

login = Login.from_cookies(dump=dump, cfg=cfg)
if not login.logged_in:
    login.login()

user = User(login)
print(user.get_user_info())

# JSONSaver.save()

# Login.from_saver()

# instance = Login(cfg, os.environ["SPOTIFY_PASSWORD"], email=os.environ["SPOTIFY_EMAIL"])
# # Now we have a valid Login instance to pass around
# instance.login()

# # Do whatever you want now
# playlist = PrivatePlaylist(instance)
# playlist.create_playlist("SpotAPI Showcase!")

# # Save the session
# instance.save(MongoSaver())