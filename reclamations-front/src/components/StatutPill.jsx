const LABELS_STATUT = {
  nouvelle: "Nouvelle",
  affectee: "Affectée",
  en_cours: "En cours",
  en_attente_client: "Attente client",
  cloturee: "Clôturée",
};

function StatutPill({ statut }) {
  return <span className={`pill pill-${statut}`}>{LABELS_STATUT[statut] || statut}</span>;
}

export default StatutPill;
