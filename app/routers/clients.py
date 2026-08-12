from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from app.models.client import ClientCreation, ClientPublic, Adresse
from app.repositories import client_repo
from app.core.dependances import get_utilisateur_courant, exiger_role

router = APIRouter(prefix="/clients", tags=["clients"])

@router.post("",response_model=ClientPublic, status_code=201)
def creer(
    donnees :ClientCreation,
    utilisateur : dict = Depends(get_utilisateur_courant)
):
    return client_repo.creer_client(donnees.model_dump())

@router.get("",response_model=list[ClientPublic])
def lister(utilisateur: dict = Depends(exiger_role("agent", "gestionnaire", "responsable", "admin"))):
    return client_repo.lister()


@router.get("/{id}", response_model=ClientPublic)
def consulter(id:str, utilisateur: dict = Depends(get_utilisateur_courant)):
    client = client_repo.get_par_id(id)
    if client is None:
        raise HTTPException(status_code=404, detail="Réclamation introuvable")
    return client

class ModificationClient(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[EmailStr] = None
    telephone: Optional[str] = None
    adresse: Optional[Adresse] = None

@router.patch("/{id}", response_model=ClientPublic)
def modifier(
    id: str,
    donnees: ModificationClient,
    utilisateur: dict = Depends(exiger_role("agent", "gestionnaire", "responsable", "admin")),
):
    client = client_repo.get_par_id(id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client introuvable")
    maj = {cle: valeur for cle, valeur in donnees.model_dump().items() if valeur is not None}
    return client_repo.modifier_client(id, maj)