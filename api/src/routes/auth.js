/* Connexion à l'espace admin */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { checkCredentials, requireAuth, signToken } from '../auth.js';
import { HttpError, parse } from '../errors.js';

const loginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});

export function authRoutes(config) {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.loginLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Trop de tentatives de connexion. Réessayez dans un quart d’heure.' },
  });

  router.post('/login', loginLimiter, (req, res) => {
    const { username, password } = parse(loginSchema, req.body);
    const account = checkCredentials(config, username, password);
    // Même message que le compte existe ou non
    if (!account) throw new HttpError(401, 'Identifiant ou mot de passe incorrect.');
    res.json({ token: signToken(config, account), user: { username: account.username, role: account.role } });
  });

  // Vérifie une session déjà ouverte (au rechargement de la page)
  router.get('/me', requireAuth(config), (req, res) => res.json({ user: req.user }));

  return router;
}
