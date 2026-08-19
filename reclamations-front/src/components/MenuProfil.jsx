import { useEffect, useRef, useState } from "react";

function MenuProfil({ prenom, theme, onBasculerTheme, onVoirProfil, onDeconnecter }) {
  const [ouvert, setOuvert] = useState(false);
  const conteneurRef = useRef(null);

  useEffect(() => {
    if (!ouvert) return;
    function fermerSiExterieur(e) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", fermerSiExterieur);
    return () => document.removeEventListener("mousedown", fermerSiExterieur);
  }, [ouvert]);

  function choisir(action) {
    setOuvert(false);
    action();
  }

  return (
    <div className="barre-profil-flottante" ref={conteneurRef}>
      <span className="salutation-profil">Bonjour {prenom}</span>
      <button
        type="button"
        className="bouton-avatar-profil"
        onClick={() => setOuvert((v) => !v)}
        aria-label="Menu du profil"
        aria-expanded={ouvert}
      >
        {prenom ? prenom[0].toUpperCase() : "?"}
      </button>

      {ouvert && (
        <div className="menu-profil-dropdown">
          <button type="button" onClick={() => choisir(onVoirProfil)}>
            Profil
          </button>
          <button type="button" onClick={() => choisir(onBasculerTheme)}>
            {theme === "dark" ? "☀️ Thème clair" : "🌙 Thème sombre"}
          </button>
          <button type="button" onClick={() => choisir(onDeconnecter)}>
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

export default MenuProfil;
