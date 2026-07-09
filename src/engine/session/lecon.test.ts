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
import {
  curriculumDemo,
  OBJ_ADDITION,
  OBJ_PREREQ,
} from '../curriculum/in-memory-curriculum.js';
import {
  catalogueErreursPhysique,
  curriculumPhysique,
  OBJ_VITESSE,
} from '../curriculum/physique.js';
import { catalogueErreursDemo } from '../erreurs/catalogue-erreurs.js';
import { HorlogeManuelle, id } from '../core.js';
import { HeuristicLearnerModel } from '../learner-model/heuristic-learner-model.js';
import { MagasinMemoire } from '../persistence/in-memory-store.js';
import { MinimalSafetyFilter } from '../safety/minimal-safety-filter.js';
import { VerifierStandard } from '../verifier/verifier-standard.js';
import { MoteurLecon } from './lecon.js';

const pedagogie: ParametresPedagogie = {
  seuil_blocage: 2,
  ordre_leviers: ['simplifier', 'reformuler', 'changer_de_modalite'],
  modalite_par_defaut: 'textuel',
  seuil_maitrise: 0.8,
  intensite_encouragement: 0.7,
};

function banc(
  options: {
    avecCatalogue?: boolean;
    type_evaluation?: import('../../contracts/index.js').TypeEvaluation;
  } = {},
) {
  const tenant_id = id<TenantId>('t');
  const horloge = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));
  const curriculum = curriculumDemo(tenant_id, horloge);
  const magasin = new MagasinMemoire();
  const moteur = new MoteurLecon({
    tenant_id,
    curriculum,
    verifier: new VerifierStandard(),
    learnerModel: new HeuristicLearnerModel(tenant_id, curriculum, horloge),
    safety: new MinimalSafetyFilter(tenant_id, horloge),
    magasin,
    horloge,
    pedagogie,
    ...(options.avecCatalogue
      ? { catalogueErreurs: catalogueErreursDemo(tenant_id, horloge) }
      : {}),
    ...(options.type_evaluation ? { type_evaluation: options.type_evaluation } : {}),
  });
  const session_id = id<SessionId>('s');
  const contexte: ContexteSession = {
    session_id,
    eleve_id: id<EleveId>('e'),
    persona_id: id<PersonaId>('p'),
    objectif_initial: OBJ_ADDITION,
  };
  return { moteur, magasin, session_id, contexte, horloge };
}

test('demarrer propose un exercice de l’objectif visé', async () => {
  const { moteur, contexte } = banc();
  const etat = await moteur.demarrer(contexte);
  assert.equal(etat.dernier_coup.type, 'proposer');
  assert.equal(etat.objectif_courant, OBJ_ADDITION);
  assert.match(etat.question_courante?.enonce ?? '', /27 \+ 48/);
  assert.equal(etat.termine, false);
});

test('un échec sous le seuil → re-proposer avec indice (pas la solution)', async () => {
  const { moteur, contexte, session_id } = banc();
  await moteur.demarrer(contexte);
  const etat = await moteur.repondre(session_id, '70');
  assert.equal(etat.dernier_coup.type, 'proposer');
  assert.match(etat.texte_tuteur, /Indice/);
  assert.doesNotMatch(etat.texte_tuteur, /\b75\b/); // ne donne pas la réponse
});

test('blocage (2 échecs) → levier simplifier vers le prérequis (R7)', async () => {
  const { moteur, contexte, session_id } = banc();
  await moteur.demarrer(contexte);
  await moteur.repondre(session_id, '70');
  const etat = await moteur.repondre(session_id, '60');
  assert.equal(etat.dernier_coup.type, 'simplifier');
  assert.equal(etat.objectif_courant, OBJ_PREREQ);
  assert.match(etat.question_courante?.enonce ?? '', /7 \+ 8/);
});

