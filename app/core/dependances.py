from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decoder_token
from app.repositories import utilisateur_repo

schema = HTTPBearer()

def get_utilisateur_courant(
        credentials: HTTPAuthorizationCredentials = Depends(schema),
) -> dict:
    token = credentials.credentials
    donnees = decoder_token(token)

    if donnees is None: 
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")

    utilisateur = utilisateur_repo.get_par_id(donnees["sub"])
    if utilisateur is None:
        raise HTTPException(status_code=401, detail="utilisateur introuvable")
    return utilisateur  

def exiger_role(*role_autorises: str):
    def verificateur(utilisateur: dict = Depends(get_utilisateur_courant)) -> dict:
        if utilisateur["role"] not in role_autorises : 
            raise HTTPException(status_code=403, detail="Acces refusé : role insuffisant")
        return utilisateur
    return verificateur
