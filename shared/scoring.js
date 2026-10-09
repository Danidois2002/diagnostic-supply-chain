import { LEVEL_ORDER, QUESTIONS, THEMES, THEME_QUESTIONS } from './data.js';

/* =========================================================
   Calcul du résultat : modèle de maturité « en escalier »
   - Tout le monde part du niveau 1 (Fragmentée).
   - Chaque niveau suivant a ses questions ; il est validé quand
     au moins 70 % de leurs points sont acquis
     (« Pas du tout » = 0, « En cours » = 1, « Mis en place » = 2).
   - On ne saute pas de niveau : un niveau n'est validé que si
     les niveaux précédents le sont aussi.
   - Le score de maturité (0 à 100) suit la même échelle :
     25 points par niveau, plus la progression vers le suivant.
   ========================================================= */
export const THRESHOLD = 0.7;
export const MAX_POINTS = 2;

/* Questions qui valident chaque niveau. La seule question classée F
   (fournisseurs critiques) est une bonne pratique : elle compte pour
   sortir du niveau 1, avec celles de l'excellence interne. */
const STEP_CATEGORIES = { E: ['F', 'E'], I: ['I'], C: ['C'] };
export const STEP_QUESTIONS = Object.fromEntries(Object.entries(STEP_CATEGORIES).map(([key, cats]) => [
  key,
  QUESTIONS.flatMap((q, i) => (cats.includes(q.cat) ? [i + 1] : [])),
]));

const points = (answers, n) => Number(answers[n] ?? 0);
const sum = (values) => values.reduce((a, b) => a + b, 0);

export function computeResults(answers) {
  const steps = Object.entries(STEP_QUESTIONS).map(([key, numbers]) => {
    const earned = sum(numbers.map((n) => points(answers, n)));
    const max = numbers.length * MAX_POINTS;
    return { key, earned, max, ratio: earned / max, reached: earned / max >= THRESHOLD };
  });

  // En escalier : on monte tant que les niveaux sont validés, dans l'ordre
  let climbed = 0;
  while (climbed < steps.length && steps[climbed].reached) climbed += 1;
  steps.forEach((step, i) => {
    step.status = i < climbed ? 'validated' : step.reached ? 'pending' : 'progress';
  });
  const level = LEVEL_ORDER[climbed];

  // Progression dans le niveau atteint (0 à 1)
  const top = climbed === steps.length;
  const within = top
    ? (steps[steps.length - 1].ratio - THRESHOLD) / (1 - THRESHOLD)
    : steps[climbed].ratio / THRESHOLD;
  // Arrondi vers le bas : le score reste dans la tranche du niveau atteint (niveau 1 = 0 à 24, etc.)
  const score = Math.floor(((climbed + within) / LEVEL_ORDER.length) * 100 + 1e-9);

  // Indicateur complémentaire : degré de mise en place par thématique
  const themes = THEMES.map((theme, i) => {
    const values = THEME_QUESTIONS[i].map((n) => points(answers, n));
    return { title: theme.title, score: Math.round((sum(values) / (values.length * MAX_POINTS)) * 100) };
  });

  return { level, rank: climbed + 1, score, steps, themes };
}

/* Réponses fictives pour « Voir un exemple de résultat » (jamais sauvegardées) */
export const SAMPLE_ANSWERS = {
  ...Object.fromEntries(QUESTIONS.map((q, i) => [i + 1, { E: '2', F: '2', I: '1', C: '1' }[q.cat]])),
  3: '1', 9: '2', 12: '1', 15: '0', 19: '1', 25: '0', 26: '2',
};
