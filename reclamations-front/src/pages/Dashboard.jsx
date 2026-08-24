import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { apiRequest, messageErreur } from "../api";
import Spinner from "../components/Spinner";

const SERIE = { light: "#1d7e97", dark: "#39bee0" };
const CHROME = {
  light: { grille: "#d7e3e5", axe: "#c3d4d7", texte: "#55666d", texteH: "#2a2d30", surface: "#ffffff", bordure: "#d7e3e5" },
  dark: { grille: "#253f49", axe: "#3a5560", texte: "#9fb4bc", texteH: "#eaf2f3", surface: "#0d1a20", bordure: "#253f49" },
};

const MOIS_ABBR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function formatMois(cle) {
  const [annee, mois] = cle.split("-");
  return `${MOIS_ABBR[parseInt(mois, 10) - 1]} ${annee}`;
}

function formatJour(cle) {
  const [, , jour] = cle.split("-");
  return `${parseInt(jour, 10)}`;
}

function themeActuel() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function Dashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [noms, setNoms] = useState({});
  const [erreur, setErreur] = useState("");
  const [theme, setTheme] = useState(themeActuel);
  const [filtreAnnee, setFiltreAnnee] = useState("");
  const [filtreMois, setFiltreMois] = useState("");

  useEffect(() => {
    const observateur = new MutationObserver(() => setTheme(themeActuel()));
    observateur.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observateur.disconnect();
  }, []);

  useEffect(() => {
    let ignore = false;
    const parametres = new URLSearchParams();
    if (filtreAnnee) parametres.set("annee", filtreAnnee);
    if (filtreAnnee && filtreMois) parametres.set("mois", filtreMois);
    const suffixe = parametres.toString() ? `?${parametres.toString()}` : "";

    Promise.all([
      apiRequest(`/reclamation/stat${suffixe}`, { token }),
      apiRequest("/utilisateurs", { token }),
    ]).then(([repStats, repUsers]) => {
      if (ignore) return;
      if (repStats.ok) {
        setStats(repStats.data);
        setErreur("");
      } else {
        setErreur(messageErreur(repStats.status));
      }
      if (repUsers.ok) {
        const table = {};
        repUsers.data.forEach((u) => {
          table[u.id] = `${u.prenom} ${u.nom}`;
        });
        setNoms(table);
      }
    });
    return () => { ignore = true; };
  }, [token, filtreAnnee, filtreMois]);

  if (erreur) return <p className="erreur">{erreur}</p>;
  if (!stats) {
    return <p className="chargement-page"><Spinner /> Chargement…</p>;
  }

  const parJour = stats.granularite_evolution === "jour";
  const evolution = Object.entries(stats.par_mois || {})
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([cle, valeur]) => ({ mois: parJour ? formatJour(cle) : formatMois(cle), valeur }));

  function changerAnnee(valeur) {
    setFiltreAnnee(valeur);
    setFiltreMois("");
  }

  return (
    <div className="page">
      <div className="entete-page entete-page-action">
        <h1>Tableau de bord</h1>
        <div className="barre-filtres">
          <select value={filtreAnnee} onChange={(e) => changerAnnee(e.target.value)}>
            <option value="">Toutes les années</option>
            {(stats.annees_disponibles || []).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={filtreMois}
            onChange={(e) => setFiltreMois(e.target.value)}
            disabled={!filtreAnnee}
          >
            <option value="">Tous les mois</option>
            {MOIS_NOMS.map((nom, i) => (
              <option key={nom} value={i + 1}>{nom}</option>
            ))}
          </select>
          {(filtreAnnee || filtreMois) && (
            <button type="button" className="btn-secondaire" onClick={() => changerAnnee("")}>
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="grille-kpi">
        <div className="tuile-kpi">
          <p className="etiquette">Réclamations au total</p>
          <p className="valeur">{stats.total}</p>
        </div>
        <div className="tuile-kpi">
          <p className="etiquette">Délai moyen de traitement</p>
          <p className="valeur">{stats.delai_moyen} <span className="unite">j</span></p>
        </div>
      </div>

      <div className="bloc-stat bloc-evolution">
        <h2>{parJour ? `Évolution par jour — ${MOIS_NOMS[filtreMois - 1]}` : "Évolution par mois de réception"}</h2>
        {evolution.length === 0 ? (
          <p className="info">Aucune donnée.</p>
        ) : (
          <BlocEvolution data={evolution} theme={theme} />
        )}
      </div>

      <div className="grille-stats">
        <BlocStat titre="Par statut" data={stats.par_statut} theme={theme} />
        <BlocStat titre="Par motif" data={stats.par_motif} theme={theme} />
        <BlocStat titre="Par gestionnaire" data={stats.par_gestionnaire} noms={noms} theme={theme} />
      </div>
    </div>
  );
}

function BlocEvolution({ data, theme }) {
  const couleur = SERIE[theme];
  const chrome = CHROME[theme];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid vertical={false} stroke={chrome.grille} />
        <XAxis
          dataKey="mois"
          tick={{ fill: chrome.texte, fontSize: 12 }}
          axisLine={{ stroke: chrome.axe }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: chrome.texte, fontSize: 12 }}
          axisLine={{ stroke: chrome.axe }}
          tickLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            background: chrome.surface,
            border: `1px solid ${chrome.bordure}`,
            borderRadius: 8,
            fontSize: 13,
          }}
          labelStyle={{ color: chrome.texteH }}
        />
        <Area
          type="monotone"
          dataKey="valeur"
          stroke={couleur}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={couleur}
          fillOpacity={0.1}
          dot={{ r: 4, fill: couleur, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function BlocStat({ titre, data, noms, theme }) {
  const couleur = SERIE[theme];
  const chrome = CHROME[theme];

  const entrees = Object.entries(data).map(([cle, valeur]) => ({
    nom: noms ? (noms[cle] || cle) : cle,
    valeur,
  }));

  return (
    <div className="bloc-stat">
      <h2>{titre}</h2>
      {entrees.length === 0 ? (
        <p className="info">Aucune donnée.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(120, entrees.length * 40)}>
          <BarChart data={entrees} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 4 }}>
            <CartesianGrid horizontal={false} stroke={chrome.grille} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: chrome.texte, fontSize: 12 }}
              axisLine={{ stroke: chrome.axe }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="nom"
              width={110}
              tick={{ fill: chrome.texte, fontSize: 12 }}
              axisLine={{ stroke: chrome.axe }}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: chrome.grille, opacity: 0.4 }}
              contentStyle={{
                background: chrome.surface,
                border: `1px solid ${chrome.bordure}`,
                borderRadius: 8,
                fontSize: 13,
              }}
              labelStyle={{ color: chrome.texteH }}
            />
            <Bar dataKey="valeur" fill={couleur} radius={[0, 4, 4, 0]} barSize={20} maxBarSize={20}>
              <LabelList dataKey="valeur" position="right" fill={chrome.texte} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default Dashboard;
