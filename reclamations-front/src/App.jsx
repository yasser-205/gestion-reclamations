import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import "./App.css";
import { apiRequest } from "./api";
import { useTheme } from "./useTheme";
import ThemeToggle from "./components/ThemeToggle";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import Reclamations from "./pages/Reclamations";
import NouvelleReclamation from "./pages/NouvelleReclamation";
import Clients from "./pages/Clients";
import Dashboard from "./pages/Dashboard";
import Employes from "./pages/Employes";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [moi, setMoi] = useState(null);
  const [page, setPage] = useState("Réclamations");
  const [cibleReclamation, setCibleReclamation] = useState(null);
  const [theme, basculerTheme] = useTheme();

  function voirReclamation(id) {
    setCibleReclamation({ id, cle: Date.now() });
    setPage("Réclamations");
  }

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    apiRequest("/auth/me", { token }).then((rep) => {
      if (ignore) return;
      if (rep.ok) setMoi(rep.data);
      else if (rep.status === 401) deconnecter();
    });
    return () => { ignore = true; };
  }, [token]);

  function seConnecter(nouveauToken) {
    localStorage.setItem("token", nouveauToken);
    setToken(nouveauToken);
    setPage("Réclamations");
  }

  function deconnecter() {
    localStorage.removeItem("token");
    setToken(null);
    setMoi(null);
  }

  if (!token) {
    return (
      <>
        <ToasterTheme />
        <ThemeToggle theme={theme} onBasculer={basculerTheme} className="theme-toggle-flottant" />
        <Login onConnecte={seConnecter} />
      </>
    );
  }

  const pages = ["Réclamations", "Nouvelle réclamation"];
  if (moi?.role !== "client") pages.push("Clients");
  if (moi?.role === "responsable" || moi?.role === "admin") pages.push("Tableau de bord");
  if (moi?.role === "admin") pages.push("Employés");

  return (
    <div className="app-shell">
      <ToasterTheme />
      <Sidebar
        pages={pages}
        page={page}
        onChangerPage={setPage}
        onDeconnecter={deconnecter}
        theme={theme}
        onBasculerTheme={basculerTheme}
      />
      <main className="contenu">
        {page === "Réclamations" && (
          <Reclamations token={token} moi={moi} cibleReclamation={cibleReclamation} />
        )}
        {page === "Nouvelle réclamation" && <NouvelleReclamation token={token} moi={moi} />}
        {page === "Clients" && <Clients token={token} onVoirReclamation={voirReclamation} />}
        {page === "Tableau de bord" && <Dashboard token={token} />}
        {page === "Employés" && <Employes token={token} />}
      </main>
    </div>
  );
}

function ToasterTheme() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "var(--bg)",
          color: "var(--text-h)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          boxShadow: "var(--ombre)",
          fontSize: "14px",
        },
        success: { iconTheme: { primary: "var(--succes)", secondary: "var(--bg)" } },
        error: { iconTheme: { primary: "var(--danger)", secondary: "var(--bg)" } },
      }}
    />
  );
}

export default App;
