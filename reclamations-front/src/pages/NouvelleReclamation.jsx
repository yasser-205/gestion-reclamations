import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiRequest, apiUpload, messageErreur } from "../api";
import Spinner from "../components/Spinner";

const TYPES_MATRICULATION = [
  { valeur: "normale", label: "Arabe", exemple: "12345-A 12", regex: /^\d{1,5}-[A-Z] \d{1,2}$/ },
  { valeur: "ww", label: "WW (véhicule neuf)", exemple: "WW-12345", regex: /^WW-\d{1,5}$/ },
  { valeur: "frontiere", label: "Frontière / touriste (RT)", exemple: "12345-RT-1", regex: /^\d{1,6}-RT-\d{1,2}$/ },
];

const TYPES_ATTESTATION = [
  { valeur: "frontiere", label: "Frontière (CF)", exemple: "CF 1234 / 123456", regex: /^CF \d{4} \/ \d{6}$/ },
  { valeur: "tpv", label: "TPV (C)", exemple: "C 1234 / 123456", regex: /^C \d{4} \/ \d{6}$/ },
];

const REGEX_NUMERO_SINISTRE = /^\d{10}$/;
const EXEMPLE_NUMERO_SINISTRE = "1234567890";

function prefixeAttestation(typeAttestation) {
  return typeAttestation === "frontiere" ? "CF" : "C";
}

function assainirAttestation(typeAttestation, saisie) {
  const prefixe = prefixeAttestation(typeAttestation);
  let brut = saisie.toUpperCase();
  if (brut.startsWith(prefixe)) brut = brut.slice(prefixe.length);
  const chiffres = brut.replace(/[^0-9]/g, "").slice(0, 10);
  let resultat = `${prefixe} ${chiffres.slice(0, 4)}`;
  if (chiffres.length > 4) resultat += ` / ${chiffres.slice(4, 10)}`;
  return resultat;
}

function assainirMatriculation(typeMatriculation, saisie) {
  const brut = saisie.toUpperCase().replace(/[^0-9A-Z]/g, "");

  if (typeMatriculation === "normale") {
    const correspondance = brut.match(/^(\d{0,5})([A-Z]?)(\d{0,2})/);
    const premier = correspondance?.[1] || "";
    const lettre = correspondance?.[2] || "";
    const dernier = lettre ? correspondance?.[3] || "" : "";

    let resultat = premier;
    if (lettre) resultat += `-${lettre}`;
    if (dernier) resultat += ` ${dernier}`;
    return resultat;
  }

  if (typeMatriculation === "ww") {
    const chiffres = brut.replace(/[^0-9]/g, "").slice(0, 5);
    return chiffres ? `WW-${chiffres}` : "";
  }

  const correspondance = brut.match(/^(\d{0,6})([A-Z]*)(\d{0,2})/);
  const premier = correspondance?.[1] || "";
  const lettres = correspondance?.[2] || "";
  const dernier = lettres ? correspondance?.[3] || "" : "";

  let resultat = premier;
  if (lettres) {
    resultat += `-RT`;
    if (dernier) resultat += `-${dernier}`;
  }
  return resultat;
}

function assainirNumeroSinistre(saisie) {
  return saisie.replace(/[^0-9]/g, "").slice(0, 10);
}

