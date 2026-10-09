/* Application Express : sécurité, routes et gestion des erreurs */
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { HttpError } from './errors.js';
import { adminRoutes } from './routes/admin.js';
import { authRoutes } from './routes/auth.js';
import { diagnosticRoutes } from './routes/diagnostics.js';

export function createApp({ db, config }) {
  const app = express();
  app.set('trust proxy', 1); // derrière le proxy de l'hébergeur : la vraie IP sert aux limites anti-abus
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }));
  app.use(express.json({ limit: '10kb' }));
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.requestLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
  }));

  app.get('/api/health', async (_req, res) => {
    await db.query('SELECT 1');
    res.json({ ok: true });
  });
  app.use('/api/auth', authRoutes(config));
  app.use('/api/admin', adminRoutes(db, config));
  app.use('/api', diagnosticRoutes(db, config));

  app.use((_req, res) => res.status(404).json({ error: 'Route introuvable.' }));

  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message, ...(err.details && { details: err.details }) });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Le corps de la requête n’est pas du JSON valide.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Requête trop volumineuse.' });
    console.error(err);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  });

  return app;
}
