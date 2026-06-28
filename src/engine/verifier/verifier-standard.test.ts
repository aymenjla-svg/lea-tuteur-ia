import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Question } from '../../contracts/index.js';
import { VerifierStandard } from './verifier-standard.js';

const v = new VerifierStandard();

const numerique: Question = {
  kind: 'numeric',
  modalite: 'textuel',
  enonce: 'Combien font 27 + 48 ?',
  attendu: { valeur: 75, tolerance: 0 },
};

test('numeric : réponse exacte → correct', async () => {
  const verdict = await v.verifier(numerique, { texte: '75' });
  assert.equal(verdict.correct, true);
});

test('numeric : accepte la virgule décimale et la tolérance', async () => {
  const q: Question = {
    kind: 'numeric',
    modalite: 'textuel',
    enonce: 'π ?',
    attendu: { valeur: 3.14, tolerance: 0.01 },
  };
  assert.equal((await v.verifier(q, { texte: '3,15' })).correct, true);
  assert.equal((await v.verifier(q, { texte: '3,2' })).correct, false);
});

test('numeric : réponse fausse → diagnostic + erreur-type', async () => {
  const verdict = await v.verifier(numerique, { texte: '70' });
  assert.equal(verdict.correct, false);
  assert.equal(verdict.erreur_type_id, 'ecart_numerique');
  assert.match(verdict.diagnostic ?? '', /75/);
});

test('numeric : réponse non numérique → refusée', async () => {
  const verdict = await v.verifier(numerique, { texte: 'beaucoup' });
  assert.equal(verdict.correct, false);
  assert.equal(verdict.erreur_type_id, 'reponse_non_numerique');
});

test('qcm : sélection exacte requise', async () => {
  const q: Question = {
    kind: 'qcm',
    modalite: 'textuel',
    enonce: 'Lesquels sont pairs ?',
    options: [
      { id: 'a', libelle: '2' },
      { id: 'b', libelle: '3' },
      { id: 'c', libelle: '4' },
    ],
    bonnes_reponses: ['a', 'c'],
    choix_multiple: true,
  };
  assert.equal((await v.verifier(q, { options_choisies: ['a', 'c'] })).correct, true);
  assert.equal((await v.verifier(q, { options_choisies: ['a'] })).correct, false);
});
