import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LEVEL_ORDER, LEVELS } from '../data.js';
import { lvlVar, pct } from '../lib/format.js';
import { computeResults, SAMPLE_ANSWERS, THRESHOLD } from '../lib/scoring.js';
import { useDiagnostic } from '../state/DiagnosticContext.jsx';
import { useSheet } from '../state/SheetContext.jsx';
import { RiskList } from '../components/ui.jsx';

const BADGES = {
  base: <span className="badge badge-present">✓ Acquis</span>,
  validated: <span className="badge badge-dominant">✓ Validé</span>,
  pending: <span className="badge badge-present" title="Validez d'abord le niveau précédent">◐ En attente</span>,
  progress: <span className="badge badge-minimal">○ Non atteint</span>,
};

export default function Results({ sample = false }) {
  const { state, reset, isComplete } = useDiagnostic();
  const { openSheet, openLevel } = useSheet();
  const navigate = useNavigate();
  const [animated, setAnimated] = useState(false);

  // Les barres se remplissent après l'affichage
  useEffect(() => {
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => setAnimated(true)); });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!sample && !isComplete) return <Navigate to="/diagnostic" replace />;

  const r = computeResults(sample ? SAMPLE_ANSWERS : state.answers);
  const lead = sample ? { entreprise: 'Entreprise exemple' } : state.lead;
  const level = LEVELS[r.level];
  const markerPos = Math.min(97, Math.max(3, r.score)); // le repère reste lisible aux extrémités
  const date = new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' });

  const restart = () => {
    if (!sample) reset(); // l'exemple ne touche pas au diagnostic en cours
    navigate('/diagnostic');
  };

  const requestExpert = () => openSheet({
    kicker: 'Version de démonstration',
    title: 'Demander un diagnostic expert',
    body: (
      <>
        <p className="sheet-lead">Dans la version utilisée en entreprise, ce bouton met en relation avec un expert Supply Chain pour un diagnostic complet.</p>
        <p>Cette démonstration n'envoie aucune donnée. Vous pouvez en revanche télécharger votre rapport en PDF.</p>
      </>
    ),
  });

  return (
    <div className={`view${animated ? ' is-animated' : ''}`} id="view-results">
      <div className="print-head">
        <img src="img/logo-logistics.webp" alt="Logistics" width="154" height="32" />
        <p>Résultats du test de maturité Supply Chain · <span id="print-date">document généré le {date}</span></p>
      </div>

      <section className="result-hero" id="result-hero">
        <div className="container result-hero-grid">
          <div className="result-copy">
            {sample && <p className="sample-banner">Exemple de résultat avec des réponses fictives. <Link to="/diagnostic">Faire mon diagnostic →</Link></p>}
            <p className="eyebrow">Diagnostic{lead?.entreprise ? ` · ${lead.entreprise}` : ''}</p>
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
          <p className="card-sub">Indicatif : « Mis en place » compte pour 100&nbsp;%, « En cours » pour 50&nbsp;%.</p>
          <table className="dist themes-chart" id="theme-scores">
            <thead><tr><th scope="col">Thématique</th><th scope="col">Mise en place</th><th scope="col">Score</th></tr></thead>
            <tbody>
              {r.themes.map((t) => (
                <tr key={t.title}>
                  <th scope="row">{t.title}</th>
                  <td><div className="bar bar-mono" title={`${t.title} : ${t.score} % mis en place`}><span style={{ '--w': `${t.score}%` }} /></div></td>
                  <td className="num">{pct.format(t.score)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

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
        <button className="btn btn-ghost" type="button" id="restart" onClick={restart}>{sample ? 'Faire mon propre diagnostic' : 'Refaire le diagnostic'}</button>
      </section>
    </div>
  );
}
