import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LEVEL_ORDER, LEVELS } from '../../shared/data.js';
import { computeResults, SAMPLE_ANSWERS, THRESHOLD } from '../../shared/scoring.js';
import { getDiagnostic, listToAnswers } from '../lib/api.js';
import { lvlVar, pct } from '../lib/format.js';
import { useDiagnostic } from '../state/DiagnosticContext.jsx';
import { useSheet } from '../state/SheetContext.jsx';
import CompareCard, { useStats } from '../components/CompareCard.jsx';
import { SaveOffer, ShareLink } from '../components/ShareCard.jsx';
import { RiskList } from '../components/ui.jsx';

const BADGES = {
  base: <span className="badge badge-present">✓ Acquis</span>,
  validated: <span className="badge badge-dominant">✓ Validé</span>,
  pending: <span className="badge badge-present" title="Validez d'abord le niveau précédent">◐ En attente</span>,
  progress: <span className="badge badge-minimal">○ Non atteint</span>,
};

const longDate = (date) => new Date(date).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' });

/* #/resultats (diagnostic de cette personne) et #/exemple (réponses fictives) */
export default function Results({ sample = false }) {
  const { state, isComplete } = useDiagnostic();
  const saveError = useLocation().state?.saveError;

  if (sample) return <ResultView mode="sample" answers={SAMPLE_ANSWERS} company="Entreprise exemple" />;
  if (!isComplete) return <Navigate to="/diagnostic" replace />;
  if (state.savedId) return <Navigate to={`/resultats/${state.savedId}`} replace />;
  return <ResultView mode="local" answers={state.answers} company={state.lead?.entreprise} saveError={saveError} />;
}

/* #/resultats/:id : diagnostic enregistré, ouvert par son lien */
export function SavedResult() {
  const { id } = useParams();
  const { state, isComplete } = useDiagnostic();
  const own = state.savedId === id && isComplete; // c'est le sien : tout est déjà dans le navigateur
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (own) return undefined;
    let alive = true;
    setData(null);
    setError(null);
    setSlow(false);
    getDiagnostic(id, { onSlow: () => alive && setSlow(true) })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e));
    return () => { alive = false; };
  }, [id, own, attempt]);

  if (own) return <ResultView mode="own" answers={state.answers} company={state.lead?.entreprise} savedId={id} />;
  if (data) return <ResultView mode="shared" answers={listToAnswers(data.answers)} company={data.company} savedId={id} createdAt={data.createdAt} />;

  return (
    <div className="view" id="view-results">
      <section className="quiz-step loader">
        {error ? (
          <>
            <p>{error.status === 404 ? 'Ce diagnostic est introuvable.' : "Le diagnostic n'a pas pu être chargé."}</p>
            <p className="loader-note">{error.status === 404 ? 'Le lien est peut-être incomplet.' : error.message}</p>
            <div className="loader-actions">
              {error.status !== 404 && <button className="btn btn-ink" type="button" onClick={() => setAttempt((n) => n + 1)}>Réessayer</button>}
              <Link className="btn btn-yellow" to="/diagnostic">Faire mon diagnostic</Link>
            </div>
          </>
        ) : (
          <>
            <p>Chargement du diagnostic…</p>
            {slow && <p className="loader-note">Le serveur se réveille (hébergement gratuit) : cela peut prendre jusqu'à 30 secondes.</p>}
          </>
        )}
      </section>
    </div>
  );
}

/* Page de résultats. mode : 'local' (pas enregistré), 'own' (enregistré, le sien),
   'shared' (ouvert depuis un lien partagé) ou 'sample' (exemple fictif) */
