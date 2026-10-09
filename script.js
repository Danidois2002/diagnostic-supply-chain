/* =========================================================
   Diagnostic Supply Chain — logique de l'application
   ========================================================= */
const STORE_KEY = 'liw-diagnostic-v1';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pct = new Intl.NumberFormat('fr-BE', { maximumFractionDigits: 0 });
const dec = new Intl.NumberFormat('fr-BE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- État (sauvegardé dans le navigateur, jamais envoyé) ---------- */
const emptyState = () => ({ lead: null, answers: {}, theme: 0, done: false });
let state = (() => {
  try { return { ...emptyState(), ...JSON.parse(localStorage.getItem(STORE_KEY)) }; } catch { return emptyState(); }
})();
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* navigation privée */ } }
function resetState() { state = emptyState(); save(); }

/* Questions de chaque thématique (numéros à partir de 1) */
const THEME_QUESTIONS = THEMES.map((theme, i) => {
  const end = THEMES[i + 1] ? THEMES[i + 1].start : QUESTIONS.length + 1;
  return Array.from({ length: end - theme.start }, (_, k) => theme.start + k);
});
const answeredCount = () => Object.keys(state.answers).length;
const isComplete = () => answeredCount() === QUESTIONS.length;
const firstUnanswered = () => QUESTIONS.findIndex((_, i) => !state.answers[i + 1]) + 1;

/* ---------- Calcul du résultat (même logique que la version PHP) ---------- */
function levelForAnswer(cat, value) {
  if (value === undefined) return null;
  switch (cat) {
    case 'E': return { 1: 'F', 2: 'E' }[value] || null; // « Pas du tout » = sous le premier niveau
    case 'F': return value === '2' ? 'F' : null;
    case 'I': return { 0: 'F', 1: 'E', 2: 'I' }[value];
    case 'C': return { 0: 'F', 1: 'I', 2: 'C' }[value];
    default: return null;
  }
}

function computeResults(answers = state.answers) {
  const counts = { F: 0, E: 0, I: 0, C: 0 };
  QUESTIONS.forEach((q, i) => {
    const level = levelForAnswer(q.cat, answers[i + 1]);
    if (level) counts[level] += 1;
  });
  const total = LEVEL_ORDER.reduce((sum, key) => sum + counts[key], 0);
  const weighted = LEVEL_ORDER.reduce((sum, key, rank) => sum + counts[key] * rank, 0);
  const average = total ? weighted / total : 0; // 0 = Fragmentée … 3 = Collaborative
  const level = LEVEL_ORDER[Math.round(average)];
  const max = Math.max(...Object.values(counts));
  const rows = LEVEL_ORDER.map((key) => {
    const share = total ? Math.round((counts[key] / total) * 100) : 0;
    const status = counts[key] > 0 && counts[key] === max ? 'dominant' : share >= 20 ? 'present' : 'minimal';
    return { key, points: counts[key], share, status };
  });
  // Indicateur complémentaire : degré de mise en place par thématique
  const themes = THEMES.map((theme, i) => {
    const values = THEME_QUESTIONS[i].map((n) => Number(answers[n] || 0));
    return { title: theme.title, score: Math.round((values.reduce((a, b) => a + b, 0) / (values.length * 2)) * 100) };
  });
  return { counts, total, average, level, rows, themes };
}

/* ---------- Lexique : termes soulignés et cliquables ---------- */
const termKeys = Object.keys(LEXIQUE).sort((a, b) => b.length - a.length);
const termRegex = new RegExp(`(?<!\\p{L})(${termKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?!\\p{L})`, 'giu');
const termKeyFor = (match) => termKeys.find((k) => k.toLowerCase() === match.toLowerCase());
const withTerms = (text) => escapeHtml(text).replace(termRegex, (m) => `<button type="button" class="term" data-term="${escapeHtml(termKeyFor(m))}">${m}</button>`);

/* ---------- Fenêtre « sheet » (définitions, détails des niveaux) ---------- */
const sheet = $('#sheet');
function openSheet({ kicker, title, html }) {
  $('#sheet-kicker').textContent = kicker;
  $('#sheet-title').textContent = title;
  $('#sheet-body').innerHTML = html;
  sheet.showModal();
}
sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('[data-close]')) sheet.close(); });

