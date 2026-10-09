import { LEVEL_ORDER, QUESTIONS, THEMES, THEME_QUESTIONS } from '../data.js';

/* ---------- Calcul du résultat (même logique que la version d'origine) ---------- */
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

export function computeResults(answers) {
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

/* Réponses fictives pour « Voir un exemple de résultat » (jamais sauvegardées) */
export const SAMPLE_ANSWERS = {
  ...Object.fromEntries(QUESTIONS.map((q, i) => [i + 1, { E: '2', F: '2', I: '1', C: '1' }[q.cat]])),
  3: '1', 9: '2', 12: '1', 15: '0', 19: '1', 25: '0', 26: '2',
};
