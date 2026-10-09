import { useCallback, useEffect, useState } from 'react';
import { LEVEL_ORDER, LEVELS } from '../../shared/data.js';
import { admin, session } from '../lib/api.js';
import { lvlVar } from '../lib/format.js';
import ActivityChart from '../components/ActivityChart.jsx';

const ROLE_LABEL = { admin: 'Administrateur', demo: 'Compte démo · coordonnées masquées' };
const DEMO = { username: 'demo', password: 'diagnostic' };
const shortDate = (date) => new Date(date).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' });

/* #/admin : connexion, puis tableau de bord */
export default function Admin() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(session.get()));
  const [notice, setNotice] = useState('');

  // Session déjà ouverte dans cet onglet : on la vérifie auprès de l'API
  useEffect(() => {
    if (!session.get()) return undefined;
    let alive = true;
    admin.me()
      .then(({ user: u }) => alive && setUser(u))
      .catch(() => { session.clear(); })
      .finally(() => alive && setChecking(false));
    return () => { alive = false; };
  }, []);

  const logout = useCallback((message = '') => {
    session.clear();
    setUser(null);
    setNotice(message);
  }, []);

  return (
    <div className="view" id="view-admin">
      <section className="admin">
        <div className="container">
          {checking && <p className="admin-loading">Vérification de la session…</p>}
          {!checking && !user && <Login notice={notice} onLogin={(u) => { setNotice(''); setUser(u); }} />}
          {!checking && user && <Dashboard user={user} onLogout={logout} />}
        </div>
      </section>
    </div>
  );
}

/* ---------- Connexion ---------- */
function Login({ notice, onLogin }) {
  const [values, setValues] = useState({ username: '', password: '' });
  const [status, setStatus] = useState(null); // null, 'sending' ou 'slow'
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!values.username.trim() || !values.password) {
      setError('Indiquez l’identifiant et le mot de passe.');
      return;
    }
    setStatus('sending');
    setError('');
    try {
      const { token, user } = await admin.login(values.username.trim(), values.password, { onSlow: () => setStatus('slow') });
      session.set(token);
      onLogin(user);
    } catch (err) {
      setError(err.message);
      setStatus(null);
    }
  };

  const change = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  return (
    <div className="lead-grid admin-login">
      <div className="lead-copy">
        <p className="eyebrow">Espace admin</p>
        <h1 className="step-title">Le tableau de bord des diagnostics.</h1>
        <p>Statistiques, liste des diagnostics enregistrés et export pour Excel.</p>
        <div className="demo-note">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2" d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /></svg>
          <div>
            <p>Compte de démonstration : identifiant <strong>{DEMO.username}</strong>, mot de passe <strong>{DEMO.password}</strong>. Lecture seule, coordonnées masquées.</p>
            <button type="button" className="link-btn" onClick={() => { setValues(DEMO); setError(''); }}>Utiliser le compte de démonstration</button>
          </div>
        </div>
      </div>
      <form className="card lead-form" onSubmit={submit} noValidate>
        {notice && <p className="form-status" role="status">{notice}</p>}
        <label className="field">
          <span>Identifiant</span>
          <input name="username" autoComplete="username" value={values.username} onChange={change} />
        </label>
        <label className="field">
          <span>Mot de passe</span>
          <input name="password" type="password" autoComplete="current-password" value={values.password} onChange={change} />
        </label>
        <p className="form-error" role="alert">{error}</p>
        {status === 'slow' && <p className="form-status" role="status">Le serveur se réveille (hébergement gratuit) : cela peut prendre jusqu’à 30 secondes.</p>}
        <button className="btn btn-ink btn-lg btn-block" type="submit" disabled={Boolean(status)}>{status ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </div>
  );
}

