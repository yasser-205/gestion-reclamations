import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { apiRequest, apiUpload, apiOuvrirFichier, messageErreur } from "../api";
import Spinner from "../components/Spinner";
import StatutPill from "../components/StatutPill";

const DELAI_CONFIRMATION_MS = 3000;

function useConfirmation(delaiMs = DELAI_CONFIRMATION_MS) {
  const [enAttente, setEnAttente] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function declencher(action) {
    if (!enAttente) {
      setEnAttente(true);
      timerRef.current = setTimeout(() => setEnAttente(false), delaiMs);
      return;
    }
    clearTimeout(timerRef.current);
    setEnAttente(false);
    action();
  }

  return { enAttente, declencher };
}

const STATUTS = [
  "nouvelle",
  "affectee",
  "en_cours",
  "en_attente_client",
  "cloturee",
];

const MOTIFS = ["remboursement", "delai", "prime", "contrat", "service", "autre"];
const TAILLE_PAGE = 10;

function Reclamations({ token, moi, cibleReclamation }) {
  const role = moi?.role;
  const estClient = role === "client";
  const peutAffecter = role === "responsable";
  const [reclamations, setReclamations] = useState(null);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [erreur, setErreur] = useState("");

  const [selectionId, setSelectionId] = useState("");
  const [gestionnaireChoisi, setGestionnaireChoisi] = useState("");
  const [reponseTexte, setReponseTexte] = useState("");
  const [reponseFichiers, setReponseFichiers] = useState([]);
  const [cleChampFichiersReponse, setCleChampFichiersReponse] = useState(0);
  const [enCoursPriseEnCharge, setEnCoursPriseEnCharge] = useState(false);
  const [enCoursCloture, setEnCoursCloture] = useState(false);
  const [enCoursAffectation, setEnCoursAffectation] = useState(false);
  const [enCoursReponse, setEnCoursReponse] = useState(false);
  const [recharge, setRecharge] = useState(0);
  const confirmationReponse = useConfirmation();
  const confirmationCloture = useConfirmation();

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtreMotif, setFiltreMotif] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [pageActuelle, setPageActuelle] = useState(1);
  const [cleCibleTraitee, setCleCibleTraitee] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);

  useEffect(() => {
    let ignore = false;
    apiRequest("/reclamation", { token }).then((rep) => {
      if (ignore) return;
      if (!rep.ok) {
        setErreur(messageErreur(rep.status));
        return;
      }
      setErreur("");
      setReclamations(rep.data);
      apiRequest("/utilisateurs", { token }).then((repUsers) => {
        if (ignore) return;
        setUtilisateurs(repUsers.ok ? repUsers.data : []);
      });
    });
    return () => { ignore = true; };
  }, [token, recharge]);

  if (cibleReclamation && cibleReclamation.cle !== cleCibleTraitee && reclamations) {
    const cible = reclamations.find((r) => r.id === cibleReclamation.id);
    if (cible) {
      setSelectionId(cible.id);
      setGestionnaireChoisi("");
      setReponseTexte("");
      setReponseFichiers([]);
    }
    setCleCibleTraitee(cibleReclamation.cle);
  }

  const nomsGestionnaires = Object.fromEntries(
    utilisateurs.map((u) => [u.id, `${u.prenom} ${u.nom}`])
  );
  const gestionnaires = utilisateurs.filter((u) => u.role === "gestionnaire");

  const rec = reclamations?.find((r) => r.id === selectionId) || null;

  useEffect(() => {
    if (!rec) return;
    let ignore = false;
    apiRequest(`/clients/${rec.client_id}`, { token }).then((rep) => {
      if (!ignore) setClientDetail(rep.ok ? rep.data : null);
    });
    return () => { ignore = true; };
  }, [rec?.client_id, token]);

  const filtresActifs = recherche || filtreStatut || filtreMotif || dateDebut || dateFin;

  const reclamationsFiltrees = reclamations?.filter((r) => {
    if (filtreStatut && r.statut !== filtreStatut) return false;
    if (filtreMotif && r.motif !== filtreMotif) return false;
    const dateRecue = r.date_reception.slice(0, 10);
    if (dateDebut && dateRecue < dateDebut) return false;
    if (dateFin && dateRecue > dateFin) return false;
    if (recherche) {
      const texte = recherche.toLowerCase();
      if (
        !r.numero_reclamation.toLowerCase().includes(texte) &&
        !r.description.toLowerCase().includes(texte)
      ) {
        return false;
      }
    }
    return true;
  }) || [];

  const totalPages = Math.max(1, Math.ceil(reclamationsFiltrees.length / TAILLE_PAGE));
  const pageBornee = Math.min(pageActuelle, totalPages);
  const reclamationsPage = reclamationsFiltrees.slice(
    (pageBornee - 1) * TAILLE_PAGE,
    pageBornee * TAILLE_PAGE
  );

  function changerFiltre(setter) {
    return (valeur) => {
      setter(valeur);
      setPageActuelle(1);
    };
  }

  function reinitialiserFiltres() {
    setRecherche("");
    setFiltreStatut("");
    setFiltreMotif("");
    setDateDebut("");
    setDateFin("");
    setPageActuelle(1);
  }

  function ouvrirDetail(r) {
    setSelectionId(r.id);
    setGestionnaireChoisi("");
    setReponseTexte("");
    setReponseFichiers([]);
  }

  function retourListe() {
    setSelectionId("");
  }

  async function prendreEnCharge() {
    setEnCoursPriseEnCharge(true);
    const rep = await apiRequest(`/reclamation/${rec.id}/prendre-en-charge`, {
      method: "POST",
      token,
    });
    setEnCoursPriseEnCharge(false);
    if (rep.ok) {
      toast.success("Réclamation prise en charge.");
      setRecharge((n) => n + 1);
    } else {
      toast.error(messageErreur(rep.status));
    }
  }

  async function cloturer() {
    setEnCoursCloture(true);
    const rep = await apiRequest(`/reclamation/${rec.id}/statut`, {
      method: "PATCH",
      token,
      body: { statut: "cloturee" },
    });
    setEnCoursCloture(false);
    if (rep.ok) {
      toast.success("Réclamation clôturée.");
      setRecharge((n) => n + 1);
    } else {
      toast.error(messageErreur(rep.status));
    }
  }

  async function ouvrirPieceJointe(fileId) {
    const ok = await apiOuvrirFichier(`/reclamation/pieces-jointes/${fileId}`, token);
    if (!ok) toast.error("Impossible d'ouvrir le fichier.");
  }

  async function affecter() {
    setEnCoursAffectation(true);
    const rep = await apiRequest(`/reclamation/${rec.id}/affecter`, {
      method: "POST",
      token,
      body: { gestionnaire_id: gestionnaireChoisi },
    });
    setEnCoursAffectation(false);
    if (rep.ok) {
      toast.success("Réclamation affectée.");
      setRecharge((n) => n + 1);
    } else {
      toast.error(messageErreur(rep.status));
    }
  }

  async function envoyerReponse() {
    setEnCoursReponse(true);
    const rep = await apiUpload(`/reclamation/${rec.id}/reponse`, {
      champs: { reponse: reponseTexte },
      fichiers: reponseFichiers,
      token,
    });
    setEnCoursReponse(false);
    if (rep.ok) {
      toast.success("Réponse envoyée.");
      setReponseTexte("");
      setReponseFichiers([]);
      setCleChampFichiersReponse((n) => n + 1);
      setRecharge((n) => n + 1);
    } else {
      toast.error(messageErreur(rep.status));
    }
  }

  if (!reclamations && !erreur) {
    return (
      <div className="page page-pleine-largeur">
        <h1>Réclamation</h1>
        <p className="chargement-page"><Spinner /> Chargement…</p>
      </div>
    );
  }

  if (rec) {
    const peutPrendreEnCharge = role === "gestionnaire" && rec.statut === "nouvelle";
    const peutCloturer = role === "gestionnaire" && rec.statut !== "nouvelle" && rec.statut !== "cloturee";
    const staffARepondu = (rec.reponses || []).some((m) => m.role !== "client");
    const peutRepondre =
      rec.statut !== "cloturee" &&
      (role === "responsable" || role === "admin"
        ? true
        : role === "gestionnaire"
        ? rec.gestionnaire_id === moi?.id
        : role === "client"
        ? staffARepondu
        : false);

    return (
      <div className="page page-pleine-largeur">
        <div className="entete-detail">
          <button type="button" className="btn-secondaire" onClick={retourListe}>← Retour à la liste</button>
        </div>
        <h1>{rec.numero_reclamation}</h1>

        <div className="colonnes">
          <div>
            <p><strong>Numéro :</strong> {rec.numero_reclamation}</p>
            <p><strong>Statut :</strong> <StatutPill statut={rec.statut} /></p>
            <p><strong>Type :</strong> {rec.type_reclamation}</p>
            <p><strong>Motif :</strong> {rec.motif}</p>
            {rec.type_reclamation === "production" && (
              <>
                <p><strong>Attestation :</strong> {rec.attestation || "—"}</p>
                <p><strong>Matriculation :</strong> {rec.matriculation || "—"}</p>
              </>
            )}
            {rec.type_reclamation === "sinistre" && (
              <>
                <p><strong>Numéro de sinistre :</strong> {rec.numero_sinistre || "—"}</p>
                <p><strong>Date de sinistre :</strong> {rec.date_sinistre || "—"}</p>
                <p><strong>Immatriculation :</strong> {rec.matriculation || "—"}</p>
              </>
            )}
          </div>
          <div>
            <p><strong>Reçue le :</strong> {rec.date_reception.slice(0, 10)}</p>
            <p><strong>Gestionnaire :</strong> {nomsGestionnaires[rec.gestionnaire_id] || "non affecté"}</p>
            <p><strong>Téléphone du client :</strong> {clientDetail?.id === rec.client_id ? clientDetail.telephone : "…"}</p>
          </div>
        </div>

        <p><strong>Description :</strong> {rec.description}</p>

        {rec.pieces_jointes && rec.pieces_jointes.length > 0 && (
          <>
            <h3>Pièces jointes</h3>
            <ul className="pieces-jointes">
              {rec.pieces_jointes.map((piece, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="lien-piece-jointe"
                    onClick={() => ouvrirPieceJointe(piece.file_id)}
                  >
                    {piece.nom}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3>Historique</h3>
        <ul className="historique">
          {rec.historique
            .filter((h) => h.action !== "Réponse apportée")
            .map((h, i) => (
              <li key={i}>{h.date.slice(0, 19).replace("T", " ")} — {h.auteur} — {h.action}</li>
            ))}
        </ul>

        {(peutPrendreEnCharge || peutAffecter) && (
          <>
            <hr />
            <h3>Action</h3>
            <div className="colonnes">
              {peutPrendreEnCharge && (
                <div>
                  <p>Prise en charge</p>
                  <button type="button" onClick={prendreEnCharge} disabled={enCoursPriseEnCharge}>
                    {enCoursPriseEnCharge && <Spinner taille={14} />}
                    Prise en charge
                  </button>
                </div>
              )}
              {peutAffecter && (
                <div>
                  <p>Affecter un gestionnaire</p>
                  {gestionnaires.length === 0 ? (
                    <p className="info">Aucun gestionnaire disponible.</p>
                  ) : (
                    <>
                      <select value={gestionnaireChoisi} onChange={(e) => setGestionnaireChoisi(e.target.value)}>
                        <option value="">—</option>
                        {gestionnaires.map((g) => (
                          <option key={g.id} value={g.id}>{g.prenom} {g.nom}</option>
                        ))}
                      </select>
                      <button type="button" disabled={!gestionnaireChoisi || enCoursAffectation} onClick={affecter}>
                        {enCoursAffectation && <Spinner taille={14} />}
                        affecter
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {rec.reponses && rec.reponses.length > 0 && (
          <>
            <hr />
            <h3>Échanges</h3>
            <ul className="fil-reponses">
              {rec.reponses.map((m, i) => (
                <li
                  key={i}
                  className={`message-reponse ${m.role === "client" ? "message-client" : "message-staff"}`}
                >
                  <div className="message-entete">
                    <strong>{m.auteur}</strong>
                    <span className="message-date">{m.date.slice(0, 19).replace("T", " ")}</span>
                  </div>
                  <p className="message-texte">{m.texte}</p>
                  {m.pieces_jointes && m.pieces_jointes.length > 0 && (
                    <div className="attachments-message">
                      {m.pieces_jointes.map((piece, j) => (
                        <button
                          key={j}
                          type="button"
                          className="lien-piece-jointe"
                          onClick={() => ouvrirPieceJointe(piece.file_id)}
                        >
                          {piece.nom}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {(peutRepondre || peutCloturer) && (
          <>
            <hr />
            <h3>{estClient ? "Votre réponse" : "Répondre au client"}</h3>
            <div className="zone-reponse">
              {peutRepondre && (
                <>
                  <textarea
                    rows={4}
                    placeholder="Rédiger une réponse…"
                    value={reponseTexte}
                    onChange={(e) => setReponseTexte(e.target.value)}
                  />
                  <label className="champ-fichier-reponse">
                    Pièce jointe (optionnel)
                    <input
                      key={cleChampFichiersReponse}
                      type="file"
                      multiple
                      onChange={(e) => setReponseFichiers(Array.from(e.target.files))}
                    />
                  </label>
                </>
              )}
              <div className="boutons-ligne">
                {peutRepondre && (
                  <button
                    type="button"
                    className={confirmationReponse.enAttente ? "btn-confirmation" : ""}
                    onClick={() => confirmationReponse.declencher(envoyerReponse)}
                    disabled={enCoursReponse || !reponseTexte.trim()}
                  >
                    {enCoursReponse && <Spinner taille={14} />}
                    {confirmationReponse.enAttente ? "Êtes-vous sûr ?" : "Répondre"}
                  </button>
                )}
                {peutCloturer && (
                  <button
                    type="button"
                    className={confirmationCloture.enAttente ? "btn-confirmation" : ""}
                    onClick={() => confirmationCloture.declencher(cloturer)}
                    disabled={enCoursCloture}
                  >
                    {enCoursCloture && <Spinner taille={14} />}
                    {confirmationCloture.enAttente ? "Êtes-vous sûr ?" : "Clôturer"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="page page-pleine-largeur">
      <h1>Réclamation</h1>

      {erreur && <p className="erreur">{erreur}</p>}

      {reclamations && reclamations.length === 0 && (
        <p className="info">Aucune réclamation pour le moment.</p>
      )}

      {reclamations && reclamations.length > 0 && (
        <>
          <div className="barre-filtres">
            <input
              className="filtre-recherche"
              placeholder="Rechercher (numéro, description)…"
              value={recherche}
              onChange={(e) => changerFiltre(setRecherche)(e.target.value)}
            />
            <select value={filtreStatut} onChange={(e) => changerFiltre(setFiltreStatut)(e.target.value)}>
              <option value="">Tous les statuts</option>
              {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filtreMotif} onChange={(e) => changerFiltre(setFiltreMotif)(e.target.value)}>
              <option value="">Tous les motifs</option>
              {MOTIFS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <label className="filtre-date">
              Du
              <input type="date" value={dateDebut} onChange={(e) => changerFiltre(setDateDebut)(e.target.value)} />
            </label>
            <label className="filtre-date">
              Au
              <input type="date" value={dateFin} onChange={(e) => changerFiltre(setDateFin)(e.target.value)} />
            </label>
            {filtresActifs && (
              <button type="button" className="btn-secondaire" onClick={reinitialiserFiltres}>
                Réinitialiser
              </button>
            )}
            <button
              type="button"
              className="btn-succes"
              onClick={() => exporterExcel(reclamationsFiltrees)}
            >
              Exporter en Excel
            </button>
          </div>

          {reclamationsFiltrees.length === 0 ? (
            <p className="info">Aucune réclamation ne correspond à ces filtres.</p>
          ) : (
            <>
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Numéro</th>
                    <th>Statut</th>
                    <th>Motif</th>
                    <th>Reçue le</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {reclamationsPage.map((r) => (
                    <tr key={r.id} className="ligne-cliquable" onClick={() => ouvrirDetail(r)}>
                      <td>{r.numero_reclamation}</td>
                      <td><StatutPill statut={r.statut} /></td>
                      <td>{r.motif}</td>
                      <td>{r.date_reception.slice(0, 10)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondaire btn-petit"
                          onClick={(e) => { e.stopPropagation(); ouvrirDetail(r); }}
                        >
                          Détail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pied-liste">
                <p className="legende">
                  {reclamationsFiltrees.length} sur {reclamations.length} réclamation(s)
                </p>
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      type="button"
                      className="btn-secondaire"
                      disabled={pageBornee <= 1}
                      onClick={() => setPageActuelle(pageBornee - 1)}
                    >
                      ← Précédent
                    </button>
                    <span>Page {pageBornee} / {totalPages}</span>
                    <button
                      type="button"
                      className="btn-secondaire"
                      disabled={pageBornee >= totalPages}
                      onClick={() => setPageActuelle(pageBornee + 1)}
                    >
                      Suivant →
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Reclamations;

function exporterExcel(reclamations) {
  const lignes = reclamations.map((r) => ({
    "Numéro": r.numero_reclamation,
    "Statut": r.statut,
    "Type": r.type_reclamation,
    "Motif": r.motif,
    "Date réception": r.date_reception ? r.date_reception.slice(0, 10) : "",
  }));

  const feuille = XLSX.utils.json_to_sheet(lignes);
  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, "Réclamations");
  XLSX.writeFile(classeur, "reclamations.xlsx");
}
