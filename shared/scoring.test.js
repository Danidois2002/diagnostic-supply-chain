import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { QUESTIONS } from './data.js';
import { computeResults, SAMPLE_ANSWERS, STEP_QUESTIONS } from './scoring.js';

/* Réponses où chaque question vaut `value`, sauf celles précisées */
const answersWith = (value, overrides = {}) => ({
  ...Object.fromEntries(QUESTIONS.map((_, i) => [i + 1, String(value)])),
  ...Object.fromEntries(Object.entries(overrides).map(([n, v]) => [n, String(v)])),
});
/* Donne la même réponse à toutes les questions d'un niveau */
const forStep = (key, value) => Object.fromEntries(STEP_QUESTIONS[key].map((n) => [n, value]));

describe('calcul du niveau de maturité', () => {
  it('répartit les 27 questions entre les 3 niveaux à valider', () => {
    assert.deepEqual(Object.values(STEP_QUESTIONS).map((qs) => qs.length), [18, 7, 2]);
    assert.equal(Object.values(STEP_QUESTIONS).flat().length, QUESTIONS.length);
  });

  it('« Mis en place » partout donne le niveau maximal et 100/100', () => {
    const r = computeResults(answersWith(2));
    assert.equal(r.level, 'C');
    assert.equal(r.rank, 4);
    assert.equal(r.score, 100);
    assert.ok(r.steps.every((s) => s.status === 'validated'));
    assert.ok(r.themes.every((t) => t.score === 100));
  });

  it('« Pas du tout » partout donne le niveau 1 et 0/100', () => {
    const r = computeResults(answersWith(0));
    assert.equal(r.level, 'F');
    assert.equal(r.score, 0);
    assert.ok(r.steps.every((s) => s.status === 'progress'));
  });

  it('« En cours » partout reste au niveau 1 (50 % des points, sous le seuil de 70 %)', () => {
    const r = computeResults(answersWith(1));
    assert.equal(r.level, 'F');
    assert.ok(r.score > 0 && r.score < 25);
  });

  it('chaque niveau est atteignable', () => {
    assert.equal(computeResults({ ...answersWith(0), ...forStep('E', '2') }).level, 'E');
    assert.equal(computeResults({ ...answersWith(0), ...forStep('E', '2'), ...forStep('I', '2') }).level, 'I');
    assert.equal(computeResults({ ...answersWith(0), ...forStep('E', '2'), ...forStep('I', '2'), ...forStep('C', '2') }).level, 'C');
  });

  it('on ne saute pas de niveau : sans le niveau 2, les niveaux 3 et 4 restent en attente', () => {
    const r = computeResults({ ...answersWith(0), ...forStep('I', '2'), ...forStep('C', '2') });
    assert.equal(r.level, 'F');
    assert.deepEqual(r.steps.map((s) => s.status), ['progress', 'pending', 'pending']);
  });

  it('valide un niveau à partir de 70 % de ses points', () => {
    const [a, b, c] = STEP_QUESTIONS.I;
    const base = { ...answersWith(2), ...forStep('I', '1'), ...forStep('C', '0') }; // Intégration : 7 points sur 14
    const nine = computeResults({ ...base, [a]: '2', [b]: '2' });
    const ten = computeResults({ ...base, [a]: '2', [b]: '2', [c]: '2' });
    assert.equal(nine.steps[1].earned, 9);
    assert.equal(nine.level, 'E'); // 64 % : pas encore validé
    assert.equal(ten.steps[1].earned, 10);
    assert.equal(ten.level, 'I'); // 71 % : validé
  });

  it('niveau 4 : un « Mis en place » et un « En cours » suffisent (75 %), deux « En cours » non (50 %)', () => {
    const [a, b] = STEP_QUESTIONS.C;
    assert.equal(computeResults(answersWith(2, { [a]: 2, [b]: 1 })).level, 'C');
    assert.equal(computeResults(answersWith(2, { [a]: 1, [b]: 1 })).level, 'I');
  });

  it('la question sur les fournisseurs critiques fait monter le score au lieu de le faire baisser', () => {
    const q = QUESTIONS.findIndex((x) => x.cat === 'F') + 1;
    const without = computeResults(answersWith(1, { [q]: 0 }));
    const withIt = computeResults(answersWith(1, { [q]: 2 }));
    assert.ok(withIt.score > without.score);
  });

  it('le score reste dans la tranche du niveau atteint (2 000 diagnostics simulés)', () => {
    // Générateur pseudo-aléatoire reproductible ; chaque entreprise simulée a sa propre tendance
    let seed = 42;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const seen = new Set();
    for (let k = 0; k < 2000; k += 1) {
      const tendency = random();
      const answers = Object.fromEntries(QUESTIONS.map((_, i) => [i + 1, String(Math.min(2, Math.floor((random() + tendency) * 1.6)))]));
      const { level, rank, score } = computeResults(answers);
      seen.add(level);
      assert.ok(score >= (rank - 1) * 25 && score <= (rank === 4 ? 100 : rank * 25 - 1), `niveau ${rank}, score ${score}`);
    }
    assert.equal(seen.size, 4, 'les simulations couvrent les 4 niveaux');
  });

  it("l'exemple de résultat correspond au niveau affiché sur l'accueil (Excellence interne)", () => {
    assert.equal(computeResults(SAMPLE_ANSWERS).level, 'E');
  });
});