function NouvelleReclamation({ token, moi }) {
  const role = moi?.role;
  const monClientId = moi?.client_id;

  const [typeReclamation, setTypeReclamation] = useState("sinistre");
  const [typeAttestation, setTypeAttestation] = useState(TYPES_ATTESTATION[0].valeur);
  const [attestation, setAttestation] = useState("");
  const [typeMatriculation, setTypeMatriculation] = useState(TYPES_MATRICULATION[0].valeur);
  const [matriculation, setMatriculation] = useState("");
  const [numeroSinistre, setNumeroSinistre] = useState("");
  const [dateSinistre, setDateSinistre] = useState("");

  const infoAttestation = TYPES_ATTESTATION.find((t) => t.valeur === typeAttestation);
  const infoMatriculation = TYPES_MATRICULATION.find((t) => t.valeur === typeMatriculation);
  const formatAttestation = infoAttestation?.exemple || "";
  const formatMatriculation = infoMatriculation?.exemple || "";
  const attestationRenseignee = attestation.replace(/[^0-9]/g, "").length > 0;

  function changerTypeReclamation(valeur) {
    setTypeReclamation(valeur);
    setAttestation(valeur === "production" ? `${prefixeAttestation(typeAttestation)} ` : "");
  }

  function changerTypeAttestation(valeur) {
    setTypeAttestation(valeur);
    setAttestation(`${prefixeAttestation(valeur)} `);
  }

  function changerTypeMatriculation(valeur) {
    setTypeMatriculation(valeur);
    setMatriculation("");
  }

  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [chargementClients, setChargementClients] = useState(true);

  const [motif, setMotif] = useState("remboursement");
  const [description, setDescription] = useState("");
  const [fichiers, setFichiers] = useState([]);
  const [cleChampFichiers, setCleChampFichiers] = useState(0);

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
      if (!attestationRenseignee && !matriculation) {
        setErreur("Pour une production, renseignez police ou matriculation.");
        return;
      }
      if (attestationRenseignee && !infoAttestation.regex.test(attestation)) {
        setErreur(`La police doit respecter le format ${formatAttestation}.`);
        return;
      }
      if (matriculation && !infoMatriculation.regex.test(matriculation)) {
        setErreur(`La matriculation doit respecter le format ${formatMatriculation}.`);
        return;
      }
    }
    if (typeReclamation === "sinistre") {
      if (numeroSinistre && !REGEX_NUMERO_SINISTRE.test(numeroSinistre)) {
        setErreur("Le numéro de sinistre doit contenir exactement 10 chiffres.");
        return;
      }
      if (!dateSinistre) {
        setErreur("La date de sinistre est obligatoire.");
        return;
      }
      if (!matriculation) {
        setErreur("L'immatriculation est obligatoire pour un sinistre.");
        return;
      }
      if (!infoMatriculation.regex.test(matriculation)) {
        setErreur(`La matriculation doit respecter le format ${formatMatriculation}.`);
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
      attestation: attestationRenseignee ? attestation : null,
      matriculation: matriculation || null,
      numero_sinistre: typeReclamation === "sinistre" ? numeroSinistre || null : null,
      date_sinistre: typeReclamation === "sinistre" ? dateSinistre : null,
      motif,
      description,
    };

    setEnvoiEnCours(true);
    const rep = await apiRequest("/reclamation", { method: "POST", token, body: corps });

    if (!rep.ok) {
      setEnvoiEnCours(false);
      setErreur(messageErreur(rep.status));
      return;
    }

    if (fichiers.length > 0) {
      const repFichiers = await apiUpload(`/reclamation/${rep.data.id}/pieces_jointes`, {
        fichiers,
        token,
      });
      if (!repFichiers.ok) {
        toast.error("Réclamation créée, mais l'envoi des pièces jointes a échoué.");
      }
    }

    setEnvoiEnCours(false);
    toast.success(`Réclamation ${rep.data.numero_reclamation} créée !`);
    setDescription("");
    setAttestation(typeReclamation === "production" ? `${prefixeAttestation(typeAttestation)} ` : "");
    setMatriculation("");
    setNumeroSinistre("");
    setDateSinistre("");
    setFichiers([]);
    setCleChampFichiers((n) => n + 1);
  }

  if (role && role !== "client" && !chargementClients && clients.length === 0 && !erreur) {
    return (
      <div className="page page-formulaire page-pleine-largeur">
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
    <div className="page page-formulaire page-pleine-largeur">
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
              onClick={() => changerTypeReclamation("sinistre")}
            >
              Sinistre
            </button>
            <button
              type="button"
              className={typeReclamation === "production" ? "actif" : ""}
              onClick={() => changerTypeReclamation("production")}
            >
              Production
            </button>
          </div>

          {typeReclamation === "sinistre" && (
            <div className="champs-grille champs-grille-suite">
              <label>
                Numéro de sinistre (optionnel)
                <input
                  placeholder={EXEMPLE_NUMERO_SINISTRE}
                  value={numeroSinistre}
                  onChange={(e) => setNumeroSinistre(assainirNumeroSinistre(e.target.value))}
                  pattern={REGEX_NUMERO_SINISTRE.source}
                  inputMode="numeric"
                />
              </label>
              <label>
                <span>Date de sinistre <span className="requis">*</span></span>
                <input
                  type="date"
                  value={dateSinistre}
                  onChange={(e) => setDateSinistre(e.target.value)}
                  required
                />
              </label>
              <p className="legende champ-pleine-largeur">
                Numéro de sinistre — format : 10 chiffres (ex : {EXEMPLE_NUMERO_SINISTRE})
              </p>

              <label>
                Type de matriculation
                <select value={typeMatriculation} onChange={(e) => changerTypeMatriculation(e.target.value)}>
                  {TYPES_MATRICULATION.map((t) => (
                    <option key={t.valeur} value={t.valeur}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Immatriculation <span className="requis">*</span></span>
                <input
                  placeholder={formatMatriculation}
                  value={matriculation}
                  onChange={(e) => setMatriculation(assainirMatriculation(typeMatriculation, e.target.value))}
                  pattern={infoMatriculation.regex.source}
                  required
                />
              </label>
              <p className="legende champ-pleine-largeur">
                Format : {formatMatriculation}
              </p>
            </div>
          )}

          {typeReclamation === "production" && (
            <div className="champs-grille champs-grille-suite">
              <label>
                Type de contrat
                <select value={typeAttestation} onChange={(e) => changerTypeAttestation(e.target.value)}>
                  {TYPES_ATTESTATION.map((t) => (
                    <option key={t.valeur} value={t.valeur}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Police (optionnel)
                <input
                  placeholder={formatAttestation}
                  value={attestation}
                  onChange={(e) => setAttestation(assainirAttestation(typeAttestation, e.target.value))}
                  pattern={infoAttestation.regex.source}
                />
              </label>
              <p className="legende champ-pleine-largeur">
                Format : {formatAttestation}
              </p>
              <label>
                Type de matriculation
                <select value={typeMatriculation} onChange={(e) => changerTypeMatriculation(e.target.value)}>
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
                  onChange={(e) => setMatriculation(assainirMatriculation(typeMatriculation, e.target.value))}
                  pattern={infoMatriculation.regex.source}
                />
              </label>
              <p className="legende champ-pleine-largeur">
                Format : {formatMatriculation}
              </p>
              <p className="legende champ-pleine-largeur">
                Au moins un des deux (police ou matriculation) est requis.
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

        <div className="groupe-champs">
          <h3>Pièces jointes (optionnel)</h3>
          <input
            key={cleChampFichiers}
            type="file"
            multiple
            onChange={(e) => setFichiers(Array.from(e.target.files))}
          />
          {fichiers.length > 0 && (
            <p className="legende">{fichiers.length} fichier(s) sélectionné(s)</p>
          )}
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
