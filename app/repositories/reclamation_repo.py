from bson import ObjectId
from datetime import datetime, timezone, timedelta
from app.database import db

collection = db["reclamation"]

DELAI_TRAITEMENT_JOURS = 15

def _serialiser(doc: dict) ->dict:
    doc["id"]  = str(doc.pop("_id"))
    return doc

def _generer_numero() ->str:
    annee = datetime.now(timezone.utc).year
    prefixe = f"REC-{annee}-"
    dernier = collection.find_one(
        {"numero_reclamation": {"$regex": f"^{prefixe}"}},
        sort=[("numero_reclamation", -1)],
    )
    dernier_compte = int(dernier["numero_reclamation"].split("-")[-1]) if dernier else 0
    return f"{prefixe}{dernier_compte + 1:05d}"

def creer_reclamation(donnees: dict, auteur:str) -> dict:
    maintenant = datetime.now(timezone.utc)

    donnees["numero_reclamation"] = _generer_numero()
    donnees["statut"] = "nouvelle"
    donnees["gestionnaire_id"] = None
    donnees["date_reception"] = maintenant
    donnees["date_echeance"] = maintenant + timedelta(days=DELAI_TRAITEMENT_JOURS)
    donnees["date_cloture"] = None
    donnees["reponse"] = None
    donnees["historique"] = [
        {"date": maintenant, "auteur": auteur, "action":"Réclamation créée"}
    ]

    resultat = collection.insert_one(donnees) #Insère le document en base ; resultat contient l'id généré par Mongo.
    doc = collection.find_one({"_id": resultat.inserted_id}) #Relit ce document en base via son id (resultat.inserted_id) pour récupérer sa version complète telle que stockée.
    return _serialiser(doc)

def lister(client_id: str | None = None) -> list[dict]:
    filtre = {"client_id": client_id} if client_id else {}
    return[_serialiser(doc) for doc in collection.find(filtre).sort("date_reception",-1)]

def get_par_id(id:str) -> dict |None:
    doc = collection.find_one({"_id": ObjectId(id)})
    return _serialiser(doc) if doc else None

def get_par_piece_jointe(file_id: str) -> dict | None:
    doc = collection.find_one({"pieces_jointes.file_id": file_id})
    return _serialiser(doc) if doc else None

STATUTS_CLOTURE = {"resolue", "cloturee", "rejetee"}

def changer_statut(id:str, nouveau_statut:str, auteur:str) -> dict |None:
    reclamation = collection.find_one({"_id":ObjectId(id)})
    if reclamation is None:
        return None
    maintenant = datetime.now(timezone.utc)
    ancien_statut = reclamation["statut"]

    maj = {
        "statut" : nouveau_statut,
        "historique": reclamation["historique"] + [
            {
                "date" : maintenant,
                "auteur":auteur,
                "action": f"Statut changé de '{ancien_statut}' à '{nouveau_statut}'",
            }
        ],
    }
    if nouveau_statut in STATUTS_CLOTURE:
        maj["date_cloture"] = maintenant

    collection.update_one({"_id": ObjectId(id)}, {"$set": maj})
    return _serialiser(collection.find_one({"_id": ObjectId(id)}))

def modifier(id: str, maj: dict, auteur: str) -> dict | None:
    reclamation = collection.find_one({"_id": ObjectId(id)})
    if reclamation is None:
        return None
    if not maj:
        return _serialiser(reclamation)

    maintenant = datetime.now(timezone.utc)
    maj["historique"] = reclamation["historique"] + [
        {
            "date": maintenant,
            "auteur": auteur,
            "action": "Détails modifiés",
        }
    ]

    collection.update_one({"_id": ObjectId(id)}, {"$set": maj})
    return _serialiser(collection.find_one({"_id": ObjectId(id)}))

def supprimer(id: str) -> bool:
    resultat = collection.delete_one({"_id": ObjectId(id)})
    return resultat.deleted_count > 0

