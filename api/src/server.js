/* Point d'entrée : connexion à la base, préparation, puis écoute HTTP */
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { connect } from './db.js';
import { anonymizeOld, setupDatabase } from './setup.js';

const config = loadConfig();
const db = await connect(config.databaseUrl);
await setupDatabase(db, config);

// Effacement des coordonnées anciennes : au démarrage (ci-dessus), puis toutes les heures
const purge = setInterval(() => anonymizeOld(db, config.retentionDays).catch(console.error), 60 * 60 * 1000);
purge.unref();

const server = createApp({ db, config }).listen(config.port, () => {
  console.log(`API Diagnostic Supply Chain prête sur http://localhost:${config.port}/api/health`);
});

async function shutdown() {
  clearInterval(purge);
  server.close();
  await db.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
