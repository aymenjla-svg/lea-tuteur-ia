import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ExerciceTemplate, TenantId } from '../../contracts/index.js';
import { HorlogeManuelle, id } from '../core.js';
import { VerifierStandard } from '../verifier/verifier-standard.js';
import { ExerciceAEtapes } from './exercice-a-etapes.js';

function templateDeuxEtapes(): ExerciceTemplate {
  const t = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z')).maintenant();
  return {
    tenant_id: id<TenantId>('t'),
    id: id('tmpl-2etapes'),
    objectif_id: id('obj'),
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    cree_le: t,
    modifie_le: t,
    representations: [],
    etapes: [
      {
        ordre: 1,
        question: { kind: 'numeric', modalite: 'textuel', enonce: 'Unités : 7 + 8 ?', attendu: { valeur: 15, tolerance: 0 } },
        indice: 'Compte sur tes doigts.',
      },
      {
        ordre: 2,
        question: { kind: 'numeric', modalite: 'textuel', enonce: 'Total : 27 + 48 ?', attendu: { valeur: 75, tolerance: 0 } },
      },
    ],
  };
}

test('parcours des étapes : avance sur succès, termine à la dernière', async () => {
  const ex = new ExerciceAEtapes(templateDeuxEtapes(), new VerifierStandard());
  assert.equal(ex.progression.total, 2);

  const r1 = await ex.repondre('15');
  assert.equal(r1.avance, true);
  assert.equal(r1.termine, false);
  assert.equal(ex.progression.etape, 1);

  const r2 = await ex.repondre('75');
  assert.equal(r2.avance, true);
  assert.equal(r2.termine, true);
  assert.equal(ex.etapeCourante(), null);
});

test('échec : on reste sur l’étape et l’indice est fourni', async () => {
  const ex = new ExerciceAEtapes(templateDeuxEtapes(), new VerifierStandard());
  const r = await ex.repondre('14');
  assert.equal(r.avance, false);
  assert.equal(r.indice, 'Compte sur tes doigts.');
  assert.equal(ex.progression.etape, 0);
});
