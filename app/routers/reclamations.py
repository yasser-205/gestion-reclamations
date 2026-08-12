from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from app.models.reclamation import ReclamationCreation, ReclamationPublic, Canal, Motif, Priorite
from app.repositories import reclamation_repo, utilisateur_repo
from app.core.dependances import get_utilisateur_courant, exiger_role
from pydantic import BaseModel

router = APIRouter(prefix="/reclamation", tags=["reclamations"])

@router.post("",response_model=ReclamationPublic, status_code=201)
def creer(
    donnees : ReclamationCreation,
    utilisateur : dict = Depends(get_utilisateur_courant),
):
    auteur = f"{utilisateur['prenom']} {utilisateur['nom']}"
    return reclamation_repo.creer_reclamation(donnees.model_dump(), auteur)

@router.get("",response_model=list[ReclamationPublic])
def lister(client_id: Optional[str] = None, utilisateur: dict = Depends(get_utilisateur_courant)):
    if utilisateur["role"] == "client":
        return reclamation_repo.lister(client_id=utilisateur.get("client_id"))
    return reclamation_repo.lister(client_id=client_id)

@router.get("/stat")
def stats(utilisateur: dict = Depends(exiger_role("responsable", "admin"))):
    return reclamation_repo.statistique()

@router.get("/{id}", response_model=ReclamationPublic)
def consulter(id: str, utilisateur: dict = Depends(get_utilisateur_courant)):
    reclamation = reclamation_repo.get_par_id(id)
    if reclamation is None:
        raise HTTPException(status_code=404, detail="Réclamation introuvable")
    if utilisateur["role"] == "client" and reclamation["client_id"] != utilisateur.get("client_id"):
        raise HTTPException(status_code=404, detail="Réclamation introuvable")
    return reclamation

class ModificationReclamation(BaseModel):
    contrat: Optional[str] = None
    canal: Optional[Canal] = None
    motif: Optional[Motif] = None
    priorite: Optional[Priorite] = None
    description: Optional[str] = None
    attestation: Optional[str] = None
    matriculation: Optional[str] = None

@router.patch("/{id}", response_model=ReclamationPublic)
def modifier(
    id: str,
    donnees: ModificationReclamation,
    utilisateur: dict = Depends(exiger_role("gestionnaire", "responsable", "admin")),
):
    auteur = f"{utilisateur['prenom']} {utilisateur['nom']}"
    maj = {cle: valeur for cle, valeur in donnees.model_dump().items() if valeur is not None}
    reclamation = reclamation_repo.modifier(id, maj, auteur)
    if reclamation is None:
        raise HTTPException(status_code=404, detail="Réclamation introuvable")
    return reclamation

@router.delete("/{id}", status_code=204)
def supprimer(id: str, utilisateur: dict = Depends(get_utilisateur_courant)):
    if utilisateur["role"] == "client":
        raise HTTPException(status_code=403, detail="Acces refusé : role insuffisant")
    reclamation = reclamation_repo.get_par_id(id)
    if reclamation is None:
        raise HTTPException(status_code=404, detail="Réclamation introuvable")
    reclamation_repo.supprimer(id)


class ChangementStaut(BaseModel):
    statut: str

@router.patch("/{id}/statut",response_model=ReclamationPublic)
def changer_statut(
    id: str,
    donnees: ChangementStaut,
    utilisateur: dict = Depends(exiger_role("gestionnaire", "responsable", "admin")),
):
    auteur = f"{utilisateur['prenom']}{utilisateur['nom']}"
    reclamation = reclamation_repo.changer_statut(id, donnees.statut, auteur)
    if reclamation is None:
        raise HTTPException(status_code=404, detail="réclamation introuvable")
    return reclamation  

class Affectation(BaseModel):
    gestionnaire_id: str


@router.post("/{id}/affecter", response_model=ReclamationPublic)
def affecter(
    id: str,
    donnees: Affectation,
    utilisateur: dict = Depends(exiger_role("responsable", "admin")),
):
    gestionnaire = utilisateur_repo.get_par_id(donnees.gestionnaire_id)
    if gestionnaire is None:
        raise HTTPException(status_code=404, detail="Gestionnaire introuvable")
    if gestionnaire["role"] != "gestionnaire":
        raise HTTPException(status_code=400, detail="Cet utilisateur n'est pas un gestionnaire")

    gestionnaire_nom = f"{gestionnaire['prenom']} {gestionnaire['nom']}"
    auteur = f"{utilisateur['prenom']} {utilisateur['nom']}"

    reclamation = reclamation_repo.affecter_gestionnaire(
        id, donnees.gestionnaire_id, gestionnaire_nom, auteur
    )
    if reclamation is None:
        raise HTTPException(status_code=404, detail="Réclamation introuvable")
    return reclamation

class Reponse(BaseModel):
    reponse: str

@router.patch("/{id}/reponse", response_model=ReclamationPublic)
def repondre(
    id: str,
    donnees: Reponse,
    utilisateur: dict = Depends(exiger_role("gestionnaire","responsable","admin"))
):
    auteur = f"{utilisateur['prenom']} {utilisateur['nom']}"
    reclamation = reclamation_repo.repondre(id, donnees.reponse, auteur)
    if reclamation is None:
        raise HTTPException(status_code=404, detail="Réclamation introuvable")
    return reclamation
