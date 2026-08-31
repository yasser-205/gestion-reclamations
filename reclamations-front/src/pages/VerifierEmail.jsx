import { useEffect, useState } from "react";
import { apiRequest, messageErreur } from "../api";
import Spinner from "../components/Spinner";

function VerifierEmail({ token }) {
  const [statut, setStatut] = useState("chargement");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    apiRequest(`/auth/verifier-email?token=${encodeURIComponent(token)}`).then((rep) => {
      if (ignore) return;
      if (rep.ok) {
        setStatut("succes");
      } else {
        setStatut("erreur");
        setMessage(rep.data?.detail || messageErreur(rep.status));
      }
    });
    return () => { ignore = true; };
  }, [token]);

  function retourConnexion() {
    window.location.href = "/";
  }

  return (
    <div className="ecran-login">
      <div className="login-hero">
        <img src="/logo-cat-sombre.png" alt="CAT Assurance & Réassurance" className="login-logo" />
        <p className="login-claim">Le suivi de vos réclamations, du premier contact à la clôture.</p>
      </div>

      <div className="login-formulaire-zone">
        <div className="page page-login">
          <h1>Vérification de l'email</h1>

          {statut === "chargement" && (
            <p className="chargement-page"><Spinner /> Vérification en cours…</p>
          )}
          {statut === "succes" && (
            <>
              <p className="succes">Votre adresse email a été vérifiée avec succès.</p>
              <button type="button" className="btn-primaire" onClick={retourConnexion}>
                Aller à la connexion
              </button>
            </>
          )}
          {statut === "erreur" && (
            <>
              <p className="erreur">{message}</p>
              <button type="button" className="btn-secondaire" onClick={retourConnexion}>
                Aller à la connexion
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerifierEmail;
