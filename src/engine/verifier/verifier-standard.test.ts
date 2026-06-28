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

test('numeric : un piège prof révèle l’erreur-type (oubli_retenue)', async () => {
  const q: Question = {
    kind: 'numeric',
    modalite: 'textuel',
    enonce: '27 + 48 ?',
    attendu: { valeur: 75, tolerance: 0 },
    pieges: [{ valeur: 65, erreur_type_id: 'oubli_retenue' }],
  };
  const verdict = await v.verifier(q, { texte: '65' });
  assert.equal(verdict.correct, false);
  assert.equal(verdict.erreur_type_id, 'oubli_retenue');
});

test('qcm : sélection exacte requise + erreur-type sur distracteur', async () => {
  const q: Question = {
    kind: 'qcm',
    modalite: 'textuel',
    enonce: 'Lesquels sont pairs ?',
    options: [
      { id: 'a', libelle: '2' },
      { id: 'b', libelle: '3', erreur_type_id: 'confond_pair_impair' },
      { id: 'c', libelle: '4' },
    ],
    bonnes_reponses: ['a', 'c'],
    choix_multiple: true,
  };
  assert.equal((await v.verifier(q, { options_choisies: ['a', 'c'] })).correct, true);
  const faux = await v.verifier(q, { options_choisies: ['b'] });
  assert.equal(faux.correct, false);
  assert.equal(faux.erreur_type_id, 'confond_pair_impair');
});

test('symbolic : équivalence algébrique par échantillonnage', async () => {
  const q: Question = {
    kind: 'symbolic',
    modalite: 'textuel',
    enonce: 'Développe 2(x+1).',
    attendu: { expression: '2*(x+1)', variables: ['x'] },
  };
  assert.equal((await v.verifier(q, { texte: '2x+2' })).correct, true);
  assert.equal((await v.verifier(q, { texte: '2*x + 2' })).correct, true);
  assert.equal((await v.verifier(q, { texte: '2x+1' })).correct, false);
  assert.equal((await v.verifier(q, { texte: 'x+x+2' })).correct, true);
});

test('libre : grille de critères par mots-clés', async () => {
  const q: Question = {
    kind: 'libre',
    modalite: 'textuel',
    enonce: 'Explique pourquoi la somme est paire.',
    criteres: [
      { id: 'c1', description: 'évoque la parité', requis: true, mots_cles: ['pair'] },
      { id: 'c2', description: 'évoque la somme', requis: true, mots_cles: ['somme'] },
    ],
  };
  const bon = await v.verifier(q, {
    texte: 'La somme de deux nombres pairs reste paire.',
  });
  assert.equal(bon.correct, true);
  assert.deepEqual([...bon.criteres_satisfaits].sort(), ['c1', 'c2']);

  const partiel = await v.verifier(q, { texte: 'C’est pair.' });
  assert.equal(partiel.correct, false);
});
