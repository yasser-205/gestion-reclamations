from bson import ObjectId
from app.database import fs

def enregistrer(contenu: bytes, nom: str, type_mime: str) -> str:
    file_id = fs.put(contenu, filename=nom, content_type=type_mime)
    return str(file_id)

def recuperer(file_id: str):
    return fs.get(ObjectId(file_id))

def supprimer(file_id: str) -> None : 
    fs.delete(ObjectId(file_id))

    