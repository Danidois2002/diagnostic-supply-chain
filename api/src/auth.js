/* Connexion à l'espace admin : deux comptes définis par la configuration
   - admin : mot de passe privé (ADMIN_PASSWORD), accès complet
   - demo  : identifiants publics, lecture seule et données personnelles masquées */
import { createHash, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { HttpError } from './errors.js';

/* Comparaison à durée constante (empreintes de même longueur) : rien ne fuit par le temps de réponse */
const digest = (value) => createHash('sha256').update(String(value)).digest();
const same = (a, b) => timingSafeEqual(digest(a), digest(b));

function accounts(config) {
  const list = [{ username: config.demoUsername, password: config.demoPassword, role: 'demo' }];
  if (config.adminPassword) list.push({ username: config.adminUsername, password: config.adminPassword, role: 'admin' });
  return list;
}

/* Le compte correspondant, ou null. Tous les comptes sont testés, qu'il y ait une correspondance ou non. */
export function checkCredentials(config, username, password) {
  let found = null;
  for (const account of accounts(config)) {
    const userOk = same(username, account.username);
    const passwordOk = same(password, account.password);
    if (userOk && passwordOk) found = account;
  }
  return found;
}

export const signToken = (config, account) => jwt.sign({ role: account.role }, config.jwtSecret, {
  subject: account.username,
  expiresIn: '8h',
  algorithm: 'HS256',
});

/* Exige un jeton valide (en-tête Authorization: Bearer …) et place l'utilisateur dans req.user */
export function requireAuth(config) {
  return (req, _res, next) => {
    const header = req.get('Authorization') || '';
    if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Connexion requise.');
    try {
      const payload = jwt.verify(header.slice(7), config.jwtSecret, { algorithms: ['HS256'] });
      req.user = { username: payload.sub, role: payload.role };
    } catch {
      throw new HttpError(401, 'Session expirée : reconnectez-vous.');
    }
    next();
  };
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') throw new HttpError(403, 'Action réservée à l’administrateur : le compte de démonstration est en lecture seule.');
  next();
}
