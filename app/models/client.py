from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime, date
from typing import Optional
from app.core.validation import valider_format_telephone

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
    email_verifie: bool = False

    @field_validator("telephone")
    @classmethod
    def verifier_telephone(cls, valeur):
        return valider_format_telephone(valeur)

class ClientCreation(ClientBase):
    pass

class ClientPublic(ClientBase):
    numero_client: str
    id: str
    date_creation: datetime