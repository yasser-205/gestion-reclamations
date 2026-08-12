from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from typing import Optional

class Adresse(BaseModel):
    rue: str
    code_postal : str
    ville : str

class Contrat(BaseModel):
    numero : str
    type : str
    date_debut: Optional[date]=None

class ClientBase(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    telephone: str
    date_naissance: Optional[date] = None
    adresse: Optional[Adresse] = None
    contrat: list[Contrat] = []

class ClientCreation(ClientBase):
    pass

class ClientPublic(ClientBase):
    numero_client: str
    id: str
    date_creation: datetime