/* =========================================================
   Client de l'API (dossier api/ du dépôt, hébergée sur Render)
   Sans API joignable, le diagnostic fonctionne quand même :
   le résultat s'affiche depuis le navigateur, sans lien ni comparaison.
   ========================================================= */
export const API_URL = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3000'
  : 'https://diagnostic-supply-chain-api.onrender.com';

const SLOW_MS = 2500; // l'hébergement gratuit met l'API en veille : le premier appel peut prendre ~30 s

async function request(method, path, body, { onSlow } = {}) {
  const slow = onSlow ? setTimeout(onSlow, SLOW_MS) : null;
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    const error = new Error('Le serveur ne répond pas. Réessayez dans un instant.');
    error.status = 0;
    throw error;
  } finally {
    clearTimeout(slow);
  }
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
