import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiRequest, messageErreur } from "../api";
import Spinner from "../components/Spinner";

const STATUTS = [
  "nouvelle",
  "affectee",
  "en_cours",
  "en_attente_client",
  "resolue",
  "cloturee",
  "rejetee",
];

const STATUTS_CLOTURES = ["resolue", "cloturee", "rejetee"];
const MOTIFS = ["remboursement", "delai", "prime", "contrat", "service", "autre"];
const TAILLE_PAGE = 10;

function etatEcheance(r) {
  if (!r.date_echeance || STATUTS_CLOTURES.includes(r.statut)) return null;
  const joursRestants = (new Date(r.date_echeance) - new Date()) / 86_400_000;
  if (joursRestants < 0) return "depassee";
  if (joursRestants <= 3) return "proche";
  return null;
}

function BadgeEcheance({ reclamation }) {
  const etat = etatEcheance(reclamation);
  const date = reclamation.date_echeance ? reclamation.date_echeance.slice(0, 10) : "—";
  if (!etat) return <span>{date}</span>;
  return (
    <span className={`badge-echeance badge-${etat}`}>
      {date} · {etat === "depassee" ? "En retard" : "Bientôt"}
    </span>
  );
}

function Reclamations({ token, moi, cibleReclamation }) {
  const role = moi?.role;
  const estClient = role === "client";
  const peutChangerStatut = ["gestionnaire", "responsable", "admin"].includes(role);
  const peutAffecter = ["responsable", "admin"].includes(role);
  const peutRepondre = peutChangerStatut;
  const [reclamations, setReclamations] = useState(null);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [erreur, setErreur] = useState("");

  const [selectionId, setSelectionId] = useState("");
  const [modifierOuvert, setModifierOuvert] = useState(false);
  const [nouveauStatut, setNouveauStatut] = useState(STATUTS[0]);
  const [gestionnaireChoisi, setGestionnaireChoisi] = useState("");
  const [reponseTexte, setReponseTexte] = useState("");
  const [enCoursStatut, setEnCoursStatut] = useState(false);
  const [enCoursAffectation, setEnCoursAffectation] = useState(false);
  const [enCoursSuppression, setEnCoursSuppression] = useState(false);
  const [enCoursReponse, setEnCoursReponse] = useState(false);
  const [recharge, setRecharge] = useState(0);

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtreMotif, setFiltreMotif] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [pageActuelle, setPageActuelle] = useState(1);
  const [cleCibleTraitee, setCleCibleTraitee] = useState(null);
  const [triEcheance, setTriEcheance] = useState(null);

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
      setNouveauStatut(cible.statut);
      setGestionnaireChoisi("");
      setReponseTexte(cible.reponse || "");
      setModifierOuvert(false);
    }
    setCleCibleTraitee(cibleReclamation.cle);
  }

  const nomsGestionnaires = Object.fromEntries(
    utilisateurs.map((u) => [u.id, `${u.prenom} ${u.nom}`])
  );
  const gestionnaires = utilisateurs.filter((u) => u.role === "gestionnaire");

  const rec = reclamations?.find((r) => r.id === selectionId) || null;

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

  const reclamationsTriees = triEcheance
    ? [...reclamationsFiltrees].sort((a, b) => {
        if (!a.date_echeance && !b.date_echeance) return 0;
        if (!a.date_echeance) return 1;
        if (!b.date_echeance) return -1;
        const diff = new Date(a.date_echeance) - new Date(b.date_echeance);
        return triEcheance === "recent" ? -diff : diff;
      })
    : reclamationsFiltrees;

  const totalPages = Math.max(1, Math.ceil(reclamationsTriees.length / TAILLE_PAGE));
  const pageBornee = Math.min(pageActuelle, totalPages);
  const reclamationsPage = reclamationsTriees.slice(
    (pageBornee - 1) * TAILLE_PAGE,
    pageBornee * TAILLE_PAGE
  );

  function changerFiltre(setter) {
    return (valeur) => {
      setter(valeur);
      setPageActuelle(1);
    };
  }

  function basculerTriEcheance() {
    setTriEcheance((t) => (t === "recent" ? "ancien" : "recent"));
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
    setNouveauStatut(r.statut);
    setGestionnaireChoisi("");
    setReponseTexte(r.reponse || "");
    setModifierOuvert(false);
  }

  function retourListe() {
    setSelectionId("");
  }

  async function appliquerStatut() {
    setEnCoursStatut(true);
    const rep = await apiRequest(`/reclamation/${rec.id}/statut`, {
      method: "PATCH",
      token,
      body: { statut: nouveauStatut },
    });
    setEnCoursStatut(false);
    if (rep.ok) {
      toast.success("Statut mis à jour.");
      setRecharge((n) => n + 1);
    } else {
      toast.error(messageErreur(rep.status));
    }
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
    const rep = await apiRequest(`/reclamation/${rec.id}/reponse`, {
      method: "PATCH",
      token,
      body: { reponse: reponseTexte },
    });
    setEnCoursReponse(false);
    if (rep.ok) {
      toast.success("Réponse envoyée.");
      setRecharge((n) => n + 1);
    } else {
      toast.error(messageErreur(rep.status));
    }
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer la réclamation ${rec.numero_reclamation} ? Cette action est irréversible.`)) {
      return;
    }
    setEnCoursSuppression(true);
    const rep = await apiRequest(`/reclamation/${rec.id}`, { method: "DELETE", token });
    setEnCoursSuppression(false);
    if (rep.ok) {
      toast.success("Réclamation supprimée.");
      setSelectionId("");
      setRecharge((n) => n + 1);
    } else {
      toast.error(messageErreur(rep.status));
    }
  }

  if (!reclamations && !erreur) {
    return (
      <div className="page">
        <h1>Réclamation</h1>
        <p className="chargement-page"><Spinner /> Chargement…</p>
      </div>
    );
  }

  if (rec) {
    return (
      <div className="page">
        <div className="entete-detail">
          <button type="button" className="btn-secondaire" onClick={retourListe}>← Retour à la liste</button>
          <div className="boutons-ligne">
            {peutChangerStatut && !modifierOuvert && (
              <button type="button" className="btn-secondaire" onClick={() => setModifierOuvert(true)}>
                Modifier les détails
              </button>
            )}
            {!estClient && (
              <button type="button" className="btn-danger" onClick={supprimer} disabled={enCoursSuppression}>
                {enCoursSuppression && <Spinner taille={14} />}
                Supprimer la réclamation
              </button>
            )}
          </div>
        </div>
        <h1>{rec.numero_reclamation}</h1>

        {modifierOuvert ? (
          <FormulaireModification
            rec={rec}
            token={token}
            onAnnule={() => setModifierOuvert(false)}
            onEnregistre={() => {
              setModifierOuvert(false);
              setRecharge((n) => n + 1);
            }}
          />
        ) : (
          <>
            <div className="colonnes">
              <div>
                <p><strong>Numéro :</strong> {rec.numero_reclamation}</p>
                <p><strong>Statut :</strong> {rec.statut}</p>
                <p><strong>Type :</strong> {rec.type_reclamation}</p>
                <p><strong>Priorité :</strong> {rec.priorite}</p>
                <p><strong>Motif :</strong> {rec.motif}</p>
                {rec.type_reclamation === "production" && (
                  <>
                    <p><strong>Attestation :</strong> {rec.attestation || "—"}</p>
                    <p><strong>Matriculation :</strong> {rec.matriculation || "—"}</p>
                  </>
                )}
              </div>
              <div>
                <p><strong>Canal :</strong> {rec.canal}</p>
                <p><strong>Contrat :</strong> {rec.contrat || "—"}</p>
                <p><strong>Reçue le :</strong> {rec.date_reception.slice(0, 10)}</p>
                <p><strong>Échéance :</strong> <BadgeEcheance reclamation={rec} /></p>
                <p><strong>Gestionnaire :</strong> {nomsGestionnaires[rec.gestionnaire_id] || "non affecté"}</p>
              </div>
            </div>

            <p><strong>Description :</strong> {rec.description}</p>

            {rec.reponse && (
              <>
                <h3>Réponse</h3>
                <p className="reponse-existante">{rec.reponse}</p>
              </>
            )}
          </>
        )}

        <h3>Historique</h3>
        <ul className="historique">
          {rec.historique.map((h, i) => (
            <li key={i}>{h.date.slice(0, 19).replace("T", " ")} — {h.auteur} — {h.action}</li>
          ))}
        </ul>

        {(peutChangerStatut || peutAffecter) && (
          <>
            <hr />
            <h3>Action</h3>
            <div className="colonnes">
              {peutChangerStatut && (
                <div>
                  <p>Changer le statut</p>
                  <select value={nouveauStatut} onChange={(e) => setNouveauStatut(e.target.value)}>
                    {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button type="button" onClick={appliquerStatut} disabled={enCoursStatut}>
                    {enCoursStatut && <Spinner taille={14} />}
                    Appliquer le statut
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

        {peutRepondre && (
          <>
            <hr />
            <h3>Répondre au client</h3>
            <div className="zone-reponse">
              <textarea
                rows={4}
                placeholder="Rédiger une réponse…"
                value={reponseTexte}
                onChange={(e) => setReponseTexte(e.target.value)}
              />
              <button
                type="button"
                onClick={envoyerReponse}
                disabled={enCoursReponse || !reponseTexte.trim()}
              >
                {enCoursReponse && <Spinner taille={14} />}
                Répondre
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="page">
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
              className="btn-secondaire"
              onClick={() => exporterCSV(reclamationsTriees)}
            >
              Exporter en CSV
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
                    <th>Priorité</th>
                    <th>Motif</th>
                    <th>Reçue le</th>
                    <th
                      className="colonne-triable"
                      onClick={basculerTriEcheance}
                      title="Trier par échéance"
                    >
                      Échéance {triEcheance === "recent" ? "↓" : triEcheance === "ancien" ? "↑" : ""}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reclamationsPage.map((r) => {
                    const etat = etatEcheance(r);
                    const classeLigne = etat ? `ligne-cliquable ligne-echeance-${etat}` : "ligne-cliquable";
                    return (
                      <tr key={r.id} className={classeLigne} onClick={() => ouvrirDetail(r)}>
                        <td>{r.numero_reclamation}</td>
                        <td>{r.statut}</td>
                        <td>{r.priorite}</td>
                        <td>{r.motif}</td>
                        <td>{r.date_reception.slice(0, 10)}</td>
                        <td><BadgeEcheance reclamation={r} /></td>
                      </tr>
                    );
                  })}
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

function FormulaireModification({ rec, token, onAnnule, onEnregistre }) {
  const [contrat, setContrat] = useState(rec.contrat || "");
  const [canal, setCanal] = useState(rec.canal);
  const [motif, setMotif] = useState(rec.motif);
  const [priorite, setPriorite] = useState(rec.priorite);
  const [description, setDescription] = useState(rec.description);
  const [attestation, setAttestation] = useState(rec.attestation || "");
  const [matriculation, setMatriculation] = useState(rec.matriculation || "");
  const [enCours, setEnCours] = useState(false);

  async function enregistrer() {
    if (!description.trim()) {
      toast.error("La description est obligatoire.");
      return;
    }
    setEnCours(true);
    const rep = await apiRequest(`/reclamation/${rec.id}`, {
      method: "PATCH",
      token,
      body: {
        contrat: contrat || null,
        canal,
        motif,
        priorite,
        description,
        attestation: attestation || null,
        matriculation: matriculation || null,
      },
    });
    setEnCours(false);
    if (rep.ok) {
      toast.success("Détails mis à jour.");
      onEnregistre();
    } else {
      toast.error(messageErreur(rep.status));
    }
  }

  return (
    <>
      <div className="colonnes">
        <div>
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
              {MOTIFS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label>
            Priorité
            <select value={priorite} onChange={(e) => setPriorite(e.target.value)}>
              <option value="basse">Basse</option>
              <option value="moyenne">Moyenne</option>
              <option value="haute">Haute</option>
              <option value="urgente">Urgente</option>
            </select>
          </label>
        </div>
        <div>
          <label>
            Numéro de contrat
            <input value={contrat} onChange={(e) => setContrat(e.target.value)} />
          </label>
          {rec.type_reclamation === "production" && (
            <>
              <label>
                Attestation
                <input value={attestation} onChange={(e) => setAttestation(e.target.value)} />
              </label>
              <label>
                Matriculation
                <input value={matriculation} onChange={(e) => setMatriculation(e.target.value)} />
              </label>
            </>
          )}
        </div>
      </div>

      <label>
        Description
        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <div className="boutons-ligne">
        <button type="button" className="btn-primaire" onClick={enregistrer} disabled={enCours}>
          {enCours && <Spinner taille={14} />}
          Enregistrer
        </button>
        <button type="button" className="btn-secondaire" onClick={onAnnule}>
          Annuler
        </button>
      </div>
    </>
  );
}

export default Reclamations;

function exporterCSV(reclamations) {
  const entetes = ["Numéro", "Statut", "Type", "Priorité", "Motif", "Date réception"];

  const lignes = reclamations.map((r) => [
    r.numero_reclamation,
    r.statut,
    r.type_reclamation,
    r.priorite,
    r.motif,
    r.date_reception ? r.date_reception.slice(0, 10) : "",
  ]);

  const contenu = [entetes, ...lignes]
    .map((ligne) => ligne.map((c) => `"${c}"`).join(","))
    .join("\n");

  const blob = new Blob([contenu], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = "reclamations.csv";
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
}
