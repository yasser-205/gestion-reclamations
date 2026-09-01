import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException,Depends
from pydantic import BaseModel,EmailStr, field_validator
from app.repositories import utilisateur_repo
from app.core.security import verifier_mot_de_passe, creer_token
from app.repositories import client_repo
from app.core.security import hacher_mot_de_passe
from app.core.validation import valider_format_telephone, valider_format_mot_de_passe
from app.core.dependances import get_utilisateur_courant
from app.core.email import envoyer_email_verification

DUREE_VALIDITE_CODE = timedelta(minutes=15)

router = APIRouter(prefix="/auth", tags= ["auth"])

class LoginRequete(BaseModel):
    login : str
    mot_de_passe : str

class tokenReponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class inscription_requete(BaseModel):
    login: str
    mot_de_passe:str
    nom:str
    prenom:str
    email: EmailStr
    telephone: str

    @field_validator("mot_de_passe")
    @classmethod
    def verifier_mot_de_passe(cls, valeur):
        return valider_format_mot_de_passe(valeur)

    @field_validator("telephone")
    @classmethod
    def verifier_telephone(cls, valeur):
        return valider_format_telephone(valeur)

@router.post("/login", response_model=tokenReponse)
def login(donnes:LoginRequete):
    utilisateur = utilisateur_repo.get_par_login(donnes.login)

    if not utilisateur or not verifier_mot_de_passe(donnes.mot_de_passe, utilisateur["mot_de_passe"]):
        raise HTTPException (status_code=401, detail= "login du mot de passse incorrect")
    if not utilisateur.get("actif", True): 
        raise HTTPException (status_code=402, detail="compte désactivé")
    token = creer_token({"sub": utilisateur["id"],"role": utilisateur["role"]})
    return{"access_token": token}

class InscriptionEnAttenteReponse(BaseModel):
    message: str
    email: str

class ConfirmationInscription(BaseModel):
    email: EmailStr
    code: str

@router.post("/register", response_model=InscriptionEnAttenteReponse, status_code=201)
def register(donnees: inscription_requete):
    if utilisateur_repo.get_par_login(donnees.login):
        raise HTTPException(status_code=400, detail="Ce login est déja pris")

    code_verification = f"{secrets.randbelow(1_000_000):06d}"
    expiration = datetime.now(timezone.utc).replace(tzinfo=None) + DUREE_VALIDITE_CODE

    fiche = client_repo.creer_client({
        "nom": donnees.nom,
        "prenom": donnees.prenom,
        "email": donnees.email,
        "telephone": donnees.telephone,
        "contrats": [],
        "code_verification": code_verification,
        "code_expiration": expiration,
    })

    utilisateur_repo.creer_utilisateur({
        "login": donnees.login,
        "mot_de_passe": hacher_mot_de_passe(donnees.mot_de_passe),
        "nom": donnees.nom,
        "prenom": donnees.prenom,
        "role": "client",
        "actif": False,
        "client_id": fiche["id"],
    })

    envoyer_email_verification(donnees.email, code_verification)

    return {
        "message": "Un code de vérification a été envoyé à votre adresse email.",
        "email": donnees.email,
    }

@router.post("/confirmer-inscription", response_model=tokenReponse)
def confirmer_inscription(donnees: ConfirmationInscription):
    client = client_repo.verifier_code(donnees.email, donnees.code)
    if client is None:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré.")

    compte = utilisateur_repo.get_par_client_id(client["id"])
    if compte is None:
        raise HTTPException(status_code=404, detail="Compte introuvable.")

    utilisateur_repo.modifier_utilisateur(compte["id"], {"actif": True})

    token = creer_token({"sub": compte["id"], "role": "client", "client_id": client["id"]})
    return {"access_token": token}

@router.get("/me")
def me(utilisateur: dict = Depends(get_utilisateur_courant)):
    return {
        "id": utilisateur["id"],
        "role": utilisateur["role"],
        "client_id": utilisateur.get("client_id"),
        "nom": utilisateur["nom"],
        "prenom": utilisateur["prenom"],
    }

class ChangementMotDePasse(BaseModel):
    mot_de_passe_actuel: str
    nouveau_mot_de_passe: str

    @field_validator("nouveau_mot_de_passe")
    @classmethod
    def verifier_mot_de_passe(cls, valeur):
        return valider_format_mot_de_passe(valeur)

@router.post("/mot-de-passe")
def changer_mon_mot_de_passe(
    donnees: ChangementMotDePasse,
    utilisateur: dict = Depends(get_utilisateur_courant),
):
    if not verifier_mot_de_passe(donnees.mot_de_passe_actuel, utilisateur["mot_de_passe"]):
        raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")
    utilisateur_repo.changer_mot_de_passe(
        utilisateur["id"], hacher_mot_de_passe(donnees.nouveau_mot_de_passe)
    )
    return {"message": "Mot de passe modifié"}


