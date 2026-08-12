from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional

class Role (str,Enum):
    agent = "agent"
    gestionnaire = "gestionnaire"
    responsable = "responsable"
    admin = "admin"
    client = "client"

class UtilisateurBase(BaseModel):
    login: str
    nom: str
    prenom: str
    role: Role
    actif: bool = True
    client_id: Optional[str] = None


class UtilisateurCreation(UtilisateurBase):
    mot_de_passe: str = Field(min_length=6)

class UtilisateurPublic(UtilisateurBase):
    id:str



