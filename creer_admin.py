from app.repositories import utilisateur_repo
from app.core.security import hacher_mot_de_passe

admin = {
    "login": "admin",
    "mot_de_passe": hacher_mot_de_passe("admin123"),
    "nom": "principale",
    "prenom": "Admin",
    "role": "admin",
    "actif": True,
}

resultat = utilisateur_repo.creer_utilisateur(admin)
print("Admin créé :", resultat)