function levelSheetHtml(key) {
  const level = LEVELS[key];
  const risks = level.risks.length
    ? `<h3>Risques identifiés</h3><ul class="risk-list">${level.risks.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>`
    : '';
  return `<p class="sheet-lead">${escapeHtml(level.description)}</p><p>${escapeHtml(level.details)}</p>${risks}`;
}
const openLevel = (key) => openSheet({ kicker: `Niveau ${LEVELS[key].rank} sur 4`, title: LEVELS[key].title, html: levelSheetHtml(key) });
const openTerm = (key) => openSheet({ kicker: 'Lexique Supply Chain', title: key, html: `<p>${escapeHtml(LEXIQUE[key])}</p>` });

document.addEventListener('click', (e) => {
  const term = e.target.closest('.term');
  if (term) { e.preventDefault(); openTerm(term.dataset.term); }
  const level = e.target.closest('[data-level]');
  if (level) openLevel(level.dataset.level);
});

/* ---------- Page d'accueil ---------- */
function renderLanding() {
  $('#levels').innerHTML = LEVEL_ORDER.map((key) => {
    const level = LEVELS[key];
    return `
      <article class="level-card reveal" style="--lvl: var(--lvl-${key.toLowerCase()}); --step:${level.rank}">
        <span class="level-rank">Niveau ${level.rank}</span>
        <img src="${level.image}" alt="" width="420" height="626" loading="lazy" />
        <h3>${level.title}</h3>
        <p>${escapeHtml(level.description)}</p>
        <button type="button" class="link-btn" data-level="${key}">En savoir plus <span aria-hidden="true">→</span></button>
      </article>`;
  }).join('');

  $('#themes').innerHTML = THEMES.map((theme, i) => `
    <li class="theme-item reveal">
      <span class="theme-num">${String(i + 1).padStart(2, '0')}</span>
      <div>
        <h3>${theme.title}</h3>
        <p>${escapeHtml(theme.desc)}</p>
      </div>
      <span class="theme-count">${THEME_QUESTIONS[i].length} questions</span>
    </li>`).join('');

  $('#glossary').innerHTML = Object.entries(LEXIQUE).map(([term, def]) => `
    <details class="gloss">
      <summary>${term}</summary>
      <p>${escapeHtml(def)}</p>
    </details>`).join('');
}

function renderResumeNote() {
  const note = $('#resume-note');
  if (state.done && isComplete()) {
    const { level } = computeResults();
    note.innerHTML = `Votre dernier résultat : <strong>${LEVELS[level].title}</strong>. <a href="#/resultats">Revoir le résultat →</a>`;
    note.hidden = false;
  } else if (answeredCount() > 0) {
    note.innerHTML = `Diagnostic en cours : ${answeredCount()} / ${QUESTIONS.length} réponses. <a href="#/diagnostic">Reprendre →</a>`;
    note.hidden = false;
  } else {
    note.hidden = true;
  }
}

/* « Commencer » après un diagnostic terminé : on repart de zéro */
$$('[data-start]').forEach((a) => a.addEventListener('click', () => { if (state.done) resetState(); }));

/* ---------- Diagnostic ---------- */
function showStep(id) {
  ['step-lead', 'step-loading', 'step-questions'].forEach((s) => { $(`#${s}`).hidden = s !== id; });
}

function updateProgress() {
  const done = answeredCount();
  $('#topbar-progress').textContent = `${done} / ${QUESTIONS.length} réponses`;
  $('#global-progress-bar').style.transform = `scaleX(${done / QUESTIONS.length})`;
  $$('#theme-nav li').forEach((li, i) => {
    const answered = THEME_QUESTIONS[i].filter((n) => state.answers[n]).length;
    const total = THEME_QUESTIONS[i].length;
    li.classList.toggle('is-done', answered === total);
    $('.theme-status', li).textContent = answered === total ? 'Terminé' : `${answered} / ${total}`;
  });
  const last = state.theme === THEMES.length - 1;
  $('#prev-theme').hidden = state.theme === 0;
  $('#next-theme').hidden = last;
  $('#see-results').hidden = !last && !isComplete();
  const themeDone = THEME_QUESTIONS[state.theme].every((n) => state.answers[n]);
  $('#next-theme').classList.toggle('is-ready', themeDone);
  $('#see-results').classList.toggle('is-ready', isComplete());
  if (isComplete()) $('#quiz-error').textContent = '';
}