function ResultView({ mode, answers, company, savedId, createdAt, saveError }) {
  const { reset } = useDiagnostic();
  const { openSheet, openLevel } = useSheet();
  const navigate = useNavigate();
  const stats = useStats();
  const [animated, setAnimated] = useState(false);
  const visitor = mode === 'sample' || mode === 'shared'; // ce n'est pas son propre diagnostic

  // Les barres se remplissent après l'affichage
  useEffect(() => {
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => setAnimated(true)); });
    return () => cancelAnimationFrame(frame);
  }, []);

  const restart = () => {
    if (!visitor) reset(); // un exemple ou un lien partagé ne touche pas au diagnostic en cours
    navigate('/diagnostic');
  };

  const r = computeResults(answers);
  const level = LEVELS[r.level];
  const markerPos = Math.min(97, Math.max(3, r.score)); // le repère reste lisible aux extrémités
  const themeAverages = stats ? stats.themes : null;

  const requestExpert = () => openSheet({
    kicker: 'Version de démonstration',
    title: 'Demander un diagnostic expert',
    body: (
      <>
        <p className="sheet-lead">Dans la version utilisée en entreprise, ce bouton met en relation avec un expert Supply Chain pour un diagnostic complet.</p>
        <p>Dans cette démonstration, aucune demande n'est transmise. Vous pouvez en revanche télécharger votre rapport en PDF ou partager le lien de votre résultat.</p>
      </>
    ),
  });

  return (
    <div className={`view${animated ? ' is-animated' : ''}`} id="view-results">
      <div className="print-head">
        <img src="img/logo-logistics.webp" alt="Logistics" width="154" height="32" />
        <p>Résultats du test de maturité Supply Chain · <span id="print-date">document généré le {longDate(Date.now())}</span></p>
      </div>

      <section className="result-hero" id="result-hero">
        <div className="container result-hero-grid">
          <div className="result-copy">
            {mode === 'sample' && <p className="sample-banner">Exemple de résultat avec des réponses fictives. <Link to="/diagnostic">Faire mon diagnostic →</Link></p>}
            {mode === 'shared' && <p className="sample-banner">Diagnostic partagé, réalisé le {longDate(createdAt)}. <Link to="/diagnostic">Faire mon propre diagnostic →</Link></p>}
            <p className="eyebrow">Diagnostic{company ? ` · ${company}` : ''}</p>
            <h1>Votre Supply Chain est au niveau <span className="lvl-name" style={{ '--lvl': lvlVar(r.level) }}>{level.title}</span></h1>
            <p className="result-lead">{level.description}.</p>
            <div className="scale" role="img" aria-label={`Niveau ${level.rank} sur 4, score de maturité de ${r.score} sur 100`}>
              <div className="scale-track">
                {LEVEL_ORDER.map((key) => <span key={key} className={`scale-seg${key === r.level ? ' is-current' : ''}`} style={{ '--lvl': lvlVar(key) }} />)}
                <span className="scale-marker" style={{ '--pos': `${markerPos}%` }}><b>{r.score}/100</b></span>
              </div>
              <div className="scale-labels">{LEVEL_ORDER.map((key) => <span key={key} className={key === r.level ? 'is-current' : undefined}>{LEVELS[key].short}</span>)}</div>
            </div>
          </div>
          <figure className="result-figure" style={{ '--lvl': lvlVar(r.level) }}>
            <img src={level.image} alt="" width="420" height="626" />
            <figcaption>Niveau {level.rank} sur 4</figcaption>
          </figure>
        </div>
      </section>

      <section className="container result-grid">
        {mode === 'own' && <ShareLink id={savedId} />}
        {mode === 'local' && <SaveOffer initialError={saveError} />}

        <article className="card">
          <h2 className="card-title">Progression par niveau</h2>
          <p className="card-sub">Score de maturité : <strong id="maturity-score">{r.score}</strong>/100. Un niveau est validé dès que {pct.format(THRESHOLD * 100)}&nbsp;% de ses points sont acquis (trait sur la barre) et que les niveaux précédents le sont aussi.</p>
          <table className="dist" id="levels-progress">
            <thead><tr><th scope="col">Niveau</th><th scope="col">Progression</th><th scope="col">Points</th><th scope="col">Statut</th></tr></thead>
            <tbody>
              {LEVEL_ORDER.map((key, i) => {
                const step = r.steps[i - 1]; // le niveau 1 est le point de départ : pas de questions propres
                const share = step ? Math.round(step.ratio * 100) : null;
                return (
                  <tr key={key} style={{ '--lvl': lvlVar(key) }}>
                    <th scope="row"><span className="swatch" />{LEVELS[key].title}</th>
                    <td>
                      {step
                        ? <div className="bar-cell"><div className="bar bar-threshold" style={{ '--threshold': `${THRESHOLD * 100}%` }} title={`${LEVELS[key].title} : ${step.earned} points sur ${step.max} (${share} %)`}><span style={{ '--w': `${share}%` }} /></div><span className="bar-val">{share} %</span></div>
                        : <span className="bar-note">Point de départ</span>}
                    </td>
                    <td className="num">{step ? `${step.earned} / ${step.max}` : '—'}</td>
                    <td>{BADGES[step ? step.status : 'base']}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h2 className="card-title">Mise en place par thématique</h2>
          <p className="card-sub">
            Indicatif : « Mis en place » compte pour 100&nbsp;%, « En cours » pour 50&nbsp;%.
            {themeAverages && ' Le trait jaune indique la moyenne des entreprises.'}
          </p>
          <table className="dist themes-chart" id="theme-scores">
            <thead><tr><th scope="col">Thématique</th><th scope="col">Mise en place</th><th scope="col">Score</th></tr></thead>
            <tbody>
              {r.themes.map((t, i) => {
                const average = themeAverages?.[i];
                return (
                  <tr key={t.title}>
                    <th scope="row">{t.title}</th>
                    <td>
                      <div
                        className={`bar bar-mono${average != null ? ' bar-avg' : ''}`}
                        style={average != null ? { '--avg': `${average}%` } : undefined}
                        title={`${t.title} : ${t.score} % mis en place${average != null ? ` (moyenne des entreprises : ${average} %)` : ''}`}
                      >
                        <span style={{ '--w': `${t.score}%` }} />
                      </div>
                    </td>
                    <td className="num">{pct.format(t.score)} %</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>

        <CompareCard stats={stats} result={r} excludeSelf={mode === 'own' || mode === 'shared'} />

        <article className="card card-wide" id="level-detail">
          <div className="detail-grid">
            <div>
              <h2 className="card-title">Définition du niveau obtenu</h2>
              <p className="detail-text">{level.details}</p>
            </div>
            <div className="risk-box" style={{ '--lvl': lvlVar(r.level) }}>
              {level.risks.length
                ? <><h3>Risques identifiés</h3><RiskList risks={level.risks} /></>
                : <><h3>Félicitations&nbsp;!</h3><p>Vous avez atteint le plus haut niveau de maturité Supply Chain.</p></>}
            </div>
          </div>
          <div className="mini-levels no-print">
            {LEVEL_ORDER.map((key) => (
              <button type="button" key={key} className={`mini-level${key === r.level ? ' is-current' : ''}`} style={{ '--lvl': lvlVar(key) }} onClick={() => openLevel(key)}>
                <span>Niveau {LEVELS[key].rank}</span>{LEVELS[key].title}
              </button>
            ))}
          </div>
        </article>

        <article className="card card-wide card-ink">
          <div className="next-steps">
            <div>
              <h2 className="card-title">Pour aller plus loin</h2>
              <p>Ce quiz donne un aperçu rapide de votre niveau de maturité Supply Chain. Pour un diagnostic complet et personnalisé, un expert Logistics analyse votre logistique et vous formule des recommandations adaptées à vos ressources et à vos objectifs.</p>
            </div>
            <div className="next-actions no-print">
              <button className="btn btn-yellow" type="button" id="expert-request" onClick={requestExpert}>Demander un diagnostic expert</button>
            </div>
          </div>
        </article>
      </section>

      <section className="container result-tools no-print">
        <button className="btn btn-ink" type="button" id="print-report" onClick={() => window.print()}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2" d="M12 3v12m0 0l-5-5m5 5l5-5M4 19h16" /></svg>
          Télécharger mon rapport (PDF)
        </button>
        <button className="btn btn-ghost" type="button" id="restart" onClick={restart}>{visitor ? 'Faire mon propre diagnostic' : 'Refaire le diagnostic'}</button>
      </section>
    </div>
  );
}
