import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LEVEL_ORDER, LEVELS, LEXIQUE, QUESTIONS, THEMES, THEME_QUESTIONS } from '../data.js';
import { lvlVar } from '../lib/format.js';
import { computeResults } from '../lib/scoring.js';
import { useDiagnostic } from '../state/DiagnosticContext.jsx';
import { useSheet } from '../state/SheetContext.jsx';
import { Reveal, SectionLink, StartLink } from '../components/ui.jsx';

export default function Landing() {
  // Ancienne adresse d'une section (#niveaux…) : on y descend
  const section = useLocation().pathname.slice(1);
  useEffect(() => {
    const anchor = section ? document.getElementById(section) : null;
    if (anchor) requestAnimationFrame(() => anchor.scrollIntoView());
  }, [section]);

  return (
    <div className="view" id="view-landing">
      <Hero />
      <Steps />
      <Levels />
      <Themes />
      <Glossary />
      <section className="cta-band">
        <Reveal className="container cta-inner">
          <h2>Prêt à situer votre Supply Chain&nbsp;?</h2>
          <p>5 minutes, 27 questions, un résultat immédiat.</p>
          <StartLink className="btn btn-yellow btn-lg">Commencer le diagnostic <span aria-hidden="true">→</span></StartLink>
        </Reveal>
      </section>
    </div>
  );
}

function ResumeNote() {
  const { state, answered, isComplete } = useDiagnostic();
  let content = null;
  if (state.done && isComplete) {
    const { level } = computeResults(state.answers);
    content = <>Votre dernier résultat : <strong>{LEVELS[level].title}</strong>. <Link to="/resultats">Revoir le résultat →</Link></>;
  } else if (answered > 0) {
    content = <>{`Diagnostic en cours : ${answered} / ${QUESTIONS.length} réponses. `}<Link to="/diagnostic">Reprendre →</Link></>;
  }
  return <p className="resume-note intro" style={{ '--i': 4 }} id="resume-note" hidden={!content}>{content}</p>;
}

function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <p className="eyebrow intro" style={{ '--i': 0 }}><span className="pulse-dot" />Diagnostic gratuit · 5 minutes</p>
          <h1 className="hero-title intro" style={{ '--i': 1 }}>Challengez la <mark>maturité</mark> de votre Supply Chain.</h1>
          <p className="hero-lead intro" style={{ '--i': 2 }}>Évaluez la maturité de votre Supply Chain avec notre outil rapide, visuel et interactif. Vous obtenez votre niveau, vos risques et vos pistes d'amélioration dès la dernière réponse.</p>
          <div className="hero-actions intro" style={{ '--i': 3 }}>
            <StartLink className="btn btn-yellow btn-lg">Commencer le diagnostic <span aria-hidden="true">→</span></StartLink>
            <SectionLink id="niveaux" className="btn btn-ghost btn-lg">Découvrir les 4 niveaux</SectionLink>
          </div>
          <p className="hero-alt intro" style={{ '--i': 4 }}>Pas le temps maintenant&nbsp;? <Link to="/exemple">Voir un exemple de résultat →</Link></p>
          <ResumeNote />
        </div>

        <div className="hero-visual intro-visual" aria-hidden="true">
          <FlowDiagram />
          <div className="preview-card">
            <p className="preview-label">Exemple de résultat</p>
            <p className="preview-level">Excellence interne</p>
            <div className="mini-scale"><span /><span className="is-on" /><span /><span /></div>
            <p className="preview-meta">Niveau 2 sur 4</p>
          </div>
        </div>
      </div>

      <div className="container">
        <dl className="facts">
          <div><dt>27</dt><dd>questions</dd></div>
          <div><dt>7</dt><dd>thématiques</dd></div>
          <div><dt>5 min</dt><dd>pour répondre</dd></div>
          <div><dt>4</dt><dd>niveaux de maturité</dd></div>
        </dl>
      </div>
    </section>
  );
}

/* Schéma animé de la chaîne logistique : des colis parcourent les étapes */
const NODES = [
  { label: 'Fournisseurs', x: 90, y: 90, w: 140 },
  { label: 'Production', x: 320, y: 90, w: 128 },
  { label: 'Entrepôt', x: 490, y: 180, w: 112 },
  { label: 'Distribution', x: 270, y: 270, w: 140 },
  { label: 'Clients', x: 470, y: 420, w: 108, end: true },
];

