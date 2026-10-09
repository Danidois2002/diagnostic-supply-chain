/* Tests de l'espace admin : connexion, droits, masquage des données, export CSV */
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { connect } from '../src/db.js';
import { maskEmail, maskPhone, maskText } from '../src/mask.js';
import { setupDatabase } from '../src/setup.js';

const ADMIN = { username: 'admin', password: 'mot-de-passe-de-test' };
const DEMO = { username: 'demo', password: 'diagnostic' };
const SIMULATIONS = 6;
let db;
let api;
let adminToken;
let demoToken;

before(async () => {
  const config = loadConfig({ SIMULATIONS: String(SIMULATIONS), ADMIN_PASSWORD: ADMIN.password, LOGIN_LIMIT: '8' });
  db = await connect('pglite://memory');
  await setupDatabase(db, config);
  api = request(createApp({ db, config }));

  const save = (lead, value) => api.post('/api/diagnostics')
    .send({ lead, answers: Array(27).fill(value), consent: true }).expect(201);
  await save({ company: 'Acme Logistique', jobTitle: 'Directrice des opérations', email: 'jeanne.dupont@acme.be', phone: '+32 470 12 34 56' }, 2);
  await save({ company: '=HYPERLINK("http://pirate.test")', jobTitle: 'Test', email: 'x@y.be' }, 1);
  await save({ company: 'Sans Contact SA', jobTitle: 'Gérant' }, 0);
});
after(() => db.close());

const login = (account) => api.post('/api/auth/login').send(account);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('connexion', () => {
  test('admin et démo reçoivent un jeton et leur rôle', async () => {
    const admin = await login(ADMIN).expect(200);
    assert.equal(admin.body.user.role, 'admin');
    adminToken = admin.body.token;
    const demo = await login(DEMO).expect(200);
    assert.equal(demo.body.user.role, 'demo');
    demoToken = demo.body.token;
  });

  test('mauvais mot de passe ou compte inconnu : même réponse 401', async () => {
    const wrong = await login({ ...ADMIN, password: 'faux' }).expect(401);
    const unknown = await login({ username: 'personne', password: 'faux' }).expect(401);
    assert.equal(wrong.body.error, unknown.body.error);
  });

  test('sans ADMIN_PASSWORD, le compte admin n’existe pas', async () => {
    const config = loadConfig({ SIMULATIONS: '0' });
    const bare = request(createApp({ db, config }));
    await bare.post('/api/auth/login').send({ username: 'admin', password: '' }).expect(400);
    await bare.post('/api/auth/login').send({ username: 'admin', password: 'admin' }).expect(401);
  });

  test('session vérifiable, jeton absent ou falsifié refusé', async () => {
    const { body } = await api.get('/api/auth/me').set(auth(demoToken)).expect(200);
    assert.deepEqual(body.user, { username: 'demo', role: 'demo' });
    await api.get('/api/admin/summary').expect(401);
    await api.get('/api/admin/summary').set(auth(`${adminToken}x`)).expect(401);
  });
});

describe('tableau de bord', () => {
  test('totaux, 30 derniers jours, niveaux, thématiques et pratiques les moins répandues', async () => {
    const { body } = await api.get('/api/admin/summary').set(auth(adminToken)).expect(200);
    assert.equal(body.totals.total, SIMULATIONS + 3);
    assert.equal(body.totals.simulated, SIMULATIONS);
    assert.equal(body.totals.with_contact, 2);
    assert.equal(body.days.length, 30);
    assert.equal(body.days.at(-1).count >= 3, true); // les 3 diagnostics du jour
    assert.equal(Object.values(body.levels).reduce((a, b) => a + b, 0), body.totals.total);
    assert.equal(body.themes.length, 7);
    assert.equal(body.weakest.length, 5);
    assert.ok(body.weakest[0].rate <= body.weakest[4].rate);
  });

  test('périmètre « réels uniquement »', async () => {
    const { body } = await api.get('/api/admin/summary?simulations=0').set(auth(demoToken)).expect(200);
    assert.equal(body.totals.total, 3);
    assert.equal(body.totals.simulated, 0);
    // Scores : « Mis en place » partout = 100, « En cours » partout = 17 (niveau 1), « Pas du tout » = 0
    assert.equal(body.totals.average_score, Math.round((100 + 17 + 0) / 3));
  });
});

