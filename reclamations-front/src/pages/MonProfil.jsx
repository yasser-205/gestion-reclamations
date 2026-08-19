import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiRequest, messageErreur } from "../api";
import Spinner from "../components/Spinner";

const REGEX_TELEPHONE = /^0[5-7]\d{8}$/;
const MESSAGE_TELEPHONE = "Le téléphone doit contenir 10 chiffres et commencer par 05, 06 ou 07.";
const REGEX_MOT_DE_PASSE = /^(?=.*[A-Z]).{8,}$/;
const MESSAGE_MOT_DE_PASSE = "Le mot de passe doit contenir au moins 8 caractères dont une majuscule.";

const LABELS_ROLE = {
  agent: "Agent",
  gestionnaire: "Gestionnaire",
  responsable: "Responsable",
  admin: "Admin",
};

function MonProfil({ token, moi, onRetour }) {
  const estClient = moi?.role === "client";
  const [client, setClient] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!estClient || !moi?.client_id) return;
    let ignore = false;
    apiRequest(`/clients/${moi.client_id}`, { token }).then((rep) => {
      if (ignore) return;
      if (rep.ok) setClient(rep.data);
      else setErreur(messageErreur(rep.status));
    });
    return () => { ignore = true; };
  }, [estClient, moi?.client_id, token]);

  return (
    <div className="page page-formulaire">
      <div className="entete-page">
        <button type="button" className="btn-secondaire" onClick={onRetour}>← Retour</button>
        <h1>Mon profil</h1>
      </div>

      {erreur && <p className="erreur">{erreur}</p>}

      {estClient ? (
        <>
          {!client && !erreur && <p className="chargement-page"><Spinner /> Chargement…</p>}
          {client && (
            <>
              <FormulaireInfos client={client} token={token} onEnregistre={setClient} />
              <FormulaireMotDePasse token={token} />
            </>
          )}
        </>
      ) : (
        <>
          <div className="carte formulaire-pro">
            <div className="groupe-champs">
              <h3>Identité</h3>
              <div className="champs-grille">
                <p><strong>Nom :</strong> {moi?.nom}</p>
                <p><strong>Prénom :</strong> {moi?.prenom}</p>
                <p><strong>Rôle :</strong> {LABELS_ROLE[moi?.role] || moi?.role}</p>
              </div>
            </div>
          </div>
          <FormulaireMotDePasse token={token} />
        </>
      )}
    </div>
  );
}

function FormulaireInfos({ client, token, onEnregistre }) {
  const [nom, setNom] = useState(client.nom);
  const [prenom, setPrenom] = useState(client.prenom);
  const [email, setEmail] = useState(client.email);
  const [telephone, setTelephone] = useState(client.telephone);
  const [rue, setRue] = useState(client.adresse?.rue || "");
  const [codePostal, setCodePostal] = useState(client.adresse?.code_postal || "");
  const [ville, setVille] = useState(client.adresse?.ville || "");
  const [enCours, setEnCours] = useState(false);

  async function enregistrer(e) {
    e.preventDefault();
    if (!nom || !prenom || !email) {
      toast.error("Nom, prénom et email sont obligatoires.");
      return;
    }
    if (telephone && !REGEX_TELEPHONE.test(telephone)) {
      toast.error(MESSAGE_TELEPHONE);
      return;
    }
    setEnCours(true);
    const rep = await apiRequest(`/clients/${client.id}`, {
      method: "PATCH",
      token,
      body: {
        nom,
        prenom,
        email,
        telephone,
        adresse: { rue, code_postal: codePostal, ville },
      },
    });
    setEnCours(false);
    if (rep.ok) {
      toast.success("Profil mis à jour.");
      onEnregistre(rep.data);
    } else if (rep.status === 422) {
      toast.error("Email invalide.");
    } else {
      toast.error(messageErreur(rep.status));
    }
  }

  return (
    <form className="carte formulaire-pro" onSubmit={enregistrer}>
      <div className="groupe-champs">
        <h3>{client.numero_client}</h3>
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
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Téléphone
            <input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              pattern={REGEX_TELEPHONE.source}
              title={MESSAGE_TELEPHONE}
            />
          </label>
          <label>
            Rue
            <input value={rue} onChange={(e) => setRue(e.target.value)} />
          </label>
          <label>
            Code postal
            <input value={codePostal} onChange={(e) => setCodePostal(e.target.value)} />
          </label>
          <label>
            Ville
            <input value={ville} onChange={(e) => setVille(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="pied-formulaire">
        <button type="submit" className="btn-primaire" disabled={enCours}>
          {enCours && <Spinner taille={14} />}
          Enregistrer
        </button>
      </div>
    </form>
  );
}

function FormulaireMotDePasse({ token }) {
  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function changer(e) {
    e.preventDefault();
    if (!motDePasseActuel || !nouveauMotDePasse) {
      toast.error("Renseignez le mot de passe actuel et le nouveau.");
      return;
    }
    if (!REGEX_MOT_DE_PASSE.test(nouveauMotDePasse)) {
      toast.error(MESSAGE_MOT_DE_PASSE);
      return;
    }
    setEnCours(true);
    const rep = await apiRequest("/auth/mot-de-passe", {
      method: "POST",
      token,
      body: { mot_de_passe_actuel: motDePasseActuel, nouveau_mot_de_passe: nouveauMotDePasse },
    });
    setEnCours(false);
    if (rep.ok) {
      toast.success("Mot de passe modifié.");
      setMotDePasseActuel("");
      setNouveauMotDePasse("");
    } else if (rep.status === 401) {
      toast.error("Mot de passe actuel incorrect.");
    } else {
      toast.error(messageErreur(rep.status));
    }
  }

  return (
    <form className="carte formulaire-pro" onSubmit={changer}>
      <div className="groupe-champs">
        <h3>Changer le mot de passe</h3>
        <div className="champs-grille">
          <label>
            Mot de passe actuel
            <input
              type="password"
              value={motDePasseActuel}
              onChange={(e) => setMotDePasseActuel(e.target.value)}
            />
          </label>
          <label>
            Nouveau mot de passe
            <input
              type="password"
              value={nouveauMotDePasse}
              onChange={(e) => setNouveauMotDePasse(e.target.value)}
              pattern={REGEX_MOT_DE_PASSE.source}
              title={MESSAGE_MOT_DE_PASSE}
            />
          </label>
        </div>
      </div>

      <div className="pied-formulaire">
        <button type="submit" className="btn-primaire" disabled={enCours}>
          {enCours && <Spinner taille={14} />}
          Changer le mot de passe
        </button>
      </div>
    </form>
  );
}

export default MonProfil;
