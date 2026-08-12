from app.repositories import utilisateur_repo
from app.core.security import hacher_mot_de_passe

gestionnaire = {
    "login": "gest1",
    "mot_de_passe": hacher_mot_de_passe("gest123"),
    "nom": "Martin",
    "prenom": "Luc",
    "role": "gestionnaire",
    "actif": True,
}

resultat = utilisateur_repo.creer_utilisateur(gestionnaire)
print("Gestionnaire créé :", resultat["id"], resultat["role"])