import { useState } from "react";
import toast from "react-hot-toast";
import { apiRequest, messageErreur } from "../api";

const REGEX_TELEPHONE = /^0[5-7]\d{8}$/;
const REGEX_MOT_DE_PASSE = /^(?=.*[A-Z]).{8,}$/;

function Login({ onConnecte }) {
  const [mode, setMode] = useState("connexion");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const [login, setLogin] = useState("");
  const [motDePasse, setMotDePasse] = useState("");

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");

  const [emailEnAttente, setEmailEnAttente] = useState("");
  const [codeVerification, setCodeVerification] = useState("");

  async function seConnecter(e) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    const { ok, status, data } = await apiRequest("/auth/login", {
      method: "POST",
      body: { login, mot_de_passe: motDePasse },
    });
    setChargement(false);

    if (ok) {
      toast.success("Connexion réussie.");
      onConnecte(data.access_token);
    } else if (status === 401) {
      setErreur("Login ou mot de passe incorrect");
    } else if (status === 402) {
      setErreur("Compte désactivé");
    } else {
      setErreur(messageErreur(status));
    }
  }

  async function sInscrire(e) {
    e.preventDefault();
    setErreur("");
    if (!login || !motDePasse || !nom || !prenom || !email) {
      setErreur("Tous les champs sauf téléphone sont obligatoires.");
      return;
    }
    if (!REGEX_MOT_DE_PASSE.test(motDePasse)) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères dont une majuscule.");
      return;
    }
    if (telephone && !REGEX_TELEPHONE.test(telephone)) {
      setErreur("Le téléphone doit contenir 10 chiffres et commencer par 05, 06 ou 07.");
      return;
    }
    setChargement(true);
    const { ok, status, data } = await apiRequest("/auth/register", {
      method: "POST",
      body: { login, mot_de_passe: motDePasse, nom, prenom, email, telephone },
    });
    setChargement(false);

    if (ok) {
      toast.success("Code de vérification envoyé par email.");
      setEmailEnAttente(data.email);
      setMode("confirmation");
    } else if (status === 400) {
      setErreur("Ce login est déjà pris.");
    } else {
      setErreur(messageErreur(status));
    }
  }

  async function confirmerInscription(e) {
    e.preventDefault();
    setErreur("");
    if (!codeVerification) {
      setErreur("Veuillez saisir le code reçu par email.");
      return;
    }
    setChargement(true);
    const { ok, status, data } = await apiRequest("/auth/confirmer-inscription", {
      method: "POST",
      body: { email: emailEnAttente, code: codeVerification },
    });
    setChargement(false);

    if (ok) {
      toast.success("Compte vérifié, bienvenue !");
      onConnecte(data.access_token);
    } else if (status === 400) {
      setErreur("Code invalide ou expiré.");
    } else {
      setErreur(messageErreur(status));
    }
  }

  async function renvoyerCode() {
    setErreur("");
    setChargement(true);
    const { ok, status } = await apiRequest("/auth/renvoyer-code", {
      method: "POST",
      body: { email: emailEnAttente },
    });
    setChargement(false);
    if (ok) {
      toast.success("Nouveau code envoyé.");
    } else if (status === 400) {
      setErreur("Ce compte est déjà vérifié.");
    } else {
      setErreur(messageErreur(status));
    }
  }

  return (
    <div className="ecran-login">
      <div className="login-hero">
        <img src="/logo-cat-sombre.png" alt="CAT Assurance & Réassurance" className="login-logo" />
        <p className="login-claim">Le suivi de vos réclamations, du premier contact à la clôture.</p>
        <p className="login-legal">Entreprise régie par la loi n° 17-99 portant code des assurances.</p>
      </div>

      <div className="login-formulaire-zone">
        <div className="page page-login">
          <h1>Portail réclamations</h1>

          {mode !== "confirmation" && (
            <div className="segmented">
              <button
                type="button"
                className={mode === "connexion" ? "actif" : ""}
                onClick={() => { setMode("connexion"); setErreur(""); }}
              >
                Se connecter
              </button>
              <button
                type="button"
                className={mode === "inscription" ? "actif" : ""}
                onClick={() => { setMode("inscription"); setErreur(""); }}
              >
                S'inscrire
              </button>
            </div>
          )}

          {mode === "confirmation" ? (
            <form className="formulaire" onSubmit={confirmerInscription}>
              <h2>Vérifiez votre email</h2>
              <p className="legende">
                Un code à 6 chiffres a été envoyé à {emailEnAttente}. Saisissez-le
                ci-dessous pour finaliser votre inscription.
              </p>
              <label>
                Code de vérification
                <input
                  value={codeVerification}
                  onChange={(e) => setCodeVerification(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                />
              </label>
              <button type="submit" disabled={chargement}>Confirmer</button>
              <button type="button" className="btn-secondaire" onClick={renvoyerCode} disabled={chargement}>
                Renvoyer le code
              </button>
              <button
                type="button"
                className="btn-secondaire"
                onClick={() => { setMode("inscription"); setErreur(""); }}
              >
                ← Modifier mes informations
              </button>
            </form>
          ) : mode === "connexion" ? (
            <form className="formulaire" onSubmit={seConnecter}>
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
                />
              </label>
              <button type="submit" disabled={chargement}>Se connecter</button>
            </form>
          ) : (
            <form className="formulaire" onSubmit={sInscrire}>
              <h2>Créer un compte client</h2>
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
                  title="Au moins 8 caractères dont une majuscule"
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
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label>
                Téléphone
                <input
                  placeholder="0612345678"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  pattern={REGEX_TELEPHONE.source}
                  title="10 chiffres, commence par 05, 06 ou 07"
                />
              </label>
              <button type="submit" disabled={chargement}>S'inscrire</button>
            </form>
          )}

          {erreur && <p className="erreur">{erreur}</p>}
        </div>
      </div>
    </div>
  );
}

export default Login;