function FlowDiagram() {
  return (
    <svg className="flow" viewBox="0 0 560 500">
      <defs>
        <path id="flow-path" d="M 90 90 L 400 90 Q 490 90 490 180 Q 490 270 400 270 L 160 270 Q 70 270 70 350 Q 70 420 150 420 L 470 420" />
      </defs>
      <use href="#flow-path" className="flow-track" />
      <use href="#flow-path" className="flow-dash" />
      <g className="parcel"><rect x="-9" y="-9" width="18" height="18" rx="4" /><animateMotion dur="9s" repeatCount="indefinite" rotate="0"><mpath href="#flow-path" /></animateMotion></g>
      <g className="parcel parcel-2"><rect x="-7" y="-7" width="14" height="14" rx="3" /><animateMotion dur="9s" begin="-3s" repeatCount="indefinite"><mpath href="#flow-path" /></animateMotion></g>
      <g className="parcel parcel-3"><rect x="-7" y="-7" width="14" height="14" rx="3" /><animateMotion dur="9s" begin="-6s" repeatCount="indefinite"><mpath href="#flow-path" /></animateMotion></g>
      {NODES.map(({ label, x, y, w, end }) => (
        <g key={label} className={end ? 'node node-end' : 'node'} transform={`translate(${x} ${y})`}>
          <rect x={-w / 2} y="-21" width={w} height="42" rx="21" />
          <circle cx={-w / 2 + 20} cy="0" r="6" />
          <text x={-w / 2 + 33} y="5">{label}</text>
        </g>
      ))}
    </svg>
  );
}

function Steps() {
  return (
    <section className="section" id="fonctionnement">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">Comment ça marche</p>
          <h2>Trois étapes, aucun jargon inutile.</h2>
        </Reveal>
        <ol className="steps">
          <Reveal as="li" className="step">
            <span className="step-num">01</span>
            <h3>Présentez votre entreprise</h3>
            <p>Quelques informations pour personnaliser votre diagnostic : nom de l'entreprise, fonction, coordonnées.</p>
          </Reveal>
          <Reveal as="li" className="step">
            <span className="step-num">02</span>
            <h3>Répondez à 27 affirmations</h3>
            <p>Réparties en 7 thématiques. Pour chacune : « Pas du tout », « En cours » ou « Mis en place ». Les termes techniques sont expliqués d'un clic.</p>
          </Reveal>
          <Reveal as="li" className="step">
            <span className="step-num">03</span>
            <h3>Découvrez votre niveau</h3>
            <p>Votre niveau de maturité, la répartition de vos réponses, les risques identifiés et votre rapport à télécharger.</p>
          </Reveal>
        </ol>
      </div>
    </section>
  );
}

function Levels() {
  const { openLevel } = useSheet();
  return (
    <section className="section section-tinted" id="niveaux">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">Les 4 niveaux de maturité</p>
          <h2>De la Supply Chain fragmentée à la Supply Chain collaborative.</h2>
        </Reveal>
        <div className="levels" id="levels">
          {LEVEL_ORDER.map((key) => {
            const level = LEVELS[key];
            return (
              <Reveal as="article" key={key} className="level-card" style={{ '--lvl': lvlVar(key), '--step': level.rank }}>
                <span className="level-rank">Niveau {level.rank}</span>
                <img src={level.image} alt="" width="420" height="626" loading="lazy" />
                <h3>{level.title}</h3>
                <p>{level.description}</p>
                <button type="button" className="link-btn" onClick={() => openLevel(key)}>En savoir plus <span aria-hidden="true">→</span></button>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Themes() {
  return (
    <section className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">Ce que nous évaluons</p>
          <h2>7 thématiques au cœur de votre performance logistique.</h2>
        </Reveal>
        <ol className="themes" id="themes">
          {THEMES.map((theme, i) => (
            <Reveal as="li" key={theme.title} className="theme-item">
              <span className="theme-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{theme.title}</h3>
                <p>{theme.desc}</p>
              </div>
              <span className="theme-count">{THEME_QUESTIONS[i].length} questions</span>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Glossary() {
  return (
    <section className="section section-tinted" id="lexique">
      <div className="container lexique-grid">
        <Reveal className="section-head">
          <p className="eyebrow">Lexique Supply Chain</p>
          <h2>Les mots-clés, expliqués simplement.</h2>
          <p className="section-intro">Ces termes reviennent dans les questions. Pendant le diagnostic, cliquez sur un mot souligné pour revoir sa définition.</p>
        </Reveal>
        <Reveal id="glossary">
          {Object.entries(LEXIQUE).map(([term, def]) => (
            <details className="gloss" key={term}>
              <summary>{term}</summary>
              <p>{def}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
