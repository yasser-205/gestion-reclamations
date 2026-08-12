import { useEffect, useState } from "react";

function themeInitial() {
  const stocke = localStorage.getItem("theme");
  if (stocke === "light" || stocke === "dark") return stocke;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState(themeInitial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  function basculer() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return [theme, basculer];
}
