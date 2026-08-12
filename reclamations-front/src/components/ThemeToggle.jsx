function ThemeToggle({ theme, onBasculer, className = "" }) {
  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={onBasculer}
      aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

export default ThemeToggle;
