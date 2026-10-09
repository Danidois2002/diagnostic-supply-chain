/* Espace admin : tableau de bord, liste des diagnostics, suppression et export CSV.
   Le compte de démonstration voit tout, sauf les données personnelles (masquées) ; il ne peut rien supprimer. */
import { Router } from 'express';
import { z } from 'zod';
import { ANSWERS, LEVEL_ORDER, LEVELS, QUESTIONS, THEMES, THEME_QUESTIONS } from '../../../shared/data.js';
import { requireAdmin, requireAuth } from '../auth.js';
import { HttpError, parse } from '../errors.js';
import { maskEmail, maskPhone, maskText } from '../mask.js';

const PAGE_SIZE = 15;
const DAY = 24 * 60 * 60 * 1000;

/* ?simulations=0 : diagnostics réels uniquement (par défaut, les simulés sont inclus) */
const scopeSchema = z.object({ simulations: z.enum(['0', '1']).default('1') });
const listSchema = scopeSchema.extend({
  level: z.enum(LEVEL_ORDER).optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});

/* Clause SQL de périmètre : aucune donnée de l'utilisateur n'y entre */
const scopeSql = (simulations) => (simulations === '1' ? 'TRUE' : "source = 'web'");

/* Une ligne pour l'interface, masquée pour le compte de démonstration */
function present(row, role) {
  const demo = role !== 'admin';
  return {
    // L'identifiant ouvre le résultat public (qui affiche l'entreprise) : réservé à l'admin
    id: demo ? null : row.id,
    createdAt: row.created_at,
    source: row.source,
    company: demo ? maskText(row.company) : row.company,
    jobTitle: demo ? maskText(row.job_title) : row.job_title,
    email: demo ? maskEmail(row.email) : row.email,
    phone: demo ? maskPhone(row.phone) : row.phone,
    level: row.level.trim(),
    score: row.score,
    anonymized: Boolean(row.anonymized_at),
  };
}

/* CSV pour Excel : séparateur « ; », BOM UTF-8, et protection contre l'injection de formules */
function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
const csvLine = (cells) => cells.map(csvCell).join(';');

