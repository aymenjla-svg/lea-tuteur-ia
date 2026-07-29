import assert from 'node:assert/strict';
import { test } from 'node:test';

import { politiqueEvaluation, scoreSommatif } from './eval-types.js';

test('politiques des 3 types d’évaluation', () => {
  assert.equal(politiqueEvaluation('diagnostique').aide, false);
  assert.equal(politiqueEvaluation('formative').aide, true);
  assert.equal(politiqueEvaluation('formative').repetition, true);
  assert.equal(politiqueEvaluation('sommative').aide, false);
  assert.equal(politiqueEvaluation('sommative').score_final, true);
});

test('scoreSommatif : proportion de réponses justes', () => {
  assert.equal(scoreSommatif([{ correct: true }, { correct: false }, { correct: true }, { correct: true }]), 0.75);
  assert.equal(scoreSommatif([]), 0);
});
