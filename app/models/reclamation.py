from pydantic import BaseModel, model_validator, field_validator
from datetime import datetime
from enum import Enum
from typing import Optional
import re

REGEX_NUMERO_SINISTRE = re.compile(r"^SIN-\d{4}-\d{6}$")
REGEX_ATTESTATION = re.compile(r"^(CF|C) \d{4} / \d{6}$")
REGEX_MATRICULATION = re.compile(r"^\d{1,6}-(?:[A-Z]|WW|RT)-\d{1,2}$")

class Canal(str,Enum):
    telephone = "telephone"
    email = "email"
    courrier = "courrier"
    agence = "agence"

class Motif(str,Enum):
    remboursement = "remboursement"
    delai = "delai"
    prime = "prime"
    contrat = "contrat"
    service = "service"
    autre = "autre"

class TypeReclamation(str, Enum):
    sinistre = "sinistre"
    production = "production"

class Priorite(str,Enum):
    basse = "basse"
    moyenne = "moyenne"
    haute = "haute"
    urgente = "urgente"

class Statut(str,Enum):
    nouvelle = "nouvelle"
    affectee = "affectee"
    en_cours = "en_cours"
    en_attente_client = "en_attente_client"
    resolue = "resolue"
    cloturee = "cloturee"
    rejetee= "rejetee"

class ActionHistorique(BaseModel):
    date : datetime
    auteur: str    
    action: str

class ReclamationBase(BaseModel):
    type_reclamation: TypeReclamation = TypeReclamation.production
    client_id :str
    contrat: Optional[str] = None
    canal : Canal
    motif : Motif
    description : str
    priorite: Priorite = Priorite.moyenne
    attestation: Optional[str] = None
    matriculation: Optional[str] = None
    numero_sinistre: Optional[str] = None

class ReclamationCreation(ReclamationBase):
    @field_validator("numero_sinistre")
    @classmethod
    def verifier_format_numero_sinistre(cls, valeur):
        if valeur is not None and not REGEX_NUMERO_SINISTRE.match(valeur):
            raise ValueError(
                "Le numéro de sinistre doit respecter le format SIN-AAAA-000000 (ex: SIN-2026-000123)."
            )
        return valeur

    @field_validator("attestation")
    @classmethod
    def verifier_format_attestation(cls, valeur):
        if valeur is not None and not REGEX_ATTESTATION.match(valeur):
            raise ValueError(
                "L'attestation doit respecter le format CF 1234 / 123456 ou C 1234 / 123456."
            )
        return valeur

    @field_validator("matriculation")
    @classmethod
    def verifier_format_matriculation(cls, valeur):
        if valeur is not None and not REGEX_MATRICULATION.match(valeur):
            raise ValueError(
                "La matriculation doit respecter le format 12345-A-6, 12345-WW-1 ou 12345-RT-1."
            )
        return valeur

    @model_validator(mode="after")
    def verifier_champ_production(self):
        if self.type_reclamation == TypeReclamation.production:
            if not self.attestation and not self.matriculation:
                raise ValueError(
                    "Pour une réclamation de production, attestation ou matriculation doit être renseigné."
                )
        return self

    @model_validator(mode="after")
    def verifier_champ_sinistre(self):
        if self.type_reclamation == TypeReclamation.sinistre and not self.numero_sinistre:
            raise ValueError(
                "Pour une réclamation de sinistre, le numéro de sinistre est obligatoire."
            )
        return self
   

class ReclamationPublic(ReclamationBase):
    id: str
    numero_reclamation: str
    statut: Statut
    gestionnaire_id : Optional[str] = None
    date_reception: datetime
    date_echeance: Optional[datetime] = None
    date_cloture: Optional[datetime] = None
    reponse: Optional[str] = None
    historique: list[ActionHistorique]= []
    pieces_jointes: list[dict] = [] 
