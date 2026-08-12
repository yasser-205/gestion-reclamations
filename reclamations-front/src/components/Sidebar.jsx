import ThemeToggle from "./ThemeToggle";

function Sidebar({ pages, page, onChangerPage, onDeconnecter, theme, onBasculerTheme }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-entete">
        <h2>Menu</h2>
        <ThemeToggle theme={theme} onBasculer={onBasculerTheme} />
      </div>
      <button type="button" className="btn-secondaire" onClick={onDeconnecter}>
        Se déconnecter
      </button>
      <nav className="nav">
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={p === page ? "actif" : ""}
            onClick={() => onChangerPage(p)}
          >
            {p}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