/* ---------- Tableau de bord ---------- */
function Dashboard({ user, onLogout }) {
  const [simulations, setSimulations] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0); // incrémenté après une suppression
  const [exporting, setExporting] = useState(false);

  // Une session expirée renvoie vers la connexion ; les autres erreurs s'affichent
  const handle = useCallback((err) => {
    if (err.status === 401) onLogout('Votre session a expiré : reconnectez-vous.');
    else setError(err.message);
  }, [onLogout]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    admin.summary(simulations)
      .then((data) => { if (alive) { setSummary(data); setError(''); } })
      .catch((err) => alive && handle(err))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [simulations, refresh, handle]);

  const exportCsv = async () => {
    setExporting(true);
    try { await admin.exportCsv(simulations); } catch (err) { handle(err); } finally { setExporting(false); }
  };

  return (
    <>
      <header className="admin-head">
        <div>
          <p className="eyebrow">Espace admin</p>
          <h1 className="step-title">Tableau de bord</h1>
        </div>
        <div className="admin-user">
          <span className={`badge ${user.role === 'admin' ? 'badge-dominant' : 'badge-present'}`}>{ROLE_LABEL[user.role]}</span>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => onLogout()}>Se déconnecter</button>
        </div>
      </header>

      {/* Filtre : une seule rangée, au-dessus de tout ce qu'il concerne */}
      <div className="admin-filters">
        <label className="consent admin-switch">
          <input type="checkbox" checked={simulations} onChange={(e) => setSimulations(e.target.checked)} />
          <span>Inclure les diagnostics simulés</span>
        </label>
        <button className="btn btn-ink btn-sm" type="button" onClick={exportCsv} disabled={exporting}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2" d="M12 3v12m0 0l-5-5m5 5l5-5M4 19h16" /></svg>
          {exporting ? 'Export…' : 'Exporter pour Excel (CSV)'}
        </button>
      </div>

      {error && (
        <p className="form-error admin-error" role="alert">
          {error} <button type="button" className="link-btn" onClick={() => setRefresh((n) => n + 1)}>Réessayer</button>
        </p>
      )}

      {!summary && loading && <p className="admin-loading">Chargement du tableau de bord…</p>}
      {summary && (
        <div className={`admin-body is-animated${loading ? ' is-refreshing' : ''}`}>
          <Kpis totals={summary.totals} />
          <article className="card">
            <h2 className="card-title">Diagnostics par jour</h2>
            <p className="card-sub">Les 30 derniers jours{simulations ? ', diagnostics simulés compris' : ''}.</p>
            <ActivityChart days={summary.days} />
          </article>
          <div className="admin-grid">
            <LevelsCard levels={summary.levels} total={summary.totals.total} />
            <ThemesCard themes={summary.themes} />
          </div>
          <WeakestCard weakest={summary.weakest} />
          <DiagnosticsTable user={user} simulations={simulations} onError={handle} onChange={() => setRefresh((n) => n + 1)} />
        </div>
      )}
    </>
  );
}

function Kpis({ totals }) {
  const levelKey = LEVEL_ORDER[Math.min(3, Math.floor(totals.average_score / 25))];
  const tiles = [
    { label: 'Diagnostics', value: totals.total, sub: totals.simulated ? `dont ${totals.simulated} simulés` : 'réels uniquement' },
    { label: '30 derniers jours', value: totals.last30, sub: `dont ${totals.last7} ces 7 derniers jours` },
    { label: 'Score moyen', value: `${totals.average_score}/100`, sub: `soit le niveau ${LEVELS[levelKey].short}` },
    { label: 'Avec coordonnées', value: totals.with_contact, sub: 'e-mail ou téléphone laissé' },
  ];
  return (
    <div className="kpis">
      {tiles.map((t) => (
        <div className="kpi" key={t.label}>
          <p className="kpi-label">{t.label}</p>
          <p className="kpi-value">{t.value}</p>
          <p className="kpi-sub">{t.sub}</p>
        </div>
      ))}
    </div>
  );
}

