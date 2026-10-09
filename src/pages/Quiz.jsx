import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ANSWERS, QUESTIONS, THEMES, THEME_QUESTIONS } from '../../shared/data.js';
import { saveDiagnostic } from '../lib/api.js';
import { reducedMotion } from '../lib/format.js';
import { useDiagnostic } from '../state/DiagnosticContext.jsx';
import { TermText } from '../components/ui.jsx';

export default function Quiz() {
  const { state, update } = useDiagnostic();
  const [step, setStep] = useState(state.lead ? 'questions' : 'lead');

  // Revenir au diagnostic rouvre le questionnaire, même s'il était terminé
  useEffect(() => { if (state.done) update({ done: false }); }, []);

  // Après un « Refaire le diagnostic », on repart du formulaire
  useEffect(() => { if (!state.lead) setStep('lead'); }, [state.lead]);

  return (
    <div className="view" id="view-quiz">
      {step === 'lead' && <LeadStep onDone={() => setStep('loading')} />}
      {step === 'loading' && <LoadingStep onDone={() => { setStep('questions'); window.scrollTo(0, 0); }} />}
      {step === 'questions' && <QuestionsStep />}
    </div>
  );
}

/* ---------- Étape 1 : informations ---------- */
const FIELDS = [
  { name: 'entreprise', label: "Nom de l'entreprise", type: 'text', autoComplete: 'organization', required: true, error: "Indiquez le nom de l'entreprise." },
  { name: 'fonction', label: "Fonction dans l'entreprise", type: 'text', autoComplete: 'organization-title', required: true, error: 'Indiquez votre fonction.' },
  { name: 'email', label: 'Adresse e-mail', type: 'email', autoComplete: 'email', error: 'Indiquez une adresse e-mail valide, ou laissez le champ vide.' },
  { name: 'gsm', label: 'Numéro de téléphone', type: 'tel', autoComplete: 'tel', inputMode: 'tel', error: 'Indiquez un numéro de téléphone valide, ou laissez le champ vide.' },
];

/* Un champ facultatif vide est valide ; rempli, il doit être correct */
function isValid(input, required) {
  const value = input.value.trim();
  if (!value) return !required;
  if (input.name === 'gsm') return value.replace(/D/g, '').length >= 9;
  return input.checkValidity();
}

function LeadStep({ onDone }) {
  const { update } = useDiagnostic();
  const [validity, setValidity] = useState({}); // name → true (valide) / false (invalide), après un envoi
  const [error, setError] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const inputs = FIELDS.map(({ name }) => form.elements.namedItem(name));
    const result = Object.fromEntries(FIELDS.map(({ required }, i) => [inputs[i].name, isValid(inputs[i], required)]));
    setValidity(result);
    const firstInvalid = inputs.find((input) => !result[input.name]);
    if (firstInvalid) {
      setError(FIELDS.find((f) => f.name === firstInvalid.name).error);
      firstInvalid.focus();
      return;
    }
    setError('');
    const lead = Object.fromEntries(inputs.map((input) => [input.name, input.value.trim()]));
    update({ lead: { ...lead, consent: form.elements.namedItem('consent').checked }, theme: 0, savedId: null });
    onDone();
  };

  const onInput = (e) => {
    const { name } = e.target;
    setValidity(({ [name]: _, ...rest }) => rest);
    setError('');
  };

  return (
    <section className="quiz-step" id="step-lead">
      <div className="container lead-grid">
        <div className="lead-copy">
          <p className="eyebrow">Étape 1 sur 2</p>
          <h1 className="step-title">Avant de commencer, présentez votre entreprise.</h1>
          <p>Ces informations personnalisent votre résultat et votre rapport.</p>
          <p className="demo-note">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2" d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /></svg>
            Vos réponses restent dans votre navigateur, sauf si vous cochez la case d'enregistrement. Dans ce cas, vos coordonnées sont effacées au bout de 30 jours.
          </p>
        </div>
        <form className="card lead-form" id="lead-form" noValidate onSubmit={onSubmit} onInput={onInput}>
          {FIELDS.map(({ name, label, type, autoComplete, inputMode, required }) => (
            <label className="field" key={name}>
              <span>{label}{!required && <small className="field-hint"> · facultatif</small>}</span>
              <input type={type} name={name} autoComplete={autoComplete} inputMode={inputMode} required={required} aria-invalid={name in validity ? String(!validity[name]) : undefined} />
            </label>
          ))}
          <label className="consent">
            <input type="checkbox" name="consent" />
            <span>Enregistrer mon diagnostic pour obtenir un lien de partage. Il comptera aussi, anonymement, dans la comparaison entre entreprises. Mes coordonnées sont effacées après 30 jours.</span>
          </label>
          <p className="form-error" id="lead-error" role="alert">{error}</p>
          <button className="btn btn-ink btn-lg btn-block" type="submit">Commencer le diagnostic <span aria-hidden="true">→</span></button>
        </form>
      </div>
    </section>
  );
}

