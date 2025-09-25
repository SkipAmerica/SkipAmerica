export async function apiFetch(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has("accept")) headers.set("accept", "application/json");
  return fetch(url, { ...init, headers });
}