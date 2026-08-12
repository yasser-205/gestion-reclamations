from typing import Optional
from pydantic import BaseModel
from app.models.utilisateur import Role
from app.core.security import hacher_mot_de_passe
from app.core.dependances import exiger_role
from fastapi import APIRouter, Depends, HTTPException
from app.models.utilisateur import UtilisateurPublic
from app.repositories import utilisateur_repo
from app.core.dependances import get_utilisateur_courant


router = APIRouter(prefix="/utilisateurs", tags=["utilisateurs"])


@router.get("", response_model=list[UtilisateurPublic])
def lister(utilisateur: dict = Depends(get_utilisateur_courant)):
    return utilisateur_repo.lister()

class CreationEploye(BaseModel):
    login:str
    mot_de_passe:str
    nom:str
    prenom:str
    role: Role

@router.post("",response_model=UtilisateurPublic, status_code=201)
def creer(
    donnees: CreationEploye,
    admin: dict = Depends(exiger_role("admin")),
):
    if utilisateur_repo.get_par_login(donnees.login):
        raise HTTPException(status_code=400, detail="Ce login est déja pris")

    if donnees.role == Role.client:
        raise HTTPException(status_code=400, detail="utilisez l'inscription pour un client")

    return utilisateur_repo.creer_utilisateur({
        "login": donnees.login,
        "mot_de_passe": hacher_mot_de_passe(donnees.mot_de_passe),
        "nom": donnees.nom,
        "prenom": donnees.prenom,
        "role": donnees.role.value,
        "actif": True,
    })

class ModificationUtilisateur(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    role: Optional[Role] = None
    actif: Optional[bool] = None
    mot_de_passe: Optional[str] = None

@router.patch("/{id}", response_model=UtilisateurPublic)
def modifier(
    id: str,
    donnees: ModificationUtilisateur,
    admin: dict = Depends(exiger_role("admin")),
):
    utilisateur = utilisateur_repo.get_par_id(id)
    if utilisateur is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if utilisateur["role"] == "client":
        raise HTTPException(status_code=400, detail="Utilisez la gestion des clients pour ce compte")
    if donnees.role == Role.client:
        raise HTTPException(status_code=400, detail="Impossible d'attribuer le rôle client")

    maj = {}
    if donnees.nom is not None:
        maj["nom"] = donnees.nom
    if donnees.prenom is not None:
        maj["prenom"] = donnees.prenom
    if donnees.role is not None:
        maj["role"] = donnees.role.value
    if donnees.actif is not None:
        maj["actif"] = donnees.actif
    if donnees.mot_de_passe:
        maj["mot_de_passe"] = hacher_mot_de_passe(donnees.mot_de_passe)

    return utilisateur_repo.modifier_utilisateur(id, maj)