/* ---------- Transition ---------- */
function LoadingStep({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, reducedMotion() ? 0 : 1600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="quiz-step loader" id="step-loading">
      <svg className="check" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r="24" />
        <path d="M15 27 l7 7 l15 -15" />
      </svg>
      <p>Préparation de votre diagnostic…</p>
    </section>
  );
}

/* ---------- Étape 2 : questions ---------- */
function QuestionsStep() {
  const { state, update, answered, isComplete, firstUnanswered } = useDiagnostic();
  const navigate = useNavigate();
  const [missing, setMissing] = useState(null); // question signalée comme sans réponse
  const [error, setError] = useState('');
  const [scrollRequest, setScrollRequest] = useState(null);
  const [saving, setSaving] = useState(null); // null, 'saving' ou 'slow' (serveur en veille)
  const scrollTimer = useRef(null);
  const mounted = useRef(true);
  const theme = THEMES[state.theme];
  const questions = THEME_QUESTIONS[state.theme];
  const last = state.theme === THEMES.length - 1;

  useEffect(() => {
    mounted.current = true;
    return () => {
      clearTimeout(scrollTimer.current);
      mounted.current = false;
    };
  }, []);

  // Après un changement de thématique : vers la question signalée, sinon en haut de page
  useEffect(() => {
    if (!scrollRequest) return;
    const target = scrollRequest.question ? document.getElementById(`q-${scrollRequest.question}`) : null;
    if (target) target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
    else window.scrollTo({ top: 0, behavior: 'auto' });
  }, [scrollRequest]);

  const goToTheme = (index, question = null) => {
    update({ theme: Math.max(0, Math.min(THEMES.length - 1, index)) });
    setMissing(question);
    setScrollRequest({ question });
  };

  const answer = (n, value) => {
    // Une réponse modifiée : le diagnostic déjà enregistré ne correspond plus
    update((s) => ({ answers: { ...s.answers, [n]: value }, savedId: s.answers[n] === value ? s.savedId : null }));
    if (missing === n) setMissing(null);

    // Fait glisser la question suivante sans réponse dans le champ de vision
    const next = questions.find((q) => q > n && !state.answers[q]);
    if (!next) return;
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const el = document.getElementById(`q-${next}`);
      if (!el) return; // la thématique a changé entre-temps
      if (el.getBoundingClientRect().bottom > window.innerHeight - 40) el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
    }, 220);
  };

  const seeResults = async () => {
    if (!isComplete) {
      const left = QUESTIONS.length - answered;
      goToTheme(THEME_QUESTIONS.findIndex((qs) => qs.includes(firstUnanswered)), firstUnanswered);
      setError(`Il reste ${left} question${left > 1 ? 's' : ''} sans réponse. Complétez-${left > 1 ? 'les' : 'la'} pour découvrir votre résultat.`);
      return;
    }
    // Déjà enregistré avec ces réponses, ou pas d'accord pour enregistrer : résultat direct
    if (state.savedId || !state.lead?.consent) {
      update({ done: true });
      navigate(state.savedId ? `/resultats/${state.savedId}` : '/resultats');
      return;
    }
    setSaving('saving');
    try {
      const saved = await saveDiagnostic(state.lead, state.answers, { onSlow: () => mounted.current && setSaving('slow') });
      update({ done: true, savedId: saved.id });
      if (mounted.current) navigate(`/resultats/${saved.id}`);
    } catch (err) {
      // Le résultat s'affiche quand même ; la page de résultats propose de réessayer
      update({ done: true });
      if (mounted.current) navigate('/resultats', { state: { saveError: err.message } });
    }
  };

  const themeDone = questions.every((n) => state.answers[n]);

  return (
    <section className="quiz-step" id="step-questions">
      <div className="container quiz-grid">
        <aside className="theme-nav" aria-label="Thématiques">
          <p className="eyebrow">Étape 2 sur 2</p>
          <ol id="theme-nav">
            {THEMES.map((t, i) => {
              const total = THEME_QUESTIONS[i].length;
              const done = THEME_QUESTIONS[i].filter((n) => state.answers[n]).length;
              return (
                <li key={t.title} className={done === total ? 'is-done' : undefined}>
                  <button type="button" aria-current={i === state.theme ? 'step' : undefined} onClick={() => goToTheme(i)}>
                    <span className="theme-dot">{i + 1}</span>
                    <span className="theme-name">{t.title}</span>
                    <span className="theme-status">{done === total ? 'Terminé' : `${done} / ${total}`}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
        <div>
          <header className="theme-head" id="theme-head">
            <p className="eyebrow">Thématique {state.theme + 1} sur {THEMES.length}</p>
            <h1 className="step-title">{theme.title}</h1>
            <p>{theme.desc}</p>
          </header>
          <form id="quiz-form" noValidate onSubmit={(e) => e.preventDefault()}>
            <div id="questions" key={state.theme}>
              {questions.map((n, k) => (
                <fieldset key={n} className={['question', state.answers[n] && 'is-answered', missing === n && 'is-missing'].filter(Boolean).join(' ')} id={`q-${n}`} style={{ '--d': k }}>
                  <legend><span className="q-num">Question {n}</span><span className="q-text"><TermText text={QUESTIONS[n - 1].text} /></span></legend>
                  <div className="choices">
                    {ANSWERS.map((a) => (
                      <label className={`choice choice-${a.value}`} key={a.value}>
                        <input type="radio" name={`q${n}`} value={a.value} checked={state.answers[n] === a.value} onChange={() => answer(n, a.value)} />
                        <span><i aria-hidden="true" />{a.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </form>
          <p className="form-error" id="quiz-error" role="alert">{isComplete ? '' : error}</p>
          <div className="quiz-actions">
            <button className="btn btn-ghost" type="button" id="prev-theme" hidden={state.theme === 0} onClick={() => goToTheme(state.theme - 1)}>← Thème précédent</button>
            <button className={`btn btn-ink${themeDone ? ' is-ready' : ''}`} type="button" id="next-theme" hidden={last} onClick={() => goToTheme(state.theme + 1)}>Thème suivant →</button>
            <button className={`btn btn-yellow${isComplete ? ' is-ready' : ''}`} type="button" id="see-results" hidden={!last && !isComplete} disabled={Boolean(saving)} onClick={seeResults}>{saving ? 'Enregistrement…' : 'Voir mes résultats →'}</button>
          </div>
          <p className="form-status" role="status">{saving === 'slow' ? "Le serveur se réveille (hébergement gratuit) : l'enregistrement peut prendre jusqu'à 30 secondes." : ''}</p>
        </div>
      </div>
    </section>
  );
}
