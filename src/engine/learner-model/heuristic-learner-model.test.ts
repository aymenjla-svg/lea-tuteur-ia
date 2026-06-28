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
import { HeuristicLearnerModel } from './heuristic-learner-model.js';

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
  const modele = new HeuristicLearnerModel(tenant_id, curriculum, horloge);
  return { horloge, modele };
}

test('un succès fait monter la maîtrise, un échec la fait baisser', async () => {
  const { horloge, modele } = fabrique();
  const t = horloge.maintenant();

  const m1 = await modele.enregistrerTentative(tentative(await verdict(true), t));
  assert.ok(m1.probabilite_maitrise > 0.1, 'succès > prior');

  const m2 = await modele.enregistrerTentative(tentative(await verdict(false), t));
  assert.ok(
    m2.probabilite_maitrise < m1.probabilite_maitrise,
    'échec fait redescendre',
  );
  assert.ok(m2.derniere_reussite !== undefined, 'la dernière réussite est conservée');
});

test('decay D4 : la maîtrise effective décroît avec le temps (demi-vie)', async () => {
  const { horloge, modele } = fabrique();
  await modele.enregistrerTentative(tentative(await verdict(true), horloge.maintenant()));

  const immediat = await modele.niveauMaitrise(eleve_id, OBJ_ADDITION, horloge.maintenant());

  horloge.avancer(7 * 86_400_000); // demi-vie par défaut = 7 jours
  const apres = await modele.niveauMaitrise(eleve_id, OBJ_ADDITION, horloge.maintenant());

  const ratio = apres.probabilite_effective / immediat.probabilite_effective;
  assert.ok(Math.abs(ratio - 0.5) < 0.02, `≈ moitié après une demi-vie (ratio=${ratio})`);
});

test('objectif jamais travaillé : ni maîtrisé ni à réviser', async () => {
  const { horloge, modele } = fabrique();
  const eff = await modele.niveauMaitrise(eleve_id, OBJ_ADDITION, horloge.maintenant());
  assert.equal(eff.probabilite_effective, 0);
  assert.equal(eff.a_reviser, false);
});

test('objectifsAReviser remonte un objectif décayé sous le seuil', async () => {
  const { horloge, modele } = fabrique();
  for (let i = 0; i < 4; i++) {
    await modele.enregistrerTentative(tentative(await verdict(true), horloge.maintenant()));
    horloge.avancer(1000);
  }
  horloge.avancer(30 * 86_400_000); // un mois plus tard
  const aReviser = await modele.objectifsAReviser(eleve_id, horloge.maintenant());
  assert.equal(aReviser.length, 1);
  assert.equal(aReviser[0]?.objectif_id, OBJ_ADDITION);
});

test('profilCompetences agrège sur les 6 compétences', async () => {
  const { horloge, modele } = fabrique();
  await modele.enregistrerTentative(tentative(await verdict(true), horloge.maintenant()));
  const profil = await modele.profilCompetences(eleve_id);
  // OBJ_ADDITION porte « calculer » et « chercher ».
  assert.ok(profil.niveaux.calculer > 0);
  assert.ok(profil.niveaux.chercher > 0);
  assert.equal(profil.niveaux.communiquer, 0);
});