def affecter_gestionnaire(id:str, gestionnaire_id:str, gestionnaire_nom:str, auteur:str) -> dict | None:
    reclamation = collection.find_one({"_id": ObjectId(id)})
    if reclamation is None:
        return None

    maintenant = datetime.now(timezone.utc)

    maj = {
        "gestionnaire_id": gestionnaire_id,
        "historique": reclamation["historique"] + [
            {
                "date": maintenant,
                "auteur": auteur,
                "action": f"Affectée au gestionnaire {gestionnaire_nom}",
            }
        ],
    }

    if reclamation["statut"] == "nouvelle":
        maj["statut"] = "affectee"

    collection.update_one({"_id": ObjectId(id)}, {"$set": maj})
    return _serialiser(collection.find_one({"_id": ObjectId(id)}))

def statistique() -> dict:
    reclamations = list(collection.find())

    par_statut = {}
    par_motif = {}
    par_gestionnaire = {}

    for r in reclamations:
        statut = r.get("statut","inconnu")
        par_statut[statut] = par_statut.get(statut, 0) + 1

        motif = r.get("motif","inconnu")
        par_motif[motif] = par_motif.get(motif, 0) +1

        gest = r.get("gestionnaire_id")
        if gest:
            par_gestionnaire[gest] = par_gestionnaire.get(gest, 0) + 1

# Délai moyen de traitement (en jours) sur les réclamations closes
    durees = []
    for r in reclamations:
        if r.get("date_cloture") and r.get("date_reception"):
            duree = (r["date_cloture"] - r["date_reception"]).days
            durees.append(duree)
    delai_moyen = round(sum(durees) / len(durees), 1) if durees else 0

# Taux résolu dans les délais
    closes = [r for r in reclamations if r.get("date_cloture")]
    dans_delais = [
        r for r in closes
        if r.get("date_echeance") and r["date_cloture"] <= r["date_echeance"]
    ]
    taux_dans_delais = round(len(dans_delais)/len(closes) * 100, 1) if closes else 0

# Évolution par mois de réception
    par_mois = {}
    for r in reclamations:
        if r.get("date_reception"):
            mois = r["date_reception"].strftime("%Y-%m")
            par_mois[mois] = par_mois.get(mois, 0) + 1
    
    return {
        "total": len(reclamations),
        "par_statut": par_statut,
        "par_motif": par_motif,
        "par_gestionnaire": par_gestionnaire,
        "delai_moyen": delai_moyen,
        "taux_dans_delais": taux_dans_delais,
        "par_mois": par_mois,
    }

def ajoute_piece_jointe(id: str, piece: dict, auteur: str) -> dict | None:
    reclamation = collection.find_one({"_id": ObjectId(id)})
    if reclamation is None:
        return None

    maintenant = datetime.now(timezone.utc)

    maj = {
        "pieces_jointes": reclamation.get("pieces_jointes", []) + [piece],
        "historique": reclamation["historique"] + [
            {
                "date": maintenant,
                "auteur": auteur,
                "action": f"Pièce jointe ajoutée : {piece['nom']}",
            }
        ],
    }

    collection.update_one({"_id": ObjectId(id)}, {"$set": maj})
    return _serialiser(collection.find_one({"_id": ObjectId(id)}))

def repondre(id:str, reponse:str, auteur:str) -> dict | None:
    reclamation = collection.find_one({"_id": ObjectId(id)})
    if reclamation is None:
        return None

    maintenant = datetime.now(timezone.utc)

    maj = {
        "reponse": reponse,
        "historique":reclamation["historique"] + [
            {
                "date": maintenant,
                "auteur": auteur,
                "action": "Réponse apportée",
            }
        ]
    }

    collection.update_one({"_id": ObjectId(id)}, {"$set" : maj})
    return _serialiser(collection.find_one({"_id" : ObjectId(id)}))
