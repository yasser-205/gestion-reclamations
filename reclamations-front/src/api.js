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

export function messageErreur(status, defaut = "") {
  if (status === 0) return "Impossible de joindre l'API.";
  if (defaut) return defaut;
  return `Erreur (${status})`;
}
