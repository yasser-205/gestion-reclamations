import re

REGEX_TELEPHONE = re.compile(r"^0[5-7]\d{8}$")
REGEX_MOT_DE_PASSE = re.compile(r"^(?=.*[A-Z]).{8,}$")

MESSAGE_TELEPHONE = "Le téléphone doit contenir 10 chiffres et commencer par 05, 06 ou 07."
MESSAGE_MOT_DE_PASSE = "Le mot de passe doit contenir au moins 8 caractères dont une majuscule."

def valider_format_telephone(valeur: str) -> str:
    if valeur and not REGEX_TELEPHONE.match(valeur):
        raise ValueError(MESSAGE_TELEPHONE)
    return valeur

def valider_format_mot_de_passe(valeur: str) -> str:
    if not REGEX_MOT_DE_PASSE.match(valeur):
        raise ValueError(MESSAGE_MOT_DE_PASSE)
    return valeur
