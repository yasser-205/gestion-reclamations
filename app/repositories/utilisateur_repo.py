from bson import ObjectId
from app.database import db

collection = db["utilisateur"]

# le convertisseur interne
def serialiser(doc: dict) -> dict: 
    doc["id"] = str(doc.pop("_id"))
    return doc


def creer_utilisateur(donnees: dict) -> dict:
    resultat = collection.insert_one(donnees)
    doc = collection.find_one({"_id": resultat.inserted_id})
    return serialiser(doc)

# chercher par login
def get_par_login(login: str) -> dict | None:
    doc = collection.find_one({"login" : login})
    return serialiser(doc) if doc else None

# chercher par id
def get_par_id(id: str) -> dict |None:
    doc = collection.find_one({"_id" : ObjectId(id)})
    return serialiser(doc) if doc else None

def lister() -> list[dict]:
    return[serialiser(doc) for doc in collection.find()]

def modifier_utilisateur(id: str, maj: dict) -> dict | None:
    if maj:
        collection.update_one({"_id": ObjectId(id)}, {"$set": maj})
    doc = collection.find_one({"_id": ObjectId(id)})
    return serialiser(doc) if doc else None

def get_par_client_id(client_id: str) -> dict |None:
    doc = collection.find_one({"client_id" : client_id})
    return serialiser(doc) if doc else None

def supprimer_utilisateur(id: str) -> None:
    collection.delete_one({"_id": ObjectId(id)})

def changer_mot_de_passe(id:str, nouveau_hache: str) -> bool:
    resultat = collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"mot_de_passe": nouveau_hache}},
    )
    return resultat.modified_count > 0