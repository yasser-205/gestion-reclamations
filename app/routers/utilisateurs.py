from typing import Optional
from pydantic import BaseModel, field_validator
from app.models.utilisateur import Role
from app.core.security import hacher_mot_de_passe
from app.core.validation import valider_format_mot_de_passe
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

    @field_validator("mot_de_passe")
    @classmethod
    def verifier_mot_de_passe(cls, valeur):
        return valider_format_mot_de_passe(valeur)

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

    @field_validator("mot_de_passe")
    @classmethod
    def verifier_mot_de_passe(cls, valeur):
        if valeur is None:
            return valeur
        return valider_format_mot_de_passe(valeur)

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

class resetMDpClient(BaseModel):
    client_id: str
    nouveau_mot_de_passe: str

    @field_validator("nouveau_mot_de_passe")
    @classmethod
    def verifier_mot_de_passe(cls, valeur):
        return valider_format_mot_de_passe(valeur)

@router.post("/reset-client")
def reset_mdp_client(
    donnees: resetMDpClient,
    utilisateur: dict = Depends(exiger_role("agent", "responsable", "admin"))
):
    compte = utilisateur_repo.get_par_client_id(donnees.client_id)
    if compte is None:
        raise HTTPException(status_code=404, detail="Aucun compte client lié a cette fiche")

    utilisateur_repo.changer_mot_de_passe(
        compte["id"], hacher_mot_de_passe(donnees.nouveau_mot_de_passe)
    )
    return {"message": "Mot de passe réinitialisé"}