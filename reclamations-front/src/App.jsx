import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import "./App.css";
import { apiRequest } from "./api";
import { useTheme } from "./useTheme";
import ThemeToggle from "./components/ThemeToggle";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import MenuProfil from "./components/MenuProfil";
import Reclamations from "./pages/Reclamations";
import NouvelleReclamation from "./pages/NouvelleReclamation";
import Clients from "./pages/Clients";
import Dashboard from "./pages/Dashboard";
import Employes from "./pages/Employes";
import MonProfil from "./pages/MonProfil";
import VerifierEmail from "./pages/VerifierEmail";

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

  const tokenVerification = new URLSearchParams(window.location.search).get("verifier");
  if (tokenVerification) {
    return (
      <>
        <ToasterTheme />
        <VerifierEmail token={tokenVerification} />
      </>
    );
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

  const pages = ["Réclamations"];
  if (moi?.role === "client") pages.push("Nouvelle réclamation");
  if (moi?.role !== "client" && moi?.role !== "gestionnaire") pages.push("Clients");
  if (moi?.role === "gestionnaire" || moi?.role === "responsable" || moi?.role === "admin") pages.push("Tableau de bord");
  if (moi?.role === "admin") pages.push("Utilisateurs");

  return (
    <div className="app-shell">
      <ToasterTheme />
      {moi && (
        <MenuProfil
          prenom={moi.prenom}
          theme={theme}
          onBasculerTheme={basculerTheme}
          onVoirProfil={() => setPage("Mon profil")}
          onDeconnecter={deconnecter}
        />
      )}
      <Sidebar
        pages={pages}
        page={page}
        onChangerPage={setPage}
      />
      <main className="contenu">
        {page === "Réclamations" && (
          <Reclamations token={token} moi={moi} cibleReclamation={cibleReclamation} />
        )}
        {page === "Nouvelle réclamation" && moi?.role === "client" && (
          <NouvelleReclamation token={token} moi={moi} />
        )}
        {page === "Clients" && <Clients token={token} moi={moi} onVoirReclamation={voirReclamation} />}
        {page === "Tableau de bord" && <Dashboard token={token} />}
        {page === "Utilisateurs" && <Employes token={token} />}
        {page === "Mon profil" && (
          <MonProfil token={token} moi={moi} onRetour={() => setPage("Réclamations")} />
        )}
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
