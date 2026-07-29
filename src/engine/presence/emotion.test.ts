import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expressionVerdict, estPositive } from './emotion.js';

test('verdict correct → celebrate (positif)', () => {
  const e = expressionVerdict(true);
  assert.equal(e, 'celebrate');
  assert.ok(estPositive(e));
});

test('erreur → jamais positif (invariant A1 : pas de félicitation du faux)', () => {
  for (const echecs of [0, 1, 2, 5]) {
    const e = expressionVerdict(false, echecs);
    assert.ok(!estPositive(e), `échecs=${echecs} ne doit pas être positif (${e})`);
  }
});

test('erreur : encouraging au 1er faux, concerned quand le blocage s’installe', () => {
  assert.equal(expressionVerdict(false, 0), 'encouraging');
  assert.equal(expressionVerdict(false, 1), 'concerned');
  assert.equal(expressionVerdict(false, 3), 'concerned');
});
