import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ComplianceContext } from '../../contracts/index.js';
import { LLMGatewayStub } from './llm-gateway-stub.js';

const gateway = new LLMGatewayStub();

function conformite(est_mineur: boolean, no_train: boolean): ComplianceContext {
  return { est_mineur, consentement_adulte: true, no_train, region: 'eu-west' };
}

test('§1.7 : mineur ⇒ provider conforme + no-train, même en BYOK', () => {
  for (const mode of ['inclus', 'byok'] as const) {
    const p = gateway.resoudreProvider(conformite(true, true), mode);
    assert.equal(p.conforme_mineur, true);
    assert.equal(p.no_train, true);
  }
});

test('§1.7 : aucun provider conforme pour mineur ⇒ on LÈVE (jamais de contournement)', () => {
  const sansConforme = new LLMGatewayStub([
    { nom: 'x', conforme_mineur: false, no_train: false, modes: ['byok'] },
  ]);
  assert.throws(() => sansConforme.resoudreProvider(conformite(true, true), 'byok'));
});

test('majeur en BYOK ⇒ peut router vers un provider générique', () => {
  const p = gateway.resoudreProvider(conformite(false, false), 'byok');
  assert.ok(p.nom.length > 0);
});

test('streamer vérifie la conformité avant de générer', async () => {
  const fragments: string[] = [];
  for await (const f of gateway.streamer({
    messages: [{ role: 'user', contenu: 'bonjour' }],
    outils: [],
    conformite: conformite(true, true),
    mode_ia: 'inclus',
    role_appelant: 'eleve',
  })) {
    if (f.type === 'texte') fragments.push(f.delta);
  }
  assert.ok(fragments.join('').includes('editeur-conforme'));
});