test('réussir le prérequis fait remonter vers l’objectif initial', async () => {
  const { moteur, contexte, session_id } = banc();
  await moteur.demarrer(contexte);
  await moteur.repondre(session_id, '70');
  await moteur.repondre(session_id, '60');
  const etat = await moteur.repondre(session_id, '15'); // 7 + 8
  assert.equal(etat.objectif_courant, OBJ_ADDITION);
  assert.equal(etat.dernier_coup.type, 'proposer');
});

test('succès répétés → maîtrise atteinte → coup clore + session terminée', async () => {
  const { moteur, contexte, session_id, magasin } = banc();
  let etat = await moteur.demarrer(contexte);
  for (let i = 0; i < 6 && !etat.termine; i++) {
    etat = await moteur.repondre(session_id, '75');
  }
  assert.equal(etat.termine, true);
  assert.equal(etat.dernier_coup.type, 'clore');
  assert.ok(etat.maitrise_cible.probabilite_effective >= pedagogie.seuil_maitrise);
  // Invariants §13 : tout a été persisté + tracé.
  assert.ok(magasin.tentatives.length >= 1);
  assert.ok(magasin.evenements.evenements.some((e) => e.type === 'objectif_maitrise'));
  assert.ok(magasin.evenements.evenements.every((e) => e.tenant_id === 't'));
});

test('erreur-type détectée → le tuteur parle la remédiation (pas la réponse)', async () => {
  const { moteur, contexte, session_id } = banc({ avecCatalogue: true });
  await moteur.demarrer(contexte);
  const etat = await moteur.repondre(session_id, '65'); // oubli de la retenue
  assert.match(etat.texte_tuteur, /colonne/i); // remédiation du catalogue
  assert.doesNotMatch(etat.texte_tuteur, /\b75\b/); // ne révèle pas la réponse
});

test('éval sommative : pas d’aide à l’échec + tentative typée sommative (D2)', async () => {
  const { moteur, contexte, session_id, magasin } = banc({
    avecCatalogue: true,
    type_evaluation: 'sommative',
  });
  await moteur.demarrer(contexte);
  const etat = await moteur.repondre(session_id, '65'); // erreur oubli_retenue
  assert.doesNotMatch(etat.texte_tuteur, /colonne|Indice/); // aucune aide en sommatif
  assert.equal(magasin.tentatives[0]?.type_evaluation, 'sommative');
});

test('coup reviser : propose un objectif dû après decay, sinon null', async () => {
  const { moteur, contexte, session_id, horloge } = banc();
  let etat = await moteur.demarrer(contexte);
  for (let i = 0; i < 6 && !etat.termine; i++) {
    etat = await moteur.repondre(session_id, '75');
  }
  // Juste après, rien à réviser.
  assert.equal(await moteur.reviser(session_id), null);
  // Un mois plus tard, la maîtrise a décru → objectif dû.
  horloge.avancer(30 * 86_400_000);
  const revision = await moteur.reviser(session_id);
  assert.ok(revision);
  assert.equal(revision?.dernier_coup.type, 'reviser');
});

test('détresse pendant la leçon → alerte persistée + événement safety', async () => {
  const { moteur, contexte, session_id, magasin } = banc();
  await moteur.demarrer(contexte);
  await moteur.repondre(session_id, 'je veux mourir');
  assert.equal(magasin.alertes.length, 1);
  assert.equal(magasin.alertes[0]?.escalade_requise, true);
  assert.ok(magasin.evenements.evenements.some((e) => e.type === 'safety_alert'));
});

/* --- Étayage : décomposition guidée (P1) --------------------------------- */

function bancPhysique() {
  const tenant_id = id<TenantId>('t');
  const horloge = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));
  const curriculum = curriculumPhysique(tenant_id, horloge);
  const magasin = new MagasinMemoire();
  const moteur = new MoteurLecon({
    tenant_id,
    curriculum,
    verifier: new VerifierStandard(),
    learnerModel: new HeuristicLearnerModel(tenant_id, curriculum, horloge),
    safety: new MinimalSafetyFilter(tenant_id, horloge),
    magasin,
    horloge,
    pedagogie,
    catalogueErreurs: catalogueErreursPhysique(tenant_id, horloge),
  });
  const session_id = id<SessionId>('s');
  const contexte: ContexteSession = {
    session_id,
    eleve_id: id<EleveId>('e'),
    persona_id: id<PersonaId>('p'),
    objectif_initial: OBJ_VITESSE,
  };
  return { moteur, magasin, session_id, contexte };
}

