from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.database import ping
from app.routers import auth
from app.routers import reclamations,clients,utilisateurs
from app.database import db
from contextlib import asynccontextmanager 

@asynccontextmanager
async def lifespan(app):
    db["reclamation"].create_index("statut")
    db["reclamation"].create_index("client_id")
    db["reclamation"].create_index("numero_reclamation", unique=True)
    db["client"].create_index("numero_client", unique=True)
    db["utilisateur"].create_index("login", unique=True)
    yield

app = FastAPI(title="Gestion des réclamations", lifespan= lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(reclamations.router)
app.include_router(clients.router)
app.include_router(utilisateurs.router)

@app.get("/")
def racine():
    return{"message": "API réclamations en ligne"}

@app.get("/health")
def health():
    try :
        ping()
        return{"status":"ok", "mongo" : "connecté"}
    except Exception as e :
        raise HTTPException(status_code=503, detail=f"mongo injoignable : {e}")

