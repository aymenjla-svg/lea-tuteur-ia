import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import type { ObjectifId, TenantId } from '../../contracts/index.js';
import { HorlogeManuelle, id } from '../core.js';
import { HeuristicLearnerModel } from '../learner-model/heuristic-learner-model.js';
import { Planificateur } from '../planning/planificateur.js';
import { VerifierStandard } from '../verifier/verifier-standard.js';
import { chargerCurriculumFichier, chargerCurriculumYaml } from './yaml-loader.js';

const tenant_id = id<TenantId>('t');
const FICHIER = fileURLToPath(
  new URL('../../../content/bo-cycle3-maths.yaml', import.meta.url),
);

function charger() {
  const horloge = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));
  const { curriculum, referentiel_id } = chargerCurriculumFichier(FICHIER, tenant_id, horloge);
  return { horloge, curriculum, referentiel_id };
}

test('charge le contenu BO cycle 3 : 5 objectifs + DAG', async () => {
  const { curriculum, referentiel_id } = charger();
  const objs = await curriculum.objectifs(referentiel_id);
  assert.equal(objs.length, 5);

  const mult = id<ObjectifId>('obj-multiplication-posee');
  const prereqs = (await curriculum.prerequisDirects(mult)).map((o) => o.id);
  assert.ok(prereqs.includes(id<ObjectifId>('obj-tables-multiplication')));
  assert.ok(prereqs.includes(id<ObjectifId>('obj-addition-posee')));
});

test('questions et pièges (erreurs-types) chargés correctement', async () => {
  const { curriculum } = charger();
  const templates = await curriculum.templatesPourObjectif(id<ObjectifId>('obj-addition-posee'));
  const q = templates[0]?.etapes[0]?.question;
  assert.ok(q && q.kind === 'numeric');
  if (q?.kind === 'numeric') {
    assert.equal(q.attendu.valeur, 75);
    assert.equal(q.pieges?.[0]?.erreur_type_id, 'oubli_retenue');
    // Le verifier code dur valide la bonne réponse.
    assert.equal((await new VerifierStandard().verifier(q, { texte: '75' })).correct, true);
  }
});

test('le planificateur ordonne le DAG chargé (prérequis avant dépendants)', async () => {
  const { curriculum, referentiel_id, horloge } = charger();
  const learner = new HeuristicLearnerModel(tenant_id, curriculum, horloge);
  const plan = new Planificateur(curriculum, learner, 0.8);
  const ordre = (await plan.planDiagnostique(referentiel_id)).map((o) => o.id);
  assert.ok(
    ordre.indexOf(id<ObjectifId>('obj-tables-multiplication')) <
      ordre.indexOf(id<ObjectifId>('obj-multiplication-posee')),
  );
  assert.ok(
    ordre.indexOf(id<ObjectifId>('obj-addition-posee')) <
      ordre.indexOf(id<ObjectifId>('obj-multiplication-posee')),
  );
});

test('YAML invalide (compétence inconnue) → lève au chargement', () => {
  const horloge = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));
  const mauvais = `
referentiel: { id: r, libelle: x, version: "1" }
objectifs:
  - id: o1
    libelle: x
    notion: n
    competences: [voler]
`;
  assert.throws(() => chargerCurriculumYaml(mauvais, tenant_id, horloge), /Compétence inconnue/);
});
