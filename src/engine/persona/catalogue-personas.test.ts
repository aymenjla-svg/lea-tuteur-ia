import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { TenantId } from '../../contracts/index.js';
import { HorlogeManuelle, id } from '../core.js';
import { cataloguePersonasDemo, matcherPersona } from './catalogue-personas.js';

function catalogue() {
  const horloge = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));
  return cataloguePersonasDemo(id<TenantId>('t'), horloge);
}

test('les personas diffèrent par leur PÉDAGOGIE, pas seulement l’apparence (H2)', async () => {
  const [lea, noah] = await catalogue().lister();
  assert.ok(lea && noah);
  assert.notDeepEqual(lea?.pedagogie, noah?.pedagogie);
  assert.notEqual(lea?.pedagogie.modalite_par_defaut, noah?.pedagogie.modalite_par_defaut);
  // Mais le cadre (invariants) reste géré par le moteur, pas par la persona.
});

test('matcherPersona privilégie la modalité indiquée (indice doux R7)', async () => {
  const personas = await catalogue().lister();
  const visuel = matcherPersona(personas, { modalite_preferee: 'visuel' });
  assert.equal(visuel?.pedagogie.modalite_par_defaut, 'visuel');
  // Sans indice : renvoie une persona par défaut (jamais null si catalogue non vide).
  assert.ok(matcherPersona(personas));
  assert.equal(matcherPersona([]), null);
});
