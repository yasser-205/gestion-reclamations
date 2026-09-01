from bson import ObjectId
from datetime import datetime, timezone
from app.database import db

collection = db["client"]

def _serealiser(doc:dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc

def _generer_numero() -> str :
    annee = datetime.now(timezone.utc).year
    prefixe = f"CLI-{annee}-"
    dernier = collection.find_one(
        {"numero_client": {"$regex": f"^{prefixe}"}},
        sort=[("numero_client", -1)],
    )
    dernier_compte = int(dernier["numero_client"].split("-")[-1]) if dernier else 0
    return f"{prefixe}{dernier_compte + 1:05d}"

def creer_client(donnees: dict) -> dict:
    donnees["numero_client"] = _generer_numero()
    donnees["date_creation"] = datetime.now(timezone.utc)
    donnees["email_verifie"] = False

    resultat = collection.insert_one(donnees)
    doc = collection.find_one({"_id": resultat.inserted_id})
    return _serealiser(doc)

def verifier_code(email: str, code: str) -> dict | None:
    doc = collection.find_one({"email": email, "code_verification": code})
    if doc is None:
        return None
    expiration = doc.get("code_expiration")
    if expiration is not None and expiration < datetime.now(timezone.utc).replace(tzinfo=None):
        return None
    collection.update_one(
        {"_id": doc["_id"]},
        {"$set": {"email_verifie": True}, "$unset": {"code_verification": "", "code_expiration": ""}},
    )
    return get_par_id(str(doc["_id"]))

def lister() -> list[dict]:
    return [_serealiser(doc) for doc in collection.find().sort("date_creation", -1)]

def get_par_id(id: str) -> dict | None:
    doc = collection.find_one({"_id": ObjectId(id)})
    return _serealiser(doc) if doc else None

def modifier_client(id: str, maj: dict) -> dict | None:
    if maj:
        collection.update_one({"_id": ObjectId(id)}, {"$set": maj})
    return get_par_id(id)