test('« je suis perdu » → décomposition guidée pas-à-pas, sans donner la réponse', async () => {
  const { moteur, contexte, session_id } = bancPhysique();
  await moteur.demarrer(contexte);

  // Demande d'aide → on entre en mode pas-à-pas sur la 1ʳᵉ sous-étape.
  const e1 = await moteur.repondre(session_id, 'je suis perdu');
  assert.equal(e1.guidage?.etape, 1);
  assert.equal(e1.guidage?.total, 2);
  assert.match(e1.texte_tuteur, /Étape 1/);
  assert.doesNotMatch(e1.texte_tuteur, /\b60\b/); // jamais le résultat final

  // Sous-étape 1 (conversion) : 2 h 30 = 2,5 h → on avance.
  const e2 = await moteur.repondre(session_id, '2,5');
  assert.equal(e2.guidage?.etape, 2);
  assert.equal(e2.guidage?.unite, 'km/h');
  assert.match(e2.texte_tuteur, /Étape 2/);

  // Sous-étape 2 (division) : 150 / 2,5 = 60 → fin du déroulé, on repose l'exo.
  const e3 = await moteur.repondre(session_id, '60');
  assert.equal(e3.guidage, undefined);
  assert.match(e3.texte_tuteur, /exercice complet/i);

  // « Tu fais » : l'élève pose la réponse complète tout seul → acceptée.
  const e4 = await moteur.repondre(session_id, '60');
  assert.notEqual(e4.dernier_coup.type, 'encourager');
});

test('maîtrise crédible : pas de « maîtrise en une réponse » (≥ N réussites)', async () => {
  const { moteur, contexte, session_id } = bancPhysique();
  let etat = await moteur.demarrer(contexte);
  const rep = () =>
    String((etat.question_courante as { attendu: { valeur: number } }).attendu.valeur);
  // 3 bonnes réponses : pas encore « maîtrisé » (on exige plus qu'une réussite).
  for (let i = 0; i < 3; i++) etat = await moteur.repondre(session_id, rep());
  assert.equal(etat.termine, false);
  assert.equal(etat.correction?.correct, true);
  // La 4ᵉ bonne réponse valide l'objectif.
  etat = await moteur.repondre(session_id, rep());
  assert.equal(etat.termine, true);
  assert.equal(etat.dernier_coup.type, 'clore');
});

test('la banque tourne : des exercices variés au fil d’une même session (D5)', async () => {
  const { moteur, contexte, session_id } = bancPhysique();
  const enonces = new Set<string>();
  let etat = await moteur.demarrer(contexte);
  for (let i = 0; i < 6 && !etat.termine; i++) {
    const q = etat.question_courante as { enonce: string; attendu: { valeur: number } };
    enonces.add(q.enonce);
    etat = await moteur.repondre(session_id, String(q.attendu.valeur));
  }
  assert.ok(enonces.size >= 2, `variété attendue, vu ${enonces.size} énoncé(s)`);
});

test('blocage (2 échecs) → bascule en décomposition guidée plutôt que la réponse', async () => {
  const { moteur, contexte, session_id } = bancPhysique();
  await moteur.demarrer(contexte);
  await moteur.repondre(session_id, '75'); // faux (oubli de conversion)
  const bloque = await moteur.repondre(session_id, '75'); // 2ᵉ échec → seuil
  assert.equal(bloque.guidage?.etape, 1);
  assert.match(bloque.texte_tuteur, /pas à pas|Étape 1/i);
  assert.doesNotMatch(bloque.texte_tuteur, /\b60\b/);
});
