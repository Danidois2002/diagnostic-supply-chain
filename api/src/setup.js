/* Préparation de la base : schéma, diagnostics simulés, effacement des coordonnées anciennes */
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { QUESTIONS } from '../../shared/data.js';
import { computeResults } from '../../shared/scoring.js';

export const newId = () => randomBytes(9).toString('base64url'); // 12 caractères, impossible à deviner

/* Enregistre un diagnostic ; le résultat est toujours recalculé ici, jamais repris du client */
export async function insertDiagnostic(db, { answers, lead = {}, source = 'web', createdAt = null }) {
  const result = computeResults(Object.fromEntries(answers.map((value, i) => [i + 1, value])));
  const id = newId();
  const { rows } = await db.query(
    `INSERT INTO diagnostics (id, created_at, source, company, job_title, email, phone, answers, level, score, theme_scores)
     VALUES ($1, COALESCE($2::timestamptz, now()), $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, created_at`,
    [id, createdAt, source, lead.company ?? null, lead.jobTitle ?? null, lead.email ?? null, lead.phone ?? null,
      answers, result.level, result.score, result.themes.map((t) => t.score)],
  );
  return { id: rows[0].id, createdAt: rows[0].created_at, level: result.level, score: result.score };
}

/* Diagnostics simulés, toujours les mêmes (générateur pseudo-aléatoire à graine fixe) :
   des profils d'entreprises plus ou moins matures, avec des niveaux 3 et 4 plus exigeants */
export function simulatedAnswers(count) {
  let seed = 2025;
  const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const difficulty = { F: 0, E: 0, I: 0.3, C: 0.7 };
  return Array.from({ length: count }, () => {
    const maturity = (random() + random()) / 2 + 0.15;
    return QUESTIONS.map((q) => {
      const x = maturity * 1.5 - difficulty[q.cat] + (random() - 0.5) * 0.9;
      return x < 0.3 ? 0 : x < 0.75 ? 1 : 2;
    });
  });
}

/* Coordonnées effacées après la durée de conservation : il ne reste que des réponses anonymes */
export async function anonymizeOld(db, retentionDays) {
  const { rows } = await db.query(
    `UPDATE diagnostics
     SET company = NULL, job_title = NULL, email = NULL, phone = NULL, anonymized_at = now()
     WHERE source = 'web' AND anonymized_at IS NULL AND created_at < now() - make_interval(days => $1)
     RETURNING id`,
    [retentionDays],
  );
  return rows.length;
}

export async function setupDatabase(db, config) {
  await db.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));

  const { rows } = await db.query("SELECT count(*)::int AS n FROM diagnostics WHERE source = 'simulation'");
  if (rows[0].n === 0 && config.simulations > 0) {
    const day = 24 * 60 * 60 * 1000;
    const all = simulatedAnswers(config.simulations);
    for (const [i, answers] of all.entries()) {
      // Étalés sur les dernières semaines, du plus ancien au plus récent
      await insertDiagnostic(db, { answers, source: 'simulation', createdAt: new Date(Date.now() - (all.length - i) * day / 2) });
    }
  }

  await anonymizeOld(db, config.retentionDays);
}
