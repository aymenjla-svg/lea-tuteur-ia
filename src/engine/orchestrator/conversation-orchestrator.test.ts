import assert from 'node:assert/strict';
import { test } from 'node:test';

import type {
  ComplianceContext,
  ContexteSession,
  EleveId,
  ParametresPedagogie,
  PersonaId,
  SessionId,
  SortieOrchestrateur,
  TenantId,
} from '../../contracts/index.js';
import { curriculumDemo, OBJ_ADDITION } from '../curriculum/in-memory-curriculum.js';
import { HorlogeManuelle, id } from '../core.js';
import { HeuristicLearnerModel } from '../learner-model/heuristic-learner-model.js';
import { MagasinMemoire } from '../persistence/in-memory-store.js';
import { MinimalSafetyFilter } from '../safety/minimal-safety-filter.js';
import { VerifierStandard } from '../verifier/verifier-standard.js';
import { ConversationOrchestrateur } from './conversation-orchestrator.js';
import { LLMTuteurScripte } from './llm-scripte.js';

const pedagogie: ParametresPedagogie = {
  seuil_blocage: 2,
  ordre_leviers: ['simplifier', 'reformuler', 'changer_de_modalite'],
  modalite_par_defaut: 'textuel',
  seuil_maitrise: 0.8,
  intensite_encouragement: 0.7,
};

const conformite: ComplianceContext = {
  est_mineur: true,
  consentement_adulte: true,
  no_train: true,
  region: 'eu-west',
};

function banc() {
  const tenant_id = id<TenantId>('t');
  const horloge = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));
  const curriculum = curriculumDemo(tenant_id, horloge);
  const magasin = new MagasinMemoire();
  const orch = new ConversationOrchestrateur({
    tenant_id,
    gateway: new LLMTuteurScripte(),
    verifier: new VerifierStandard(),
    learnerModel: new HeuristicLearnerModel(tenant_id, curriculum, horloge),
    safety: new MinimalSafetyFilter(tenant_id, horloge),
    curriculum,
    magasin,
    horloge,
    pedagogie,
    conformite,
    mode_ia: 'inclus',
  });
  const session_id = id<SessionId>('s');
  const contexte: ContexteSession = {
    session_id,
    eleve_id: id<EleveId>('e'),
    persona_id: id<PersonaId>('persona-lea'),
    objectif_initial: OBJ_ADDITION,
  };
  return { orch, magasin, session_id, contexte };
}

/** Pilote une session : répond `reponses` à chaque `attente_reponse`. */
async function jouer(reponses: string[]) {
  const { orch, magasin, session_id, contexte } = banc();
  const sorties: SortieOrchestrateur[] = [];
  let i = 0;
  for await (const ev of orch.demarrer(contexte)) {
    sorties.push(ev);
    if (ev.type === 'attente_reponse') {
      if (i < reponses.length) await orch.recevoirEleve(session_id, reponses[i++] as string);
      else await orch.clore(session_id);
    }
  }
  return { sorties, magasin };
}

test('boucle agentique : présente, vérifie, enregistre, clôt sur maîtrise', async () => {
  const { sorties, magasin } = await jouer(['75', '75', '75', '75', '75']);

  const paroles = sorties.filter((s) => s.type === 'parole').map((s) => (s as { delta: string }).delta);
  assert.ok(paroles.some((p) => p.includes('C’est parti')), 'présentation');
  assert.ok(paroles.some((p) => p.includes('Bravo')), 'retour positif');

  // Le verifier (code dur) a réellement tourné : 3 succès → maîtrise → clôture.
  assert.ok(magasin.tentatives.length >= 3);
  assert.ok(magasin.tentatives.every((t) => t.verdict.correct));
  assert.ok(sorties.some((s) => s.type === 'session_close'));
  assert.ok(magasin.evenements.evenements.some((e) => e.type === 'objectif_maitrise'));
});

test('le coup proposer est émis à chaque présentation', async () => {
  const { sorties } = await jouer(['75', '75', '75']);
  const coups = sorties.filter((s) => s.type === 'coup');
  assert.ok(coups.length >= 1);
});

test('détresse dans une réponse → alerte escaladée, sans interrompre la boucle', async () => {
  const { magasin } = await jouer(['je veux mourir', '75', '75', '75']);
  assert.ok(magasin.alertes.length >= 1);
  assert.equal(magasin.alertes[0]?.escalade_requise, true);
});

test('§1.7 : une session mineur exige un provider conforme (sinon la boucle lèverait)', async () => {
  // Le LLM scriptable délègue la résolution à LLMGatewayStub : ici un provider
  // conforme existe, donc la session démarre et produit de la parole.
  const { sorties } = await jouer(['75']);
  assert.ok(sorties.some((s) => s.type === 'parole'));
});
