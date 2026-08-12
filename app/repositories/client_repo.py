from bson import ObjectId
from datetime import datetime, timezone
from app.database import db

collection = db["client"]

def _serealiser(doc:dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc

def _generer_numero() -> str :
    annee = datetime.now(timezone.utc).year
    compte= collection.count_documents({}) + 1
    return f"CLI-{annee}-{compte:05d}"

def creer_client(donnees: dict) -> dict:
    donnees["numero_client"] = _generer_numero()
    donnees["date_creation"] = datetime.now(timezone.utc)

    resultat = collection.insert_one(donnees)
    doc = collection.find_one({"_id": resultat.inserted_id})
    return _serealiser(doc)

def lister() -> list[dict]:
    return [_serealiser(doc) for doc in collection.find().sort("date_creation", -1)]

def get_par_id(id: str) -> dict | None:
    doc = collection.find_one({"_id": ObjectId(id)})
    return _serealiser(doc) if doc else None

def modifier_client(id: str, maj: dict) -> dict | None:
    if maj:
        collection.update_one({"_id": ObjectId(id)}, {"$set": maj})
    return get_par_id(id)