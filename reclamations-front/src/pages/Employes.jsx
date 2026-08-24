import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiRequest, messageErreur } from "../api";
import Spinner from "../components/Spinner";

const REGEX_MOT_DE_PASSE = /^(?=.*[A-Z]).{8,}$/;
const MESSAGE_MOT_DE_PASSE = "Le mot de passe doit contenir au moins 8 caractères dont une majuscule.";

const ROLES = [
  { valeur: "agent", label: "Agent" },
  { valeur: "gestionnaire", label: "Gestionnaire" },
  { valeur: "responsable", label: "Responsable" },
  { valeur: "admin", label: "Admin" },
];

function Employes({ token }) {
  const [utilisateurs, setUtilisateurs] = useState(null);
  const [erreur, setErreur] = useState("");
  const [recharge, setRecharge] = useState(0);
  const [selectionId, setSelectionId] = useState("");
  const [creationOuverte, setCreationOuverte] = useState(false);

  const [login, setLogin] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [role, setRole] = useState(ROLES[0].valeur);
  const [erreurForm, setErreurForm] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    let ignore = false;
    apiRequest("/utilisateurs", { token }).then((rep) => {
      if (ignore) return;
      if (rep.ok) {
        setErreur("");
        setUtilisateurs(rep.data.filter((u) => u.role !== "client"));
      } else {
        setErreur(messageErreur(rep.status));
      }
    });
    return () => { ignore = true; };
  }, [token, recharge]);

  const employe = utilisateurs?.find((u) => u.id === selectionId) || null;

  function ouvrirDetail(u) {
    setSelectionId(u.id);
  }

  function retourListe() {
    setSelectionId("");
  }

  async function creer(e) {
    e.preventDefault();
    setErreurForm("");

    if (!login || !motDePasse || !nom || !prenom) {
      setErreurForm("Tous les champs sont obligatoires.");
      return;
    }
    if (!REGEX_MOT_DE_PASSE.test(motDePasse)) {
      setErreurForm(MESSAGE_MOT_DE_PASSE);
      return;
    }

    setEnvoiEnCours(true);
    const rep = await apiRequest("/utilisateurs", {
      method: "POST",
      token,
      body: { login, mot_de_passe: motDePasse, nom, prenom, role },
    });
    setEnvoiEnCours(false);

    if (rep.ok) {
      toast.success(`Employé ${rep.data.prenom} ${rep.data.nom} créé.`);
      setLogin("");
      setMotDePasse("");
      setNom("");
      setPrenom("");
      setRole(ROLES[0].valeur);
      setCreationOuverte(false);
      setRecharge((n) => n + 1);
    } else if (rep.status === 400) {
      setErreurForm(rep.data?.detail || "Requête invalide.");
    } else {
      setErreurForm(messageErreur(rep.status));
    }
  }

  if (employe) {
    return <DetailEmploye token={token} employe={employe} onRetour={retourListe} onModifie={() => setRecharge((n) => n + 1)} />;
  }

  if (creationOuverte) {
    return (
      <div className="page page-formulaire">
        <div className="entete-page">
          <button type="button" className="btn-secondaire" onClick={() => setCreationOuverte(false)}>
            ← Retour à la liste
          </button>
        </div>

        <form className="carte formulaire-pro" onSubmit={creer}>
          <div className="groupe-champs">
            <h3>Nouvel employé</h3>
            <div className="champs-grille">
              <label>
                Login
                <input value={login} onChange={(e) => setLogin(e.target.value)} />
              </label>
              <label>
                Mot de passe
                <input
                  type="password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  pattern={REGEX_MOT_DE_PASSE.source}
                  title={MESSAGE_MOT_DE_PASSE}
                />
              </label>
              <label>
                Nom
                <input value={nom} onChange={(e) => setNom(e.target.value)} />
              </label>
              <label>
                Prénom
                <input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
              </label>
              <label>
                Rôle
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r.valeur} value={r.valeur}>{r.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {erreurForm && <p className="erreur">{erreurForm}</p>}

          <div className="pied-formulaire">
            <button type="submit" className="btn-primaire" disabled={envoiEnCours}>
              {envoiEnCours && <Spinner taille={14} />}
              {envoiEnCours ? "Création…" : "Créer l'employé"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="entete-page entete-page-action">
        <div>
          <h1>Employés</h1>
          <p className="sous-titre">Consulter et gérer les comptes du personnel.</p>
        </div>
        <button type="button" className="btn-primaire" onClick={() => setCreationOuverte(true)}>
          + Nouvel employé
        </button>
      </div>

      {erreur && <p className="erreur">{erreur}</p>}
      {!utilisateurs && !erreur && <p className="chargement-page"><Spinner /> Chargement…</p>}
      {utilisateurs && utilisateurs.length === 0 && (
        <p className="info">Aucun employé pour le moment.</p>
      )}
      {utilisateurs && utilisateurs.length > 0 && (
        <table className="tableau">
          <thead>
            <tr>
              <th>Login</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Rôle</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map((u) => (
              <tr key={u.id} className="ligne-cliquable" onClick={() => ouvrirDetail(u)}>
                <td>{u.login}</td>
                <td>{u.nom}</td>
                <td>{u.prenom}</td>
                <td>{u.role}</td>
                <td>{u.actif ? "Actif" : "Désactivé"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DetailEmploye({ token, employe, onRetour, onModifie }) {
  const [nom, setNom] = useState(employe.nom);
  const [prenom, setPrenom] = useState(employe.prenom);
  const [role, setRole] = useState(employe.role);
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [enCoursActivation, setEnCoursActivation] = useState(false);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur("");

    if (nouveauMotDePasse && !REGEX_MOT_DE_PASSE.test(nouveauMotDePasse)) {
      setErreur(MESSAGE_MOT_DE_PASSE);
      return;
    }

    const corps = { nom, prenom, role };
    if (nouveauMotDePasse) corps.mot_de_passe = nouveauMotDePasse;

    setEnvoiEnCours(true);
    const rep = await apiRequest(`/utilisateurs/${employe.id}`, { method: "PATCH", token, body: corps });
    setEnvoiEnCours(false);

    if (rep.ok) {
      toast.success("Modifications enregistrées.");
      setNouveauMotDePasse("");
      onModifie();
    } else if (rep.status === 400) {
      setErreur(rep.data?.detail || "Requête invalide.");
    } else {
      setErreur(messageErreur(rep.status));
    }
  }

  async function basculerActif() {
    const action = employe.actif ? "désactiver" : "réactiver";
    if (!window.confirm(`Voulez-vous ${action} le compte de ${employe.prenom} ${employe.nom} ?`)) {
      return;
    }
    setEnCoursActivation(true);
    const rep = await apiRequest(`/utilisateurs/${employe.id}`, {
      method: "PATCH",
      token,
      body: { actif: !employe.actif },
    });
    setEnCoursActivation(false);
    if (rep.ok) {
      toast.success(employe.actif ? "Compte désactivé." : "Compte réactivé.");
      onModifie();
    } else {
      toast.error(messageErreur(rep.status));
    }
  }

  return (
    <div className="page page-formulaire">
      <div className="entete-page">
        <button type="button" className="btn-secondaire" onClick={onRetour}>← Retour à la liste</button>
        <button
          type="button"
          className={employe.actif ? "btn-danger" : "btn-primaire"}
          onClick={basculerActif}
          disabled={enCoursActivation}
        >
          {enCoursActivation && <Spinner taille={14} />}
          {employe.actif ? "Désactiver le compte" : "Réactiver le compte"}
        </button>
      </div>

      <form className="carte formulaire-pro" onSubmit={enregistrer}>
        <div className="groupe-champs">
          <h3>{employe.login}</h3>
          <div className="champs-grille">
            <label>
              Nom
              <input value={nom} onChange={(e) => setNom(e.target.value)} />
            </label>
            <label>
              Prénom
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            </label>
            <label>
              Rôle
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r.valeur} value={r.valeur}>{r.label}</option>
                ))}
              </select>
            </label>
            <label>
              Statut actuel
              <input value={employe.actif ? "Actif" : "Désactivé"} disabled />
            </label>
            <label className="champ-pleine-largeur">
              Nouveau mot de passe (optionnel)
              <input
                type="password"
                placeholder="Laisser vide pour ne pas changer"
                value={nouveauMotDePasse}
                onChange={(e) => setNouveauMotDePasse(e.target.value)}
                pattern={REGEX_MOT_DE_PASSE.source}
                title={MESSAGE_MOT_DE_PASSE}
              />
            </label>
          </div>
        </div>

        {erreur && <p className="erreur">{erreur}</p>}

        <div className="pied-formulaire">
          <button type="submit" className="btn-primaire" disabled={envoiEnCours}>
            {envoiEnCours && <Spinner taille={14} />}
            {envoiEnCours ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Employes;