function renderThemeNav() {
  $('#theme-nav').innerHTML = THEMES.map((theme, i) => `
    <li>
      <button type="button" data-theme="${i}" ${i === state.theme ? 'aria-current="step"' : ''}>
        <span class="theme-dot">${i + 1}</span>
        <span class="theme-name">${theme.title}</span>
        <span class="theme-status"></span>
      </button>
    </li>`).join('');
}

function renderTheme() {
  const theme = THEMES[state.theme];
  $('#theme-head').innerHTML = `
    <p class="eyebrow">Thématique ${state.theme + 1} sur ${THEMES.length}</p>
    <h1 class="step-title">${theme.title}</h1>
    <p>${escapeHtml(theme.desc)}</p>`;

  $('#questions').innerHTML = THEME_QUESTIONS[state.theme].map((n, k) => `
    <fieldset class="question ${state.answers[n] ? 'is-answered' : ''}" id="q-${n}" style="--d:${k}">
      <legend><span class="q-num">Question ${n}</span><span class="q-text">${withTerms(QUESTIONS[n - 1].text)}</span></legend>
      <div class="choices">
        ${ANSWERS.map((a) => `
          <label class="choice choice-${a.value}">
            <input type="radio" name="q${n}" value="${a.value}" ${state.answers[n] === a.value ? 'checked' : ''} />
            <span><i aria-hidden="true"></i>${a.label}</span>
          </label>`).join('')}
      </div>
    </fieldset>`).join('');

  renderThemeNav();
  updateProgress();
}

function goToTheme(index, focusQuestion) {
  state.theme = Math.max(0, Math.min(THEMES.length - 1, index));
  save();
  renderTheme();
  const target = focusQuestion ? $(`#q-${focusQuestion}`) : null;
  if (target) {
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    target.classList.add('is-missing');
  } else {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}

$('#quiz-form').addEventListener('change', (e) => {
  if (e.target.type !== 'radio') return;
  const n = Number(e.target.name.slice(1));
  state.answers[n] = e.target.value;
  save();
  const card = $(`#q-${n}`);
  card.classList.add('is-answered');
  card.classList.remove('is-missing');
  updateProgress();

  // Fait glisser la question suivante sans réponse dans le champ de vision
  const next = THEME_QUESTIONS[state.theme].find((q) => q > n && !state.answers[q]);
  if (next) {
    setTimeout(() => {
      const el = $(`#q-${next}`);
      if (!el) return; // la thématique a changé entre-temps
      if (el.getBoundingClientRect().bottom > window.innerHeight - 40) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    }, 220);
  }
});

$('#theme-nav').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-theme]');
  if (btn) goToTheme(Number(btn.dataset.theme));
});
$('#prev-theme').addEventListener('click', () => goToTheme(state.theme - 1));
$('#next-theme').addEventListener('click', () => goToTheme(state.theme + 1));
$('#see-results').addEventListener('click', () => {
  if (!isComplete()) {
    const missing = QUESTIONS.length - answeredCount();
    const n = firstUnanswered();
    goToTheme(THEME_QUESTIONS.findIndex((qs) => qs.includes(n)), n);
    $('#quiz-error').textContent = `Il reste ${missing} question${missing > 1 ? 's' : ''} sans réponse. Complétez-la${missing > 1 ? 's' : ''} pour découvrir votre résultat.`;
    return;
  }
  state.done = true;
  save();
  location.hash = '#/resultats';
});

