import assert from 'node:assert/strict';
import { test } from 'node:test';

import { rngDepuisGraine } from '../core.js';
import { genAdditionAvecRetenue } from './banque.js';

test('genAdditionAvecRetenue : déterministe à graine fixe', () => {
  const q1 = genAdditionAvecRetenue(rngDepuisGraine(42));
  const q2 = genAdditionAvecRetenue(rngDepuisGraine(42));
  assert.deepEqual(q1, q2);
});

test('genAdditionAvecRetenue : retenue garantie + piège oubli_retenue', () => {
  for (let graine = 1; graine <= 50; graine++) {
    const q = genAdditionAvecRetenue(rngDepuisGraine(graine));
    assert.equal(q.kind, 'numeric');
    if (q.kind !== 'numeric') continue;
    // L'énoncé contient deux opérandes dont les unités somment ≥ 10.
    const m = /(\d+) \+ (\d+)/.exec(q.enonce);
    assert.ok(m);
    const a = Number(m?.[1]);
    const b = Number(m?.[2]);
    assert.ok(((a % 10) + (b % 10)) >= 10, `retenue sur les unités (${a}+${b})`);
    assert.equal(q.attendu.valeur, a + b);
    assert.equal(q.pieges?.[0]?.valeur, a + b - 10);
    assert.equal(q.pieges?.[0]?.erreur_type_id, 'oubli_retenue');
  }
});
