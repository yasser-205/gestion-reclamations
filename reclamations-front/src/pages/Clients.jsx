import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiRequest, messageErreur } from "../api";
import Spinner from "../components/Spinner";

function Clients({ token, onVoirReclamation }) {
  const [clients, setClients] = useState(null);
  const [erreur, setErreur] = useState("");
  const [recharge, setRecharge] = useState(0);
  const [selectionId, setSelectionId] = useState("");

  useEffect(() => {
    let ignore = false;
    apiRequest("/clients", { token }).then((rep) => {
      if (ignore) return;
      if (rep.ok) {
        setErreur("");
        setClients(rep.data);
      } else {
        setErreur(messageErreur(rep.status));
      }
    });
    return () => { ignore = true; };
  }, [token, recharge]);

  const client = clients?.find((c) => c.id === selectionId) || null;

  if (client) {
    return (
      <DetailClient
        client={client}
        token={token}
        onRetour={() => setSelectionId("")}
        onModifie={() => setRecharge((n) => n + 1)}
        onVoirReclamation={onVoirReclamation}
      />
    );
  }

  return (
    <div className="page">
      <h1>Clients</h1>

      {erreur && <p className="erreur">{erreur}</p>}

      {!clients && !erreur && <p className="chargement-page"><Spinner /> Chargement…</p>}

      {clients && clients.length === 0 && (
        <p className="info">Aucun client pour le moment.</p>
      )}

      {clients && clients.length > 0 && (
        <table className="tableau">
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="ligne-cliquable" onClick={() => setSelectionId(c.id)}>
                <td>{c.numero_client}</td>
                <td>{c.nom}</td>
                <td>{c.prenom}</td>
                <td>{c.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DetailClient({ client, token, onRetour, onModifie, onVoirReclamation }) {
  const [nom, setNom] = useState(client.nom);
  const [prenom, setPrenom] = useState(client.prenom);
  const [email, setEmail] = useState(client.email);
  const [telephone, setTelephone] = useState(client.telephone);
  const [rue, setRue] = useState(client.adresse?.rue || "");
  const [codePostal, setCodePostal] = useState(client.adresse?.code_postal || "");
  const [ville, setVille] = useState(client.adresse?.ville || "");
  const [enCours, setEnCours] = useState(false);

  const [reclamations, setReclamations] = useState(null);
  const [erreurReclamations, setErreurReclamations] = useState("");

  useEffect(() => {
    let ignore = false;
    apiRequest(`/reclamation?client_id=${encodeURIComponent(client.id)}`, { token }).then((rep) => {
      if (ignore) return;
      if (rep.ok) {
        setErreurReclamations("");
        setReclamations(rep.data);
      } else {
        setErreurReclamations(messageErreur(rep.status));
      }
    });
    return () => { ignore = true; };
  }, [client.id, token]);

  async function enregistrer(e) {
    e.preventDefault();
    if (!nom || !prenom || !email) {
      toast.error("Nom, prénom et email sont obligatoires.");
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
      toast.success("Client mis à jour.");
      onModifie();
    } else if (rep.status === 422) {
      toast.error("Email invalide.");
    } else {
      toast.error(messageErreur(rep.status));
    }
  }

  return (
    <div className="page page-formulaire">
      <div className="entete-page">
        <button type="button" className="btn-secondaire" onClick={onRetour}>← Retour à la liste</button>
      </div>

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
              <input value={telephone} onChange={(e) => setTelephone(e.target.value)} />
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

      <h2>Historique des réclamations</h2>
      {erreurReclamations && <p className="erreur">{erreurReclamations}</p>}
      {!reclamations && !erreurReclamations && <p className="chargement-page"><Spinner /> Chargement…</p>}
      {reclamations && reclamations.length === 0 && (
        <p className="info">Aucune réclamation pour ce client.</p>
      )}
      {reclamations && reclamations.length > 0 && (
        <table className="tableau">
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Statut</th>
              <th>Motif</th>
              <th>Priorité</th>
              <th>Reçue le</th>
            </tr>
          </thead>
          <tbody>
            {reclamations.map((r) => (
              <tr key={r.id} className="ligne-cliquable" onClick={() => onVoirReclamation(r.id)}>
                <td>{r.numero_reclamation}</td>
                <td>{r.statut}</td>
                <td>{r.motif}</td>
                <td>{r.priorite}</td>
                <td>{r.date_reception.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Clients;
