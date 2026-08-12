from pymongo import MongoClient
from app.config import settings

client = MongoClient(settings.mongo_uri)
db = client[settings.db_name]


def ping() -> bool:
    client.admin.command("ping")
    return True