export function adminRoutes(db, config) {
  const router = Router();
  router.use(requireAuth(config));

  router.get('/summary', async (req, res) => {
    const { simulations } = parse(scopeSchema, req.query);
    const scope = scopeSql(simulations);
    const [totals, daily, levels, themes, questions] = await Promise.all([
      db.query(`SELECT count(*)::int AS total,
                       count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS last7,
                       count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS last30,
                       coalesce(round(avg(score)), 0)::int AS average_score,
                       count(*) FILTER (WHERE email IS NOT NULL OR phone IS NOT NULL)::int AS with_contact,
                       count(*) FILTER (WHERE source = 'simulation')::int AS simulated
                FROM diagnostics WHERE ${scope}`),
      db.query(`SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, count(*)::int AS n
                FROM diagnostics WHERE ${scope} AND created_at > now() - interval '30 days' GROUP BY 1`),
      db.query(`SELECT level, count(*)::int AS n FROM diagnostics WHERE ${scope} GROUP BY level`),
      db.query(`SELECT t.i::int AS theme, round(avg(t.v))::int AS average
                FROM diagnostics, unnest(theme_scores) WITH ORDINALITY AS t(v, i) WHERE ${scope} GROUP BY t.i`),
      db.query(`SELECT q.i::int AS question, avg(q.v)::float AS average
                FROM diagnostics, unnest(answers) WITH ORDINALITY AS q(v, i) WHERE ${scope} GROUP BY q.i`),
    ]);

    // Les 30 derniers jours, y compris ceux sans diagnostic
    const perDay = Object.fromEntries(daily.rows.map((r) => [r.day, r.n]));
    const days = Array.from({ length: 30 }, (_, k) => {
      const day = new Date(Date.now() - (29 - k) * DAY).toISOString().slice(0, 10);
      return { day, count: perDay[day] ?? 0 };
    });
    const byLevel = Object.fromEntries(LEVEL_ORDER.map((key) => [key, 0]));
    levels.rows.forEach(({ level, n }) => { byLevel[level.trim()] = n; });
    const themeOf = (n) => THEMES[THEME_QUESTIONS.findIndex((qs) => qs.includes(n))].title;

    res.json({
      totals: totals.rows[0],
      days,
      levels: byLevel,
      themes: THEMES.map((theme, i) => ({ title: theme.title, average: themes.rows.find((r) => r.theme === i + 1)?.average ?? null })),
      // Les pratiques les moins mises en place (% comme sur la page de résultats : « Mis en place » = 100 %)
      weakest: questions.rows
        .map((r) => ({ question: r.question, text: QUESTIONS[r.question - 1].text, theme: themeOf(r.question), rate: Math.round((r.average / 2) * 100) }))
        .sort((a, b) => a.rate - b.rate || a.question - b.question)
        .slice(0, 5),
    });
  });

  router.get('/diagnostics', async (req, res) => {
    const { simulations, level, q, page } = parse(listSchema, req.query);
    const where = [scopeSql(simulations)];
    const params = [];
    if (level) {
      params.push(level);
      where.push(`level = $${params.length}`);
    }
    // Recherche sur les coordonnées : réservée à l'admin (sinon elle révélerait des données masquées)
    if (q && req.user.role === 'admin') {
      params.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
      where.push(`(company ILIKE $${params.length} OR job_title ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    const clause = where.join(' AND ');
    const [count, rows] = await Promise.all([
      db.query(`SELECT count(*)::int AS n FROM diagnostics WHERE ${clause}`, params),
      db.query(
        `SELECT id, created_at, source, company, job_title, email, phone, level, score, anonymized_at
         FROM diagnostics WHERE ${clause} ORDER BY created_at DESC, id LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
        params,
      ),
    ]);
    res.json({ page, pageSize: PAGE_SIZE, total: count.rows[0].n, items: rows.rows.map((r) => present(r, req.user.role)) });
  });

  router.delete('/diagnostics/:id', requireAdmin, async (req, res) => {
    const { rows } = await db.query("DELETE FROM diagnostics WHERE id = $1 AND source = 'web' RETURNING id", [req.params.id]);
    if (!rows.length) throw new HttpError(404, 'Diagnostic introuvable.');
    res.status(204).end();
  });

  router.get('/export.csv', async (req, res) => {
    const { simulations } = parse(scopeSchema, req.query);
    const { rows } = await db.query(
      `SELECT id, created_at, source, company, job_title, email, phone, level, score, theme_scores, answers, anonymized_at
       FROM diagnostics WHERE ${scopeSql(simulations)} ORDER BY created_at DESC`,
    );
    const label = Object.fromEntries(ANSWERS.map((a) => [Number(a.value), a.label]));
    const header = ['Date (UTC)', 'Origine', 'Entreprise', 'Fonction', 'E-mail', 'Téléphone', 'Niveau', 'Score /100',
      ...THEMES.map((t) => `${t.title} (%)`), ...QUESTIONS.map((_, i) => `Q${i + 1}`)];
    const lines = rows.map((row) => {
      const shown = present(row, req.user.role);
      return csvLine([
        new Date(row.created_at).toISOString().slice(0, 16).replace('T', ' '),
        row.source === 'simulation' ? 'Simulation' : 'Site',
        shown.company, shown.jobTitle, shown.email, shown.phone,
        LEVELS[shown.level].title, row.score,
        ...row.theme_scores, ...row.answers.map((v) => label[v]),
      ]);
    });
    const date = new Date().toISOString().slice(0, 10);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="diagnostics-${date}.csv"`);
    res.set('Cache-Control', 'no-store');
    res.send(`﻿${[csvLine(header), ...lines].join('\r\n')}\r\n`);
  });

  return router;
}