/* Formulaire d'informations */
$('#lead-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const fields = ['entreprise', 'fonction', 'email', 'gsm'].map((name) => form.elements.namedItem(name));
  const messages = {
    entreprise: "Indiquez le nom de l'entreprise.",
    fonction: 'Indiquez votre fonction.',
    email: 'Indiquez une adresse e-mail valide.',
    gsm: 'Indiquez un numéro de téléphone valide.',
  };
  const invalid = fields.filter((input) => {
    const value = input.value.trim();
    const ok = input.name === 'gsm' ? value.replace(/\D/g, '').length >= 9 : value && input.checkValidity();
    input.setAttribute('aria-invalid', String(!ok));
    return !ok;
  });
  if (invalid.length) {
    $('#lead-error').textContent = messages[invalid[0].name];
    invalid[0].focus();
    return;
  }
  $('#lead-error').textContent = '';
  state.lead = Object.fromEntries(fields.map((input) => [input.name, input.value.trim()]));
  state.theme = 0;
  save();
  showStep('step-loading');
  setTimeout(() => { showStep('step-questions'); renderTheme(); window.scrollTo(0, 0); }, reducedMotion ? 0 : 1600);
});
$('#lead-form').addEventListener('input', (e) => { e.target.removeAttribute('aria-invalid'); $('#lead-error').textContent = ''; });

function showQuiz() {
  if (!state.lead) {
    showStep('step-lead');
    return;
  }
  showStep('step-questions');
  renderTheme();
}

/* ---------- Résultats ---------- */
/* Réponses fictives pour « Voir un exemple de résultat » (jamais sauvegardées) */
const SAMPLE_ANSWERS = Object.fromEntries(QUESTIONS.map((q, i) => [i + 1, { E: '2', F: '2', I: '1', C: '1' }[q.cat]]));
Object.assign(SAMPLE_ANSWERS, { 3: '1', 9: '2', 12: '1', 15: '0', 19: '1', 25: '0', 26: '2' });

