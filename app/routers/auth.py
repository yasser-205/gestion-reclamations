from fastapi import APIRouter, HTTPException,Depends
from pydantic import BaseModel,EmailStr
from app.repositories import utilisateur_repo
from app.core.security import verifier_mot_de_passe, creer_token
from app.repositories import client_repo
from app.core.security import hacher_mot_de_passe
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
    return {"role": utilisateur["role"], "client_id": utilisateur.get("client_id")}


