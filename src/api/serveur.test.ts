import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';

import type { TenantId } from '../contracts/index.js';
import { HorlogeManuelle, id } from '../engine/index.js';
import { creerServeurApi } from './serveur.js';

const serveur = creerServeurApi({
  tenant_id: id<TenantId>('t'),
  horloge: new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z')),
});
let base = '';

before(async () => {
  await new Promise<void>((r) => serveur.listen(0, '127.0.0.1', r));
  const port = (serveur.address() as AddressInfo).port;
  base = `http://127.0.0.1:${port}`;
});
after(() => {
  serveur.close();
});

async function post(chemin: string, corps: unknown): Promise<{ code: number; data: any }> {
  const res = await fetch(base + chemin, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corps),
  });
  return { code: res.status, data: await res.json() };
}

test('GET /health', async () => {
  const res = await fetch(base + '/health');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

test('POST /sessions démarre une session et propose un exercice', async () => {
  const { code, data } = await post('/sessions', {});
  assert.equal(code, 201);
  assert.ok(typeof data.session_id === 'string');
  assert.equal(data.etat.dernier_coup.type, 'proposer');
  assert.match(data.etat.question_courante.enonce, /150 km/);
});

test('parcours complet via HTTP jusqu’à la maîtrise + dashboard', async () => {
  const { data: dem } = await post('/sessions', {});
  const sid = dem.session_id as string;

  let etat = dem.etat;
  for (let i = 0; i < 6 && !etat.termine; i++) {
    const r = await post(`/sessions/${sid}/repondre`, { texte: '60' });
    assert.equal(r.code, 200);
    etat = r.data.etat;
  }
  assert.equal(etat.termine, true);
  assert.equal(etat.dernier_coup.type, 'clore');

  const tb = (await (await fetch(base + '/dashboard')).json()) as {
    tentatives_total: number;
    taux_reussite: number;
  };
  assert.ok(tb.tentatives_total >= 3);
  assert.ok(tb.taux_reussite > 0);
});

test('GET /eleves/:id/prochaine-action : à froid → travailler le prérequis (DAG)', async () => {
  const res = await fetch(base + '/eleves/eleve-plan/prochaine-action');
  assert.equal(res.status, 200);
  const data = (await res.json()) as { action: { type: string; objectif_id?: string } };
  assert.equal(data.action.type, 'travailler');
  assert.equal(data.action.objectif_id, 'obj-vitesse-relation');
});

test('POST /sessions {auto:true} démarre sur l’objectif planifié', async () => {
  const { code, data } = await post('/sessions', { eleve_id: 'eleve-plan2', auto: true });
  assert.equal(code, 201);
  assert.equal(data.action.type, 'travailler');
  assert.match(data.etat.question_courante.enonce, /12 m/); // prérequis : grandeur-quotient
});

test('sert le front : GET / → HTML', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  assert.match(await res.text(), /<title>[^<]*Léa/i);
});

test('sert les assets : GET /app.js → JavaScript', async () => {
  const res = await fetch(base + '/app.js');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /javascript/);
});

test('sert le tableau de bord éducateur : GET /dashboard.html → HTML', async () => {
  const res = await fetch(base + '/dashboard.html');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /tableau de bord/i);
});

test('pas d’accès hors de web/ : GET /package.json → 404', async () => {
  const res = await fetch(base + '/package.json');
  assert.equal(res.status, 404);
});

test('réponse sur session inconnue → 404', async () => {
  const { code } = await post('/sessions/inconnue/repondre', { texte: '75' });
  assert.equal(code, 404);
});

test('texte manquant → 400', async () => {
  const { data: dem } = await post('/sessions', {});
  const { code } = await post(`/sessions/${dem.session_id}/repondre`, {});
  assert.equal(code, 400);
});
