/**
 * Entrée navigateur — fait tourner le VRAI moteur déterministe côté client.
 *
 * Pour le visu déployé sur GitHub Pages (statique, sans backend), on bundle
 * exactement la même construction que `src/api/serveur.ts` : même moteur, même
 * curriculum, même Planificateur, mais en mémoire dans l'onglet. Le moteur ne
 * dépend d'aucun LLM (le `texte_tuteur` est déterministe), donc rien à appeler
 * en réseau.
 *
 * IMPORTANT : on importe les modules un par un (PAS le baril `engine/index.ts`)
 * pour ne PAS tirer `pg` / `@anthropic` / `yaml`, qui sont Node-only.
 *
 * Expose `window.LeaEngine` avec les mêmes formes que l'API HTTP :
 *   creerSession()          → { session_id, etat }
 *   repondre(id, texte)     → { etat }
 *   dashboard()             → IndicateursDashboard
 */

import type {
  ContexteSession,
  EleveId,
  ObjectifId,
  ParametresPedagogie,
  PersonaId,
  SessionId,
  TenantId,
} from '../../src/contracts/index.js';
import { id, nouvelId, HorlogeManuelle } from '../../src/engine/core.js';
import {
  curriculumPhysique,
  catalogueErreursPhysique,
  OBJ_VITESSE,
} from '../../src/engine/curriculum/physique.js';
import { HeuristicLearnerModel } from '../../src/engine/learner-model/heuristic-learner-model.js';
import { MagasinMemoire } from '../../src/engine/persistence/in-memory-store.js';
import { MinimalSafetyFilter } from '../../src/engine/safety/minimal-safety-filter.js';
import { VerifierStandard } from '../../src/engine/verifier/verifier-standard.js';
import { MoteurLecon } from '../../src/engine/session/lecon.js';
import { tableauDeBord } from '../../src/engine/dashboard/dashboard.js';

const PEDAGOGIE: ParametresPedagogie = {
  seuil_blocage: 2,
  ordre_leviers: ['simplifier', 'reformuler', 'changer_de_modalite'],
  modalite_par_defaut: 'textuel',
  seuil_maitrise: 0.8,
  intensite_encouragement: 0.7,
};

const tenant_id = id<TenantId>('tenant-demo');
// Horloge déterministe : contenu reproductible (1er exercice vitesse
// 150 km / 3 h = 50 km/h, prérequis 12 m / 4 s = 3 m/s), ce qui rend le visu
// stable et permet une amorce de démo aux réponses connues.
const horloge = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));
const curriculum = curriculumPhysique(tenant_id, horloge);
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
  pedagogie: PEDAGOGIE,
  catalogueErreurs: catalogueErreursPhysique(tenant_id, horloge),
});

async function creerSession(
  objectifId?: string,
): Promise<{ session_id: string; etat: unknown }> {
  const session_id = nouvelId<SessionId>();
  const contexte: ContexteSession = {
    session_id,
    eleve_id: id<EleveId>('eleve-demo'),
    persona_id: id<PersonaId>('persona-lea'),
    objectif_initial: (objectifId ? id<ObjectifId>(objectifId) : OBJ_VITESSE) as ObjectifId,
  };
  const etat = await moteur.demarrer(contexte);
  return { session_id, etat };
}

async function repondre(session_id: string, texte: string): Promise<{ etat: unknown }> {
  horloge.avancer(30_000); // 30 s par échange (comme la démo) → maîtrise/decay réalistes
  const etat = await moteur.repondre(id<SessionId>(session_id), texte);
  return { etat };
}

function dashboard(): unknown {
  return tableauDeBord(magasin);
}

/**
 * Amorce une session scriptée (erreur → levier → réussites → maîtrise) pour que
 * le tableau de bord affiche des indicateurs réels au premier chargement, même
 * sans backend. Idempotent-ish : à n'appeler qu'une fois par onglet.
 */
let amorce = false;
async function amorcerDemo(): Promise<void> {
  if (amorce) return;
  amorce = true;
  const session_id = nouvelId<SessionId>();
  const contexte: ContexteSession = {
    session_id,
    eleve_id: id<EleveId>('eleve-demo'),
    persona_id: id<PersonaId>('persona-lea'),
    objectif_initial: OBJ_VITESSE as ObjectifId,
  };
  let etat = await moteur.demarrer(contexte);
  // Séquence connue (physique) : 150 km en 3 h → 50 km/h. Deux erreurs (450 =
  // 150×3) → levier R7, prérequis 12 m/4 s = 3 m/s, puis bonnes réponses.
  for (const t of ['450', '450', '3', '50', '50', '50', '50']) {
    if ((etat as { termine?: boolean }).termine) break;
    horloge.avancer(30_000);
    etat = await moteur.repondre(session_id, t);
  }
}

declare global {
  interface Window {
    LeaEngine: {
      creerSession: typeof creerSession;
      repondre: typeof repondre;
      dashboard: typeof dashboard;
      amorcerDemo: typeof amorcerDemo;
    };
  }
}

window.LeaEngine = { creerSession, repondre, dashboard, amorcerDemo };
