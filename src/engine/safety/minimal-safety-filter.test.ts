import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { EleveId, SessionId, TenantId } from '../../contracts/index.js';
import { HorlogeManuelle, id } from '../core.js';
import { MinimalSafetyFilter } from './minimal-safety-filter.js';

const ctx = { eleve_id: id<EleveId>('e'), session_id: id<SessionId>('s') };

function filtre() {
  const horloge = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));
  return new MinimalSafetyFilter(id<TenantId>('t'), horloge);
}

test('sortie humiliante → réécriture neutre (jamais laissée passer, §1.3)', async () => {
  const res = await filtre().filtrer('Tu es nul, recommence.', 'llm_sortie', ctx);
  assert.equal(res.decision, 'reecrire');
  assert.ok(res.texte_sur && res.texte_sur.length > 0);
  assert.ok(!/nul/i.test(res.texte_sur));
  assert.deepEqual([...res.categories], ['humiliation']);
});

test('sortie bienveillante → autorisée telle quelle', async () => {
  const res = await filtre().filtrer('Bravo, continue comme ça !', 'llm_sortie', ctx);
  assert.equal(res.decision, 'autoriser');
  assert.equal(res.texte_sur, undefined);
});

test('détresse en entrée → alerte critique escaladée (R5/§9)', async () => {
  const res = await filtre().filtrer('je veux mourir', 'eleve_entree', ctx);
  // On n'empêche pas l'enfant de s'exprimer…
  assert.equal(res.decision, 'autoriser');
  // …mais on lève une alerte escaladée.
  assert.ok(res.alerte);
  assert.equal(res.alerte?.severite, 'critique');
  assert.equal(res.alerte?.escalade_requise, true);
  assert.ok(res.categories.includes('detresse'));
});

test('entrée banale → aucune alerte', async () => {
  const res = await filtre().filtrer('je crois que c’est 75', 'eleve_entree', ctx);
  assert.equal(res.decision, 'autoriser');
  assert.equal(res.alerte, undefined);
});