function LevelsCard({ levels, total }) {
  return (
    <article className="card">
      <h2 className="card-title">Niveaux atteints</h2>
      <p className="card-sub">Répartition des entreprises par niveau de maturité.</p>
      <table className="dist">
        <thead><tr><th scope="col">Niveau</th><th scope="col">Part</th><th scope="col">Entreprises</th></tr></thead>
        <tbody>
          {LEVEL_ORDER.map((key) => {
            const share = total ? Math.round((levels[key] / total) * 100) : 0;
            return (
              <tr key={key} style={{ '--lvl': lvlVar(key) }}>
                <th scope="row"><span className="swatch" />{LEVELS[key].short}</th>
                <td><div className="bar-cell"><div className="bar" title={`${LEVELS[key].title} : ${levels[key]} (${share} %)`}><span style={{ '--w': `${share}%` }} /></div><span className="bar-val">{share} %</span></div></td>
                <td className="num">{levels[key]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </article>
  );
}

function ThemesCard({ themes }) {
  const sorted = [...themes].sort((a, b) => (a.average ?? 101) - (b.average ?? 101));
  return (
    <article className="card">
      <h2 className="card-title">Mise en place par thématique</h2>
      <p className="card-sub">Moyenne des entreprises, de la thématique la plus faible à la plus solide.</p>
      <table className="dist themes-chart">
        <thead><tr><th scope="col">Thématique</th><th scope="col">Mise en place</th><th scope="col">Moyenne</th></tr></thead>
        <tbody>
          {sorted.map((t) => (
            <tr key={t.title}>
              <th scope="row">{t.title}</th>
              <td><div className="bar bar-mono" title={`${t.title} : ${t.average ?? 0} %`}><span style={{ '--w': `${t.average ?? 0}%` }} /></div></td>
              <td className="num">{t.average == null ? '—' : `${t.average} %`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function WeakestCard({ weakest }) {
  return (
    <article className="card">
      <h2 className="card-title">Les 5 pratiques les moins mises en place</h2>
      <p className="card-sub">Les pistes d’accompagnement les plus utiles pour les entreprises.</p>
      <ol className="weak-list">
        {weakest.map((w) => (
          <li key={w.question}>
            <strong className="weak-rate">{w.rate}&nbsp;%</strong>
            <div>
              <p className="weak-meta">Question {w.question} · {w.theme}</p>
              <p className="weak-text">{w.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

/* ---------- Liste des diagnostics ---------- */
function DiagnosticsTable({ user, simulations, onError, onChange }) {
  const isAdmin = user.role === 'admin';
  const [filters, setFilters] = useState({ level: '', q: '', page: 1 });
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  // Recherche appliquée après une courte pause de frappe
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => (f.q === search.trim() ? f : { ...f, q: search.trim(), page: 1 })), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    admin.list({ simulations, ...filters })
      .then((d) => alive && setData(d))
      .catch((err) => alive && onError(err))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [simulations, filters, version, onError]);

  const remove = async (item) => {
    if (!window.confirm(`Supprimer le diagnostic de « ${item.company} » ? Cette action est définitive.`)) return;
    try {
      await admin.remove(item.id);
      setVersion((n) => n + 1);
      onChange();
    } catch (err) {
      onError(err);
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.total, data.page * data.pageSize) : 0;

  return (
    <article className="card">
      <div className="table-head">
        <div>
          <h2 className="card-title">Diagnostics</h2>
          <p className="card-sub">{isAdmin ? 'Du plus récent au plus ancien. Les coordonnées sont effacées automatiquement après 30 jours.' : 'Compte de démonstration : les coordonnées sont masquées par le serveur.'}</p>
        </div>
        <div className="table-filters">
          {isAdmin && (
            <input type="search" className="admin-input" placeholder="Entreprise, fonction, e-mail…" aria-label="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)} />
          )}
          <select className="admin-input" aria-label="Filtrer par niveau" value={filters.level} onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value, page: 1 }))}>
            <option value="">Tous les niveaux</option>
            {LEVEL_ORDER.map((key) => <option key={key} value={key}>{LEVELS[key].short}</option>)}
          </select>
        </div>
      </div>

      <div className={`table-scroll${loading && data ? ' is-refreshing' : ''}`}>
        <table className="admin-table">
          <thead><tr><th scope="col">Date</th><th scope="col">Entreprise</th><th scope="col">Contact</th><th scope="col">Niveau</th><th scope="col">Score</th>{isAdmin && <th scope="col"><span className="sr-only">Actions</span></th>}</tr></thead>
          <tbody>
            {data?.items.map((item, i) => (
              <tr key={item.id ?? `${item.createdAt}-${i}`}>
                <td className="nowrap">{shortDate(item.createdAt)}</td>
                <td>
                  {item.source === 'simulation' && <span className="muted">Diagnostic simulé</span>}
                  {item.source === 'web' && item.anonymized && <span className="muted">Coordonnées effacées</span>}
                  {item.source === 'web' && !item.anonymized && <><strong>{item.company}</strong><span className="sub">{item.jobTitle}</span></>}
                </td>
                <td className={item.email || item.phone ? undefined : 'no-contact'}>
                  {item.email || item.phone
                    ? <>{item.email && <span>{item.email}</span>}{item.phone && <span className="sub">{item.phone}</span>}</>
                    : <span className="muted">—</span>}
                </td>
                <td className="nowrap" style={{ '--lvl': lvlVar(item.level) }}><span className="swatch" />{LEVELS[item.level].short}</td>
                <td className="nowrap num-left">{item.score}/100</td>
                {isAdmin && (
                  <td className="row-actions">
                    {item.source === 'web' && item.id && (
                      <>
                        <a className="link-btn" href={`#/resultats/${item.id}`} target="_blank" rel="noopener">Voir</a>
                        <button type="button" className="link-btn danger" onClick={() => remove(item)}>Supprimer</button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {data && !data.items.length && (
              <tr><td colSpan={isAdmin ? 6 : 5} className="muted empty">Aucun diagnostic ne correspond.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > 0 && (
        <div className="pager">
          <span>{from}–{to} sur {data.total}</span>
          <button className="btn btn-ghost btn-sm" type="button" disabled={data.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>← Précédents</button>
          <button className="btn btn-ghost btn-sm" type="button" disabled={data.page >= pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Suivants →</button>
        </div>
      )}
    </article>
  );
}