let sampleMode = false;
function renderResults({ answers = state.answers, lead = state.lead, sample = false } = {}) {
  sampleMode = sample;
  const r = computeResults(answers);
  const level = LEVELS[r.level];
  const company = lead ? escapeHtml(lead.entreprise) : '';
  const markerPos = (r.average / 3) * 100;
  $('#restart').textContent = sample ? 'Faire mon propre diagnostic' : 'Refaire le diagnostic';

  $('#result-hero').innerHTML = `
    <div class="container result-hero-grid">
      <div class="result-copy">
        ${sample ? '<p class="sample-banner">Exemple de résultat avec des réponses fictives. <a href="#/diagnostic">Faire mon diagnostic →</a></p>' : ''}
        <p class="eyebrow">Diagnostic${company ? ` · ${company}` : ''}</p>
        <h1>Votre Supply Chain est au niveau <span class="lvl-name" style="--lvl: var(--lvl-${r.level.toLowerCase()})">${level.title}</span></h1>
        <p class="result-lead">${escapeHtml(level.description)}.</p>
        <div class="scale" role="img" aria-label="Niveau ${level.rank} sur 4, score moyen de ${dec.format(r.average)} sur 3">
          <div class="scale-track">
            ${LEVEL_ORDER.map((key) => `<span class="scale-seg ${key === r.level ? 'is-current' : ''}" style="--lvl: var(--lvl-${key.toLowerCase()})"></span>`).join('')}
            <span class="scale-marker" style="--pos:${markerPos}%"><b>${dec.format(r.average)}</b></span>
          </div>
          <div class="scale-labels">${LEVEL_ORDER.map((key) => `<span class="${key === r.level ? 'is-current' : ''}">${LEVELS[key].short}</span>`).join('')}</div>
        </div>
      </div>
      <figure class="result-figure" style="--lvl: var(--lvl-${r.level.toLowerCase()})">
        <img src="${level.image}" alt="" width="420" height="626" />
        <figcaption>Niveau ${level.rank} sur 4</figcaption>
      </figure>
    </div>`;

  $('#total-points').textContent = r.total;
  const badge = { dominant: '<span class="badge badge-dominant">★ Dominant</span>', present: '<span class="badge badge-present">● Présent</span>', minimal: '<span class="badge badge-minimal">○ Minimal</span>' };
  $('#distribution tbody').innerHTML = r.rows.map((row) => `
    <tr style="--lvl: var(--lvl-${row.key.toLowerCase()})">
      <th scope="row"><span class="swatch"></span>${LEVELS[row.key].title}</th>
      <td><div class="bar-cell"><div class="bar" title="${LEVELS[row.key].title} : ${row.points} réponse${row.points > 1 ? 's' : ''} (${row.share} %)"><span style="--w:${row.share}%"></span></div><span class="bar-val">${row.share} %</span></div></td>
      <td class="num">${row.points}</td>
      <td>${badge[row.status]}</td>
    </tr>`).join('');

  $('#theme-scores tbody').innerHTML = r.themes.map((t) => `
    <tr>
      <th scope="row">${t.title}</th>
      <td><div class="bar bar-mono" title="${t.title} : ${t.score} % mis en place"><span style="--w:${t.score}%"></span></div></td>
      <td class="num">${pct.format(t.score)} %</td>
    </tr>`).join('');

  const risks = level.risks.length
    ? `<h3>Risques identifiés</h3><ul class="risk-list">${level.risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join('')}</ul>`
    : '<h3>Félicitations&nbsp;!</h3><p>Vous avez atteint le plus haut niveau de maturité Supply Chain.</p>';
  $('#level-detail').innerHTML = `
    <div class="detail-grid">
      <div>
        <h2 class="card-title">Définition du niveau obtenu</h2>
        <p class="detail-text">${escapeHtml(level.details)}</p>
      </div>
      <div class="risk-box" style="--lvl: var(--lvl-${r.level.toLowerCase()})">${risks}</div>
    </div>
    <div class="mini-levels no-print">
      ${LEVEL_ORDER.map((key) => `
        <button type="button" class="mini-level ${key === r.level ? 'is-current' : ''}" data-level="${key}" style="--lvl: var(--lvl-${key.toLowerCase()})">
          <span>Niveau ${LEVELS[key].rank}</span>${LEVELS[key].title}
        </button>`).join('')}
    </div>`;

  $('#print-date').textContent = `document généré le ${new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  // Les barres se remplissent après l'affichage
  requestAnimationFrame(() => requestAnimationFrame(() => $('#view-results').classList.add('is-animated')));
}

$('#print-report').addEventListener('click', () => window.print());
$('#expert-request').addEventListener('click', () => openSheet({
  kicker: 'Version de démonstration',
  title: 'Demander un diagnostic expert',
  html: '<p class="sheet-lead">Dans la version utilisée en entreprise, ce bouton met en relation avec un expert Supply Chain pour un diagnostic complet.</p><p>Cette démonstration n\'envoie aucune donnée. Vous pouvez en revanche télécharger votre rapport en PDF.</p>',
}));
$('#restart').addEventListener('click', () => {
  if (!sampleMode) resetState(); // l'exemple ne touche pas au diagnostic en cours
  location.hash = '#/diagnostic';
});

/* ---------- Navigation entre les écrans ---------- */
const views = { landing: $('#view-landing'), quiz: $('#view-quiz'), results: $('#view-results') };
function setView(name) {
  const changed = document.body.dataset.view !== name;
  document.body.dataset.view = name;
  Object.entries(views).forEach(([key, el]) => { el.hidden = key !== name; });
  if (changed) window.scrollTo({ top: 0, behavior: 'auto' });
  if (name !== 'results') views.results.classList.remove('is-animated');
}

function route() {
  const hash = location.hash;
  if (hash.startsWith('#/diagnostic')) {
    if (state.done) { state.done = false; save(); }
    setView('quiz');
    showQuiz();
  } else if (hash.startsWith('#/resultats')) {
    if (!isComplete()) { location.replace('#/diagnostic'); return; }
    setView('results');
    renderResults();
  } else if (hash.startsWith('#/exemple')) {
    setView('results');
    renderResults({ answers: SAMPLE_ANSWERS, lead: { entreprise: 'Entreprise exemple' }, sample: true });
  } else {
    setView('landing');
    renderResumeNote();
    const anchor = hash.length > 1 && !hash.startsWith('#/') ? document.getElementById(hash.slice(1)) : null;
    if (anchor) requestAnimationFrame(() => anchor.scrollIntoView());
  }
}
window.addEventListener('hashchange', route);

/* ---------- Apparitions au scroll + barre du haut ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in-view');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { $('#topbar').classList.toggle('scrolled', window.scrollY > 8); ticking = false; });
}, { passive: true });

/* ---------- Démarrage ---------- */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
renderLanding();
$$('.reveal').forEach((el) => revealObserver.observe(el));
route();
