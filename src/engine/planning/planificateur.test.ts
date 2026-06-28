import assert from 'node:assert/strict';
import { test } from 'node:test';

import type {
  EleveId,
  ISODateTime,
  ObjectifId,
  TenantId,
  Tentative,
} from '../../contracts/index.js';
import {
  curriculumDemo,
  OBJ_ADDITION,
  OBJ_PREREQ,
  REF_BO,
} from '../curriculum/in-memory-curriculum.js';
import { HorlogeManuelle, id, nouvelId } from '../core.js';
import { HeuristicLearnerModel } from '../learner-model/heuristic-learner-model.js';
import { VerifierStandard } from '../verifier/verifier-standard.js';
import { Planificateur } from './planificateur.js';

const tenant_id = id<TenantId>('t');
const eleve_id = id<EleveId>('e');
const verifier = new VerifierStandard();

function banc() {
  const horloge = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));
  const curriculum = curriculumDemo(tenant_id, horloge);
  const learner = new HeuristicLearnerModel(tenant_id, curriculum, horloge);
  const plan = new Planificateur(curriculum, learner, 0.8);
  return { horloge, curriculum, learner, plan };
}

async function reussir(
  learner: HeuristicLearnerModel,
  objectif_id: ObjectifId,
  n: number,
  horloge: HorlogeManuelle,
): Promise<void> {
  const verdict = await verifier.verifier(
    { kind: 'numeric', modalite: 'textuel', enonce: 'x', attendu: { valeur: 1, tolerance: 0 } },
    { texte: '1' },
  );
  for (let i = 0; i < n; i++) {
    const t: ISODateTime = horloge.maintenant();
    const tentative: Tentative = {
      tenant_id, id: nouvelId(), eleve_id, objectif_id,
      template_id: id('tmpl'), type_evaluation: 'formative',
      verdict, horodatage: t, cree_le: t, modifie_le: t,
    };
    await learner.enregistrerTentative(tentative);
    horloge.avancer(1000);
  }
}

test('départ à froid → travailler le premier objectif (racine du DAG)', async () => {
  const { plan, horloge } = banc();
  const action = await plan.prochaineAction(eleve_id, REF_BO, horloge.maintenant());
  assert.equal(action.type, 'travailler');
  assert.equal((action as { objectif_id: ObjectifId }).objectif_id, OBJ_PREREQ);
});

test('prérequis maîtrisé → l’objectif suivant se débloque', async () => {
  const { plan, learner, horloge } = banc();
  await reussir(learner, OBJ_PREREQ, 4, horloge);
  const action = await plan.prochaineAction(eleve_id, REF_BO, horloge.maintenant());
  assert.equal(action.type, 'travailler');
  assert.equal((action as { objectif_id: ObjectifId }).objectif_id, OBJ_ADDITION);
});

test('tout maîtrisé → rien à faire', async () => {
  const { plan, learner, horloge } = banc();
  await reussir(learner, OBJ_PREREQ, 5, horloge);
  await reussir(learner, OBJ_ADDITION, 5, horloge);
  const action = await plan.prochaineAction(eleve_id, REF_BO, horloge.maintenant());
  assert.equal(action.type, 'rien');
});

test('après decay → priorité à la révision (D4)', async () => {
  const { plan, learner, horloge } = banc();
  await reussir(learner, OBJ_PREREQ, 5, horloge);
  horloge.avancer(40 * 86_400_000); // un mois et plus
  const action = await plan.prochaineAction(eleve_id, REF_BO, horloge.maintenant());
  assert.equal(action.type, 'reviser');
  assert.equal((action as { objectif_id: ObjectifId }).objectif_id, OBJ_PREREQ);
});

test('plan diagnostique : ordre topologique (prérequis avant dépendants)', async () => {
  const { plan } = banc();
  const ordre = await plan.planDiagnostique(REF_BO);
  const ids = ordre.map((o) => o.id);
  assert.ok(ids.indexOf(OBJ_PREREQ) < ids.indexOf(OBJ_ADDITION));
});
