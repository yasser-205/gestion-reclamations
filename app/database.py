from pymongo import MongoClient
from app.config import settings
from gridfs import GridFS

client = MongoClient(settings.mongo_uri)
db = client[settings.db_name]

fs = GridFS(db)


def ping() -> bool:
    client.admin.command("ping")
    return True
