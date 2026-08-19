from fastapi import APIRouter, HTTPException,Depends
from pydantic import BaseModel,EmailStr, field_validator
from app.repositories import utilisateur_repo
from app.core.security import verifier_mot_de_passe, creer_token
from app.repositories import client_repo
from app.core.security import hacher_mot_de_passe
from app.core.validation import valider_format_telephone, valider_format_mot_de_passe
from app.core.dependances import get_utilisateur_courant

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

@router.post("/register",response_model=tokenReponse, status_code=201)
def register(donnees: inscription_requete):
    if utilisateur_repo.get_par_login(donnees.login):
        raise HTTPException(status_code=400, detail="Ce login est déja pris")

    fiche = client_repo.creer_client({
        "nom": donnees.nom,
        "prenom": donnees.prenom,
        "email": donnees.email,
        "telephone": donnees.telephone,
        "contrats": [],
    })

    compte = utilisateur_repo.creer_utilisateur({
        "login": donnees.login,
        "mot_de_passe": hacher_mot_de_passe(donnees.mot_de_passe),
        "nom": donnees.nom,
        "prenom": donnees.prenom,
        "role": "client",
        "actif": True,
        "client_id": fiche["id"],
    })

    token = creer_token({"sub": compte["id"], "role": "client", "client_id": fiche["id"]})
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


