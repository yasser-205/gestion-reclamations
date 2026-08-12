from datetime import datetime, timedelta, timezone
import bcrypt
from jose import jwt, JWTError
from app.config import settings


def hacher_mot_de_passe(mot_de_passe: str) -> str:
    sel = bcrypt.gensalt()
    hache = bcrypt.hashpw(mot_de_passe.encode("utf-8"), sel)
    return hache.decode("utf-8")


def verifier_mot_de_passe(clair: str, hache: str) -> bool:
    return bcrypt.checkpw(clair.encode("utf-8"), hache.encode("utf-8"))


def creer_token(donnees: dict) -> str:
    a_encoder = donnees.copy()
    expiration = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    a_encoder.update({"exp": expiration})
    return jwt.encode(a_encoder, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decoder_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


