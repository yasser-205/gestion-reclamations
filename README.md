# Gestion des réclamations

Application de gestion des réclamations clients (assurance) : suivi du cycle de vie
d'une réclamation (création, affectation, traitement, réponse, clôture), gestion des
clients et des employés, tableau de bord statistique.

Backend **FastAPI** + **MongoDB**, frontend **React** (Vite).

## Structure du projet

```
mon_projet/
├── app/                    Backend FastAPI
│   ├── main.py              Point d'entrée, montage des routers, CORS
│   ├── config.py            Lecture de la configuration (.env)
│   ├── database.py          Connexion MongoDB
│   ├── core/                 Sécurité (JWT, hachage), dépendances d'auth/rôles
│   ├── models/                Schémas Pydantic
│   ├── repositories/          Accès aux données (MongoDB)
│   └── routers/                Endpoints (auth, réclamations, clients, utilisateurs)
├── reclamations-front/      Frontend React (Vite)
│   └── src/
│       ├── pages/              Une page par écran (Login, Réclamations, Clients, ...)
│       ├── components/         Composants partagés (Sidebar, Spinner, ThemeToggle)
│       └── api.js               Client HTTP vers le backend
├── frontend/                Ancien prototype Streamlit (conservé, non maintenu)
├── creer_admin.py           Script : crée un compte admin de démarrage
└── venv/                    Environnement virtuel Python
```

## Rôles et permissions

| Rôle | Peut |
|---|---|
| `client` | Créer ses réclamations, consulter les siennes, lire les réponses |
| `agent` | Consulter/lister les réclamations et clients |
| `gestionnaire` | Consulter/lister les réclamations, changer le statut, répondre, modifier les détails d'une réclamation, voir le tableau de bord (pas d'accès aux clients) |
| `responsable` | + affecter un gestionnaire |
| `admin` | + créer/modifier les comptes employés, tout le reste |

## Prérequis

- Python 3.12+
- Node.js 18+
- Une instance MongoDB accessible (locale ou distante)

## Backend

```powershell
cd mon_projet
venv\Scripts\activate
pip install fastapi uvicorn[standard] pymongo pydantic pydantic-settings bcrypt python-jose email-validator python-multipart
```

Créer un fichier `.env` à la racine de `mon_projet` :

```
MONGO_URI=mongodb://localhost:27017
DB_NAME=reclamations
JWT_SECRET=change-moi
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Lancer le serveur :

```powershell
uvicorn app.main:app --reload
```

API disponible sur `http://127.0.0.1:8000` (docs interactives sur `/docs`).

### Comptes de démarrage

La base est vide au premier lancement. Pour créer un compte admin de test :

```powershell
python creer_admin.py          # login: admin / mot de passe: admin123
```

À changer ou supprimer avant toute mise en production. Les autres comptes clients
se créent depuis l'écran d'inscription du front, les comptes employés depuis la
page "Employés" (admin uniquement).

## Frontend

```powershell
cd reclamations-front
npm install
npm run dev
```

Servi sur `http://localhost:5173`. L'URL de l'API est fixée dans
[`src/api.js`](reclamations-front/src/api.js) (`http://127.0.0.1:8000`) — à adapter
si le backend tourne ailleurs.

Autres scripts npm : `npm run build` (production), `npm run lint`, `npm run preview`.

## Fonctionnalités principales

- Authentification par token JWT, inscription client en libre-service
- Réclamations : création, filtres (statut/motif/dates/recherche), tri par échéance,
  pagination, export CSV, modification, changement de statut, affectation à un
  gestionnaire, réponse au client, alertes d'échéance à venir/dépassée
- Clients : liste, fiche modifiable, historique de leurs réclamations
- Employés : création et modification des comptes du personnel (admin)
- Tableau de bord : indicateurs clés (total, délai moyen, taux dans les délais) et
  graphiques (répartition par statut/motif/gestionnaire, évolution mensuelle)
- Mode sombre, notifications (toasts) pour les actions