describe('liste des diagnostics', () => {
  test('admin : coordonnées complètes et identifiants', async () => {
    const { body } = await api.get('/api/admin/diagnostics?simulations=0').set(auth(adminToken)).expect(200);
    assert.equal(body.total, 3);
    const acme = body.items.find((d) => d.company === 'Acme Logistique');
    assert.equal(acme.email, 'jeanne.dupont@acme.be');
    assert.equal(acme.phone, '+32 470 12 34 56');
    assert.match(acme.id, /^[A-Za-z0-9_-]{12}$/);
  });

  test('démo : données personnelles masquées, pas d’identifiant', async () => {
    const { body } = await api.get('/api/admin/diagnostics?simulations=0').set(auth(demoToken)).expect(200);
    const acme = body.items.find((d) => d.email === 'j•••@a•••.be');
    assert.ok(acme, 'e-mail masqué');
    assert.equal(acme.company, 'Ac•• Lo••••••');
    assert.equal(acme.phone, '•• •• •• 56');
    assert.equal(acme.id, null);
    assert.ok(body.items.every((d) => !JSON.stringify(d).includes('dupont')));
  });

  test('filtres : niveau, recherche (admin seulement) et pagination', async () => {
    const top = await api.get('/api/admin/diagnostics?simulations=0&level=C').set(auth(adminToken)).expect(200);
    assert.deepEqual(top.body.items.map((d) => d.company), ['Acme Logistique']);
    const search = await api.get('/api/admin/diagnostics?q=acme').set(auth(adminToken)).expect(200);
    assert.equal(search.body.total, 1);
    const demoSearch = await api.get('/api/admin/diagnostics?q=acme').set(auth(demoToken)).expect(200);
    assert.equal(demoSearch.body.total, SIMULATIONS + 3); // ignorée pour la démo
    const all = await api.get('/api/admin/diagnostics').set(auth(adminToken)).expect(200);
    assert.equal(all.body.items.length, Math.min(all.body.pageSize, SIMULATIONS + 3));
    await api.get('/api/admin/diagnostics?level=Z').set(auth(adminToken)).expect(400);
  });
});

describe('export CSV', () => {
  test('séparateur « ; », BOM, une ligne par diagnostic, formules neutralisées', async () => {
    const res = await api.get('/api/admin/export.csv?simulations=0').set(auth(adminToken)).expect(200);
    assert.match(res.headers['content-type'], /text\/csv/);
    assert.match(res.headers['content-disposition'], /attachment; filename="diagnostics-\d{4}-\d{2}-\d{2}\.csv"/);
    const text = res.text;
    assert.equal(text.charCodeAt(0), 0xfeff);
    const lines = text.trim().split('\r\n');
    assert.equal(lines.length, 4); // en-tête + 3 diagnostics
    assert.equal(lines[0].split(';').length, 8 + 7 + 27);
    assert.ok(lines.some((l) => l.includes('Mis en place')));
    assert.ok(lines.some((l) => l.includes('"\'=HYPERLINK(""http://pirate.test"")"')), 'formule précédée d’une apostrophe');
  });

  test('démo : export masqué', async () => {
    const { text } = await api.get('/api/admin/export.csv?simulations=0').set(auth(demoToken)).expect(200);
    assert.ok(!text.includes('dupont') && !text.includes('470 12'));
    assert.ok(text.includes('j•••@a•••.be'));
  });
});

describe('suppression', () => {
  test('refusée au compte de démonstration', async () => {
    const { body } = await api.get('/api/admin/diagnostics?simulations=0').set(auth(adminToken)).expect(200);
    await api.delete(`/api/admin/diagnostics/${body.items[0].id}`).set(auth(demoToken)).expect(403);
  });

  test('admin : supprime un diagnostic, puis 404', async () => {
    const { body } = await api.get('/api/admin/diagnostics?simulations=0&q=Sans').set(auth(adminToken)).expect(200);
    const { id } = body.items[0];
    await api.delete(`/api/admin/diagnostics/${id}`).set(auth(adminToken)).expect(204);
    await api.delete(`/api/admin/diagnostics/${id}`).set(auth(adminToken)).expect(404);
    await api.get(`/api/diagnostics/${id}`).expect(404);
  });

  test('les diagnostics simulés ne se suppriment pas', async () => {
    const { rows } = await db.query("SELECT id FROM diagnostics WHERE source = 'simulation' LIMIT 1");
    await api.delete(`/api/admin/diagnostics/${rows[0].id}`).set(auth(adminToken)).expect(404);
  });
});

describe('masquage', () => {
  test('texte, e-mail et téléphone', () => {
    assert.equal(maskText('Acme Logistique'), 'Ac•• Lo••••••');
    assert.equal(maskText('X'), 'X•');
    assert.equal(maskEmail('jeanne.dupont@acme.be'), 'j•••@a•••.be');
    assert.equal(maskPhone('0470/12.34.56'), '•• •• •• 56');
    assert.equal(maskText(null), null);
  });
});

describe('anti-abus', () => {
  test('au-delà de la limite de tentatives de connexion : 429', async () => {
    let status = 200;
    for (let i = 0; i < 12 && status !== 429; i += 1) ({ status } = await login({ ...ADMIN, password: 'faux' }));
    assert.equal(status, 429);
  });
});
