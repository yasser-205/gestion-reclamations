from pydantic import BaseModel, model_validator
from datetime import datetime
from enum import Enum
from typing import Optional

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

class ReclamationCreation(ReclamationBase):
    @model_validator(mode="after")
    def verifier_champ_production(self):
        if self.type_reclamation == TypeReclamation.production:
            if not self.attestation and not self.matriculation:
                raise ValueError(
                    "Pour une réclamation de production, attestation ou matriculation doit être renseigné."
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
