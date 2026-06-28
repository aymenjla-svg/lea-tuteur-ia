import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ComplianceContext } from '../../contracts/index.js';
import { AnthropicLLMGateway } from './anthropic-gateway.js';

// Clé factice : permet de construire le client sans réseau (aucune requête
// n'est émise — seul `resoudreProvider` est testé, qui est pur).
function gateway(conformeMineur: boolean): AnthropicLLMGateway {
  return new AnthropicLLMGateway({ apiKey: 'cle-de-test', conformeMineur });
}

function conformite(est_mineur: boolean, no_train: boolean): ComplianceContext {
  return { est_mineur, consentement_adulte: true, no_train, region: 'eu-west' };
}

test('§1.7 : mineur sur déploiement conforme + no-train → autorisé', () => {
  const p = gateway(true).resoudreProvider(conformite(true, true), 'inclus');
  assert.equal(p.nom, 'anthropic');
  assert.equal(p.conforme_mineur, true);
  assert.equal(p.no_train, true);
});

test('§1.7 : mineur sur déploiement NON conforme → lève', () => {
  assert.throws(() => gateway(false).resoudreProvider(conformite(true, true), 'inclus'));
});

test('§1.7 : mineur sans no-train → lève (même si déploiement conforme)', () => {
  assert.throws(() => gateway(true).resoudreProvider(conformite(true, false), 'byok'));
});

test('majeur → autorisé', () => {
  const p = gateway(true).resoudreProvider(conformite(false, false), 'byok');
  assert.equal(p.nom, 'anthropic');
});
