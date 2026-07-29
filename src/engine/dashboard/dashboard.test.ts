import assert from 'node:assert/strict';
import { test } from 'node:test';

import type {
  ContexteSession,
  EleveId,
  ParametresPedagogie,
  PersonaId,
  SessionId,
  TenantId,
} from '../../contracts/index.js';
import { curriculumDemo, OBJ_ADDITION } from '../curriculum/in-memory-curriculum.js';
import { catalogueErreursDemo } from '../erreurs/catalogue-erreurs.js';
import { HorlogeManuelle, id } from '../core.js';
import { HeuristicLearnerModel } from '../learner-model/heuristic-learner-model.js';
import { MagasinMemoire } from '../persistence/in-memory-store.js';
import { MinimalSafetyFilter } from '../safety/minimal-safety-filter.js';
import { VerifierStandard } from '../verifier/verifier-standard.js';
import { MoteurLecon } from '../session/lecon.js';
import { tableauDeBord } from './dashboard.js';

const pedagogie: ParametresPedagogie = {
  seuil_blocage: 2,
  ordre_leviers: ['simplifier', 'reformuler', 'changer_de_modalite'],
  modalite_par_defaut: 'textuel',
  seuil_maitrise: 0.8,
  intensite_encouragement: 0.7,
};

test('tableauDeBord agrège tentatives, erreurs-types et événements', async () => {
  const tenant_id = id<TenantId>('t');
  const horloge = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));
  const curriculum = curriculumDemo(tenant_id, horloge);
  const learnerModel = new HeuristicLearnerModel(tenant_id, curriculum, horloge);
  const magasin = new MagasinMemoire();
  const moteur = new MoteurLecon({
    tenant_id,
    curriculum,
    verifier: new VerifierStandard(),
    learnerModel,
    safety: new MinimalSafetyFilter(tenant_id, horloge),
    magasin,
    horloge,
    pedagogie,
    catalogueErreurs: catalogueErreursDemo(tenant_id, horloge),
  });

  const session_id = id<SessionId>('s');
  const contexte: ContexteSession = {
    session_id,
    eleve_id: id<EleveId>('e'),
    persona_id: id<PersonaId>('p'),
    objectif_initial: OBJ_ADDITION,
  };

  let etat = await moteur.demarrer(contexte);
  await moteur.repondre(session_id, '65'); // erreur oubli_retenue
  for (let i = 0; i < 6 && !etat.termine; i++) {
    etat = await moteur.repondre(session_id, '75');
  }

  const profil = await learnerModel.profilCompetences(id<EleveId>('e'));
  const tb = tableauDeBord(magasin, [profil]);

  assert.ok(tb.tentatives_total >= 4, `total=${tb.tentatives_total}`);
  assert.ok(tb.tentatives_reussies >= 1);
  assert.ok(tb.taux_reussite > 0 && tb.taux_reussite <= 1);
  assert.equal(tb.erreurs_types.oubli_retenue, 1);
  assert.equal(tb.evenements.tentative_enregistree, tb.tentatives_total);
  assert.equal(tb.sessions, 1);
  assert.equal(tb.profils.length, 1);
});
