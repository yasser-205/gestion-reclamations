function Spinner({ taille = 16 }) {
  return (
    <span
      className="spinner"
      style={{ width: taille, height: taille }}
      role="status"
      aria-label="Chargement"
    />
  );
}

export default Spinner;
