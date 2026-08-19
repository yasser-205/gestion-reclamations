function Sidebar({ pages, page, onChangerPage }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-marque">
        <img src="/mark-cat.png" alt="CAT" className="sidebar-mark" />
        <h2>CAT</h2>
      </div>
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
