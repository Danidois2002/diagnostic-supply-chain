/* =========================================================
   Client de l'API (dossier api/ du dépôt, hébergée sur Render)
   Sans API joignable, le diagnostic fonctionne quand même :
   le résultat s'affiche depuis le navigateur, sans lien ni comparaison.
   ========================================================= */
export const API_URL = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3000'
  : 'https://diagnostic-supply-chain-api.onrender.com';

const SLOW_MS = 2500; // l'hébergement gratuit met l'API en veille : le premier appel peut prendre ~30 s

/* Session de l'espace admin : gardée le temps de l'onglet */
const TOKEN_KEY = 'diagnostic-admin-token';
export const session = {
  get() { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(token) { try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* navigation privée */ } },
  clear() { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

async function request(method, path, body, { onSlow, auth = false, raw = false } = {}) {
  const slow = onSlow ? setTimeout(onSlow, SLOW_MS) : null;
  const headers = { Accept: raw ? 'text/csv' : 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && session.get()) headers.Authorization = `Bearer ${session.get()}`;
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    const error = new Error('Le serveur ne répond pas. Réessayez dans un instant.');
    error.status = 0;
    throw error;
  } finally {
    clearTimeout(slow);
  }
  if (res.ok && raw) return res.blob();
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'Une erreur est survenue.');
    error.status = res.status;
    error.details = data.details;
    throw error;
  }
  return data;
}

/* Réponses du navigateur ({ 1: '2', … }) ⇄ tableau de 27 nombres pour l'API */
export const answersToList = (answers) => Array.from({ length: 27 }, (_, i) => Number(answers[i + 1]));
export const listToAnswers = (list) => Object.fromEntries(list.map((value, i) => [i + 1, String(value)]));

let statsPromise = null;

export function saveDiagnostic(lead, answers, options) {
  const body = {
    lead: { company: lead.entreprise, jobTitle: lead.fonction, email: lead.email || undefined, phone: lead.gsm || undefined },
    answers: answersToList(answers),
    consent: true,
  };
  return request('POST', '/api/diagnostics', body, options).then((saved) => {
    statsPromise = null; // la comparaison inclut maintenant ce diagnostic
    return saved;
  });
}

export const getDiagnostic = (id, options) => request('GET', `/api/diagnostics/${encodeURIComponent(id)}`, undefined, options);

/* Statistiques anonymes : chargées une fois par visite */
export function getStats() {
  statsPromise ??= request('GET', '/api/stats').catch((error) => { statsPromise = null; throw error; });
  return statsPromise;
}

/* ---------- Espace admin ---------- */
const scope = (simulations) => `simulations=${simulations ? 1 : 0}`;

export const admin = {
  login: (username, password, options) => request('POST', '/api/auth/login', { username, password }, options),
  me: (options) => request('GET', '/api/auth/me', undefined, { ...options, auth: true }),
  summary: (simulations) => request('GET', `/api/admin/summary?${scope(simulations)}`, undefined, { auth: true }),
  list: ({ simulations, level, q, page }) => {
    const params = new URLSearchParams({ simulations: simulations ? '1' : '0', page: String(page) });
    if (level) params.set('level', level);
    if (q) params.set('q', q);
    return request('GET', `/api/admin/diagnostics?${params}`, undefined, { auth: true });
  },
  remove: (id) => request('DELETE', `/api/admin/diagnostics/${encodeURIComponent(id)}`, undefined, { auth: true }),
  /* Télécharge l'export CSV (le jeton passe par l'en-tête, d'où le passage par un Blob) */
  async exportCsv(simulations) {
    const blob = await request('GET', `/api/admin/export.csv?${scope(simulations)}`, undefined, { auth: true, raw: true });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: `diagnostics-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
