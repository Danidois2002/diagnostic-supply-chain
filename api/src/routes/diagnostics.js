/* Routes publiques : enregistrer un diagnostic, le relire par son lien, statistiques anonymes */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { LEVEL_ORDER, QUESTIONS, THEMES } from '../../../shared/data.js';
import { HttpError, parse } from '../errors.js';
import { insertDiagnostic } from '../setup.js';

/* Champ texte facultatif : une chaîne vide vaut « non renseigné » */
const optional = (schema) => z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema.optional());

const diagnosticSchema = z.object({
  lead: z.object({
    company: z.string().trim().min(1, "Indiquez le nom de l'entreprise.").max(120),
    jobTitle: z.string().trim().min(1, 'Indiquez votre fonction.').max(120),
    email: optional(z.string().trim().max(254).pipe(z.email('Adresse e-mail invalide.'))),
    phone: optional(z.string().trim().max(30).refine((v) => v.replace(/\D/g, '').length >= 9, 'Numéro de téléphone invalide.')),
  }),
  answers: z.array(z.number().int().min(0).max(2)).length(QUESTIONS.length, `${QUESTIONS.length} réponses attendues.`),
  consent: z.literal(true, { error: "L'accord pour enregistrer le diagnostic est obligatoire." }),
});

const ID_PATTERN = /^[A-Za-z0-9_-]{12}$/;

export function diagnosticRoutes(db, config) {
  const router = Router();

  const saveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: config.saveLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Trop de diagnostics enregistrés depuis cette connexion. Réessayez plus tard.' },
  });

  // Enregistre un diagnostic : le serveur recalcule lui-même le niveau et le score
  router.post('/diagnostics', saveLimiter, async (req, res) => {
    const { lead, answers } = parse(diagnosticSchema, req.body);
    const saved = await insertDiagnostic(db, { answers, lead });
    res.status(201).json(saved);
  });

  // Relit un diagnostic par son lien. Jamais d'e-mail, de téléphone ni de fonction : seulement l'entreprise.
  router.get('/diagnostics/:id', async (req, res) => {
    if (!ID_PATTERN.test(req.params.id)) throw new HttpError(404, 'Diagnostic introuvable.');
    const { rows } = await db.query(
      "SELECT id, created_at, company, answers, level, score FROM diagnostics WHERE id = $1 AND source = 'web'",
      [req.params.id],
    );
    if (!rows.length) throw new HttpError(404, 'Diagnostic introuvable.');
    const row = rows[0];
    res.json({ id: row.id, createdAt: row.created_at, company: row.company, answers: row.answers, level: row.level.trim(), score: row.score });
  });

  // Statistiques anonymes pour se comparer aux autres entreprises
  router.get('/stats', async (_req, res) => {
    const [totals, scores, levels, themes] = await Promise.all([
      db.query("SELECT count(*)::int AS total, count(*) FILTER (WHERE source = 'simulation')::int AS simulated FROM diagnostics"),
      db.query('SELECT score, count(*)::int AS n FROM diagnostics GROUP BY score'),
      db.query('SELECT level, count(*)::int AS n FROM diagnostics GROUP BY level'),
      db.query(`SELECT t.i::int AS theme, round(avg(t.v))::int AS average
                FROM diagnostics, unnest(theme_scores) WITH ORDINALITY AS t(v, i)
                GROUP BY t.i ORDER BY t.i`),
    ]);
    const histogram = Array(101).fill(0);
    scores.rows.forEach(({ score, n }) => { histogram[score] = n; });
    const byLevel = Object.fromEntries(LEVEL_ORDER.map((key) => [key, 0]));
    levels.rows.forEach(({ level, n }) => { byLevel[level.trim()] = n; });
    const themeAverages = THEMES.map((_, i) => themes.rows.find((r) => r.theme === i + 1)?.average ?? null);

    res.set('Cache-Control', 'public, max-age=60');
    res.json({ ...totals.rows[0], scores: histogram, levels: byLevel, themes: themeAverages });
  });

  return router;
}
