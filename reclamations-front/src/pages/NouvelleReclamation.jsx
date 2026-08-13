import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiRequest, messageErreur } from "../api";
import Spinner from "../components/Spinner";

const TYPES_MATRICULATION = [
  { valeur: "normale", label: "Normale (marocaine)", exemple: "12345-A-6", regex: /^\d{1,5}-[A-Z]-\d{1,2}$/ },
  { valeur: "ww", label: "WW (véhicule neuf)", exemple: "12345-WW-1", regex: /^\d{1,6}-WW-\d{1,2}$/ },
  { valeur: "frontiere", label: "Frontière / touriste (RT)", exemple: "12345-RT-1", regex: /^\d{1,6}-RT-\d{1,2}$/ },
];

const TYPES_ATTESTATION = [
  { valeur: "frontiere", label: "Frontière (CF)", exemple: "CF 1234 / 123456", regex: /^CF \d{4} \/ \d{6}$/ },
  { valeur: "tpv", label: "TPV (C)", exemple: "C 1234 / 123456", regex: /^C \d{4} \/ \d{6}$/ },
];

const REGEX_NUMERO_SINISTRE = /^SIN-\d{4}-\d{6}$/;
const EXEMPLE_NUMERO_SINISTRE = "SIN-2026-000123";

function NouvelleReclamation({ token, moi }) {
  const role = moi?.role;
  const monClientId = moi?.client_id;

  const [typeReclamation, setTypeReclamation] = useState("sinistre");
  const [typeAttestation, setTypeAttestation] = useState(TYPES_ATTESTATION[0].valeur);
  const [attestation, setAttestation] = useState("");
  const [typeMatriculation, setTypeMatriculation] = useState(TYPES_MATRICULATION[0].valeur);
  const [matriculation, setMatriculation] = useState("");
  const [numeroSinistre, setNumeroSinistre] = useState("");

  const infoAttestation = TYPES_ATTESTATION.find((t) => t.valeur === typeAttestation);
  const infoMatriculation = TYPES_MATRICULATION.find((t) => t.valeur === typeMatriculation);
  const formatAttestation = infoAttestation?.exemple || "";
  const formatMatriculation = infoMatriculation?.exemple || "";

  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [chargementClients, setChargementClients] = useState(true);

  const [contrat, setContrat] = useState("");
  const [canal, setCanal] = useState("telephone");
  const [motif, setMotif] = useState("remboursement");
  const [priorite, setPriorite] = useState("moyenne");
  const [description, setDescription] = useState("");

  const [erreur, setErreur] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    if (!role || role === "client") return;
    let ignore = false;
    apiRequest("/clients", { token }).then((rep) => {
      if (ignore) return;
      setChargementClients(false);
      if (rep.ok) setClients(rep.data);
      else setErreur(messageErreur(rep.status, "Impossible de charger les clients."));
    });
    return () => { ignore = true; };
  }, [role, token]);

  async function creer(e) {
    e.preventDefault();
    setErreur("");

    if (!description) {
      setErreur("La description est obligatoire.");
      return;
    }
    if (typeReclamation === "production") {
      if (!attestation && !matriculation) {
        setErreur("Pour une production, renseignez attestation ou matriculation.");
        return;
      }
      if (attestation && !infoAttestation.regex.test(attestation)) {
        setErreur(`L'attestation doit respecter le format ${formatAttestation}.`);
        return;
      }
      if (matriculation && !infoMatriculation.regex.test(matriculation)) {
        setErreur(`La matriculation doit respecter le format ${formatMatriculation}.`);
        return;
      }
    }
    if (typeReclamation === "sinistre") {
      if (!numeroSinistre) {
        setErreur("Le numéro de sinistre est obligatoire.");
        return;
      }
      if (!REGEX_NUMERO_SINISTRE.test(numeroSinistre)) {
        setErreur(`Le numéro de sinistre doit respecter le format ${EXEMPLE_NUMERO_SINISTRE}.`);
        return;
      }
    }

    const idClient = role === "client" ? monClientId : clientId;
    if (!idClient) {
      setErreur("Veuillez choisir un client.");
      return;
    }

    const corps = {
      type_reclamation: typeReclamation,
      client_id: idClient,
      contrat: contrat || null,
      attestation: attestation || null,
      matriculation: matriculation || null,
      numero_sinistre: typeReclamation === "sinistre" ? numeroSinistre : null,
      canal,
      motif,
      description,
      priorite,
    };

    setEnvoiEnCours(true);
    const rep = await apiRequest("/reclamation", { method: "POST", token, body: corps });
    setEnvoiEnCours(false);

    if (rep.ok) {
      toast.success(`Réclamation ${rep.data.numero_reclamation} créée !`);
      setDescription("");
      setContrat("");
      setAttestation("");
      setMatriculation("");
      setNumeroSinistre("");
    } else {
      setErreur(messageErreur(rep.status));
    }
  }

  if (role && role !== "client" && !chargementClients && clients.length === 0 && !erreur) {
    return (
      <div className="page page-formulaire">
        <div className="entete-page">
          <h1>Nouvelle réclamation</h1>
        </div>
        <div className="carte">
          <p className="info">Aucun client. Créez-en un d'abord.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-formulaire">
      <div className="entete-page">
        <h1>Nouvelle réclamation</h1>
        <p className="sous-titre">Renseignez les informations ci-dessous pour enregistrer une réclamation.</p>
      </div>

      <form className="carte formulaire-pro" onSubmit={creer}>
        <div className="groupe-champs">
          <h3>Type de réclamation</h3>
          <div className="segmented">
            <button
              type="button"
              className={typeReclamation === "sinistre" ? "actif" : ""}
              onClick={() => setTypeReclamation("sinistre")}
            >
              Sinistre
            </button>
            <button
              type="button"
              className={typeReclamation === "production" ? "actif" : ""}
              onClick={() => setTypeReclamation("production")}
            >
              Production
            </button>
          </div>

          {typeReclamation === "sinistre" && (
            <div className="champs-grille champs-grille-suite">
              <label>
                Numéro de sinistre <span className="requis">*</span>
                <input
                  placeholder={EXEMPLE_NUMERO_SINISTRE}
                  value={numeroSinistre}
                  onChange={(e) => setNumeroSinistre(e.target.value)}
                  pattern="^SIN-\d{4}-\d{6}$"
                  required
                />
              </label>
              <p className="legende champ-pleine-largeur">
                Format : {EXEMPLE_NUMERO_SINISTRE}
              </p>
            </div>
          )}

          {typeReclamation === "production" && (
            <div className="champs-grille champs-grille-suite">
              <label>
                Type d'attestation
                <select value={typeAttestation} onChange={(e) => setTypeAttestation(e.target.value)}>
                  {TYPES_ATTESTATION.map((t) => (
                    <option key={t.valeur} value={t.valeur}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Attestation (optionnel)
                <input
                  placeholder={formatAttestation}
                  value={attestation}
                  onChange={(e) => setAttestation(e.target.value)}
                  pattern={infoAttestation.regex.source}
                />
              </label>
              <p className="legende champ-pleine-largeur">
                Format : {formatAttestation}
              </p>
              <label>
                Type de matriculation
                <select value={typeMatriculation} onChange={(e) => setTypeMatriculation(e.target.value)}>
                  {TYPES_MATRICULATION.map((t) => (
                    <option key={t.valeur} value={t.valeur}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Matriculation (optionnel)
                <input
                  placeholder={formatMatriculation}
                  value={matriculation}
                  onChange={(e) => setMatriculation(e.target.value)}
                  pattern={infoMatriculation.regex.source}
                />
              </label>
              <p className="legende champ-pleine-largeur">
                Format : {formatMatriculation}
              </p>
              <p className="legende champ-pleine-largeur">
                Au moins un des deux (attestation ou matriculation) est requis.
              </p>
            </div>
          )}
        </div>

        {role !== "client" && (
          <div className="groupe-champs">
            <h3>Client concerné</h3>
            {chargementClients ? (
              <p className="chargement-page"><Spinner taille={14} /> Chargement des clients…</p>
            ) : (
              <label>
                Client
                <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">Sélectionner un client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.numero_client} — {c.nom} {c.prenom}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        <div className="groupe-champs">
          <h3>Détails</h3>
          <div className="champs-grille">
            <label>
              Canal
              <select value={canal} onChange={(e) => setCanal(e.target.value)}>
                <option value="telephone">Téléphone</option>
                <option value="email">Email</option>
                <option value="courrier">Courrier</option>
                <option value="agence">Agence</option>
              </select>
            </label>

            <label>
              Motif
              <select value={motif} onChange={(e) => setMotif(e.target.value)}>
                <option value="remboursement">Remboursement</option>
                <option value="delai">Délai</option>
                <option value="prime">Prime</option>
                <option value="contrat">Contrat</option>
                <option value="service">Service</option>
                <option value="autre">Autre</option>
              </select>
            </label>

            {role !== "client" && (
              <label>
                Priorité
                <select value={priorite} onChange={(e) => setPriorite(e.target.value)}>
                  <option value="basse">Basse</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="haute">Haute</option>
                  <option value="urgente">Urgente</option>
                </select>
              </label>
            )}

            <label>
              Numéro de contrat (optionnel)
              <input value={contrat} onChange={(e) => setContrat(e.target.value)} />
            </label>
          </div>
        </div>

        <div className="groupe-champs">
          <h3>Description <span className="requis">*</span></h3>
          <textarea
            rows={5}
            placeholder="Décrivez la réclamation en détail…"
            aria-label="Description de la réclamation"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {erreur && <p className="erreur">{erreur}</p>}

        <div className="pied-formulaire">
          <button type="submit" className="btn-primaire" disabled={envoiEnCours}>
            {envoiEnCours && <Spinner taille={14} />}
            {envoiEnCours ? "Création…" : "Créer la réclamation"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NouvelleReclamation;
