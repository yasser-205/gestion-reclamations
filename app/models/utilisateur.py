from pydantic import BaseModel, Field, field_validator
from enum import Enum
from typing import Optional
from app.core.validation import valider_format_mot_de_passe

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
    mot_de_passe: str = Field(min_length=8)

    @field_validator("mot_de_passe")
    @classmethod
    def verifier_mot_de_passe(cls, valeur):
        return valider_format_mot_de_passe(valeur)

class UtilisateurPublic(UtilisateurBase):
    id:str



