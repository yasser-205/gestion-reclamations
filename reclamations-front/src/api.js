export const API_URL = "http://127.0.0.1:8000";

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let reponse;
  try {
    reponse = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, data: null };
  }

  let data = null;
  try {
    data = await reponse.json();
  } catch {
    // corps de réponse vide ou non-JSON
  }
  return { ok: reponse.ok, status: reponse.status, data };
}

export async function apiUpload(path, { champs = {}, fichiers = [], token, method = "POST" } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const formData = new FormData();
  Object.entries(champs).forEach(([cle, valeur]) => formData.append(cle, valeur));
  fichiers.forEach((fichier) => formData.append("fichiers", fichier));

  let reponse;
  try {
    reponse = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: formData,
    });
  } catch {
    return { ok: false, status: 0, data: null };
  }

  let data = null;
  try {
    data = await reponse.json();
  } catch {
    // corps de réponse vide ou non-JSON
  }
  return { ok: reponse.ok, status: reponse.status, data };
}

export async function apiOuvrirFichier(path, token) {
  try {
    const reponse = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!reponse.ok) return false;
    const blob = await reponse.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch {
    return false;
  }
}

export function messageErreur(status, defaut = "") {
  if (status === 0) return "Impossible de joindre l'API.";
  if (defaut) return defaut;
  return `Erreur (${status})`;
}
