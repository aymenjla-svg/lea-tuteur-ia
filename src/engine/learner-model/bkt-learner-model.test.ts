import assert from 'node:assert/strict';
import { test } from 'node:test';

import type {
  EleveId,
  ISODateTime,
  Question,
  TenantId,
  Tentative,
  Verdict,
} from '../../contracts/index.js';
import { curriculumDemo, OBJ_ADDITION } from '../curriculum/in-memory-curriculum.js';
import { HorlogeManuelle, id, nouvelId } from '../core.js';
import { VerifierStandard } from '../verifier/verifier-standard.js';
import { BktLearnerModel } from './bkt-learner-model.js';

const tenant_id = id<TenantId>('t');
const eleve_id = id<EleveId>('e');
const verifier = new VerifierStandard();
const question: Question = {
  kind: 'numeric',
  modalite: 'textuel',
  enonce: '27 + 48 ?',
  attendu: { valeur: 75, tolerance: 0 },
};

async function verdict(correct: boolean): Promise<Verdict> {
  return verifier.verifier(question, { texte: correct ? '75' : '70' });
}
function tentative(v: Verdict, t: ISODateTime): Tentative {
  return {
    tenant_id,
    id: nouvelId(),
    eleve_id,
    objectif_id: OBJ_ADDITION,
    template_id: id('tmpl'),
    type_evaluation: 'formative',
    verdict: v,
    horodatage: t,
    cree_le: t,
    modifie_le: t,
  };
}
function fabrique() {
  const horloge = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));
  const curriculum = curriculumDemo(tenant_id, horloge);
  return { horloge, modele: new BktLearnerModel(tenant_id, curriculum, horloge) };
}

test('BKT : la maîtrise croît avec des succès répétés', async () => {
  const { horloge, modele } = fabrique();
  let p = 0;
  for (let i = 0; i < 4; i++) {
    const m = await modele.enregistrerTentative(tentative(await verdict(true), horloge.maintenant()));
    assert.ok(m.probabilite_maitrise >= p, 'monotone croissante');
    p = m.probabilite_maitrise;
    horloge.avancer(1000);
  }
  assert.ok(p > 0.8, `converge haut (p=${p})`);
});

test('BKT : un échec abaisse le postérieur', async () => {
  const { horloge, modele } = fabrique();
  const m1 = await modele.enregistrerTentative(tentative(await verdict(true), horloge.maintenant()));
  horloge.avancer(1000);
  const m2 = await modele.enregistrerTentative(tentative(await verdict(false), horloge.maintenant()));
  assert.ok(m2.probabilite_maitrise < m1.probabilite_maitrise);
});

test('BKT : implémente le même contrat (decay + profil)', async () => {
  const { horloge, modele } = fabrique();
  await modele.enregistrerTentative(tentative(await verdict(true), horloge.maintenant()));
  const avant = await modele.niveauMaitrise(eleve_id, OBJ_ADDITION, horloge.maintenant());
  horloge.avancer(20 * 86_400_000);
  const apres = await modele.niveauMaitrise(eleve_id, OBJ_ADDITION, horloge.maintenant());
  assert.ok(apres.probabilite_effective < avant.probabilite_effective);
  const profil = await modele.profilCompetences(eleve_id);
  assert.ok(profil.niveaux.calculer >= 0);
});
