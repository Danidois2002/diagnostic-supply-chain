/* Configuration lue dans les variables d'environnement (voir .env.example) */
import { randomBytes } from 'node:crypto';

const list = (value, fallback) => (value || fallback).split(',').map((s) => s.trim()).filter(Boolean);

export function loadConfig(env = process.env) {
  return {
    isProd: env.NODE_ENV === 'production',
    port: Number(env.PORT) || 3000,
    // En local et pour les tests : PGlite (PostgreSQL en WebAssembly, rien à installer)
    databaseUrl: env.DATABASE_URL || 'pglite://memory',
    // Origines autorisées à appeler l'API depuis un navigateur
    corsOrigins: list(env.CORS_ORIGINS, 'http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,https://danidois2002.github.io'),
    // Durée de conservation des coordonnées, en jours (les réponses restent, anonymes)
    retentionDays: Number(env.RETENTION_DAYS) || 30,
    // Diagnostics simulés pour que la comparaison ait du sens dès le départ (0 pour désactiver)
    simulations: env.SIMULATIONS === undefined ? 40 : Number(env.SIMULATIONS),
    // Espace admin. Sans ADMIN_PASSWORD, seul le compte de démonstration (données masquées) existe.
    adminUsername: env.ADMIN_USERNAME || 'admin',
    adminPassword: env.ADMIN_PASSWORD || '',
    demoUsername: 'demo',
    demoPassword: env.DEMO_PASSWORD || 'diagnostic',
    // Clé de signature des sessions. Sans valeur : clé aléatoire, les sessions tombent au redémarrage.
    jwtSecret: env.JWT_SECRET || randomBytes(32).toString('hex'),
    // Limites anti-abus (par adresse IP)
    saveLimit: Number(env.SAVE_LIMIT) || 20, // enregistrements par heure
    loginLimit: Number(env.LOGIN_LIMIT) || 10, // tentatives de connexion par quart d'heure
    requestLimit: Number(env.REQUEST_LIMIT) || 300, // requêtes par quart d'heure
  };
}
