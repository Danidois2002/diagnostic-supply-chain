/* Tests de l'API sur une vraie base PostgreSQL (PGlite en mémoire, recréée pour ce fichier) */
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { connect } from '../src/db.js';
import { anonymizeOld, setupDatabase } from '../src/setup.js';

const SIMULATIONS = 10;
const lead = { company: 'Acme Logistique', jobTitle: 'Responsable supply chain', email: 'contact@acme.test', phone: '+32 470 12 34 56' };
const all = (value) => Array(27).fill(value);
let db;
let api;
let config;

before(async () => {
  config = loadConfig({ SIMULATIONS: String(SIMULATIONS), SAVE_LIMIT: '15' });
  db = await connect('pglite://memory');
  await setupDatabase(db, config);
  api = request(createApp({ db, config }));
});
after(() => db.close());

const save = (body) => api.post('/api/diagnostics').send({ lead, answers: all(2), consent: true, ...body });

describe('santé et sécurité', () => {
  test('santé', async () => {
    await api.get('/api/health').expect(200, { ok: true });
  });

  test("CORS : seul le site autorisé reçoit l'en-tête", async () => {
    const ok = await api.get('/api/health').set('Origin', 'https://danidois2002.github.io').expect(200);
    assert.equal(ok.headers['access-control-allow-origin'], 'https://danidois2002.github.io');
    const other = await api.get('/api/health').set('Origin', 'https://exemple.test').expect(200);
    assert.equal(other.headers['access-control-allow-origin'], undefined);
  });

  test('route inconnue : 404 en JSON', async () => {
    const { body } = await api.get('/api/inconnue').expect(404);
    assert.equal(body.error, 'Route introuvable.');
  });

  test('JSON invalide : 400', async () => {
    await api.post('/api/diagnostics').set('Content-Type', 'application/json').send('{pas du json').expect(400);
  });
});

describe('enregistrement', () => {
  test('« Mis en place » partout : niveau 4 et 100/100, calculés par le serveur', async () => {
    const { body } = await save({ level: 'F', score: 3 }).expect(201); // un niveau envoyé par le client est ignoré
    assert.match(body.id, /^[A-Za-z0-9_-]{12}$/);
    assert.equal(body.level, 'C');
    assert.equal(body.score, 100);
  });

  test('e-mail et téléphone facultatifs (absents ou vides)', async () => {
    await save({ lead: { company: 'Sans contact', jobTitle: 'Gérant' } }).expect(201);
    const { body } = await save({ lead: { company: 'Champs vides', jobTitle: 'Gérant', email: '', phone: '  ' }, answers: all(0) }).expect(201);
    assert.equal(body.level, 'F');
    assert.equal(body.score, 0);
  });

  test("sans accord d'enregistrement : 400", async () => {
    const { body } = await save({ consent: false }).expect(400);
    assert.equal(body.details[0].field, 'consent');
  });

  test('réponses invalides : 400 avec le détail des champs', async () => {
    const { body } = await save({ answers: [...all(1).slice(0, 26), 3] }).expect(400);
    assert.equal(body.error, 'Données invalides.');
    assert.equal(body.details[0].field, 'answers.26');
    await save({ answers: all(1).slice(0, 20) }).expect(400);
  });

  test('coordonnées invalides : 400', async () => {
    const bad = await save({ lead: { ...lead, email: 'pas-un-email', phone: '12' } }).expect(400);
    assert.deepEqual(bad.body.details.map((d) => d.field).sort(), ['lead.email', 'lead.phone']);
    await save({ lead: { ...lead, company: '   ' } }).expect(400);
  });
});

describe('lien partageable', () => {
  test("relit le diagnostic, sans e-mail, téléphone ni fonction", async () => {
    const { body: saved } = await save({ answers: all(1) }).expect(201);
    const { body } = await api.get(`/api/diagnostics/${saved.id}`).expect(200);
    assert.equal(body.company, 'Acme Logistique');
    assert.deepEqual(body.answers, all(1));
    assert.equal(body.level, 'F');
    assert.ok(!('email' in body) && !('phone' in body) && !('jobTitle' in body));
  });

  test('identifiant inconnu ou mal formé : 404', async () => {
    await api.get('/api/diagnostics/abcdefghijkl').expect(404);
    await api.get('/api/diagnostics/trop-court').expect(404);
  });

  test('les diagnostics simulés ne sont pas accessibles par lien', async () => {
    const { rows } = await db.query("SELECT id FROM diagnostics WHERE source = 'simulation' LIMIT 1");
    await api.get(`/api/diagnostics/${rows[0].id}`).expect(404);
  });
});

describe('statistiques', () => {
  test('comptes, histogramme des scores, niveaux et moyennes par thématique', async () => {
    const { rows } = await db.query('SELECT count(*)::int AS n FROM diagnostics');
    const { body } = await api.get('/api/stats').expect(200);
    assert.equal(body.total, rows[0].n);
    assert.equal(body.simulated, SIMULATIONS);
    assert.equal(body.scores.length, 101);
    assert.equal(body.scores.reduce((a, b) => a + b, 0), body.total);
    assert.equal(Object.values(body.levels).reduce((a, b) => a + b, 0), body.total);
    assert.ok(body.scores[100] >= 1); // le diagnostic « Mis en place » partout
    assert.equal(body.themes.length, 7);
    assert.ok(body.themes.every((v) => v >= 0 && v <= 100));
  });
});

describe('conservation des données', () => {
  test('après la durée de conservation, les coordonnées sont effacées mais le résultat reste', async () => {
    const { body: saved } = await save({}).expect(201);
    await db.query("UPDATE diagnostics SET created_at = now() - interval '31 days' WHERE id = $1", [saved.id]);
    assert.ok(await anonymizeOld(db, config.retentionDays) >= 1);

    const { rows } = await db.query('SELECT company, job_title, email, phone, anonymized_at, score FROM diagnostics WHERE id = $1', [saved.id]);
    assert.deepEqual([rows[0].company, rows[0].job_title, rows[0].email, rows[0].phone], [null, null, null, null]);
    assert.ok(rows[0].anonymized_at);
    assert.equal(rows[0].score, 100);
    const { body } = await api.get(`/api/diagnostics/${saved.id}`).expect(200);
    assert.equal(body.company, null);
  });

  test('les diagnostics récents gardent leurs coordonnées', async () => {
    const { body: saved } = await save({}).expect(201);
    await anonymizeOld(db, config.retentionDays);
    const { rows } = await db.query('SELECT email FROM diagnostics WHERE id = $1', [saved.id]);
    assert.equal(rows[0].email, 'contact@acme.test');
  });
});

describe('anti-abus', () => {
  test("au-delà de la limite d'enregistrements par heure : 429", async () => {
    let status = 201;
    for (let i = 0; i < 20 && status !== 429; i += 1) ({ status } = await save({}));
    assert.equal(status, 429);
  });
});
