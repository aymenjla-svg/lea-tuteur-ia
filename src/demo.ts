/**
 * Démo Phase 1 — exécute la tranche verticale de bout en bout (texte seul).
 *
 *   npm run demo
 *
 * Scénario : un élève se trompe deux fois (→ levier R7), réussit le prérequis,
 * puis enchaîne les bonnes réponses jusqu'à la maîtrise. On affiche le dialogue,
 * la progression de la maîtrise (avec decay D4), la télémétrie (§13) et une
 * démonstration séparée du SafetyFilter (détresse → alerte escaladée, R5).
 */

import type {
  ContexteSession,
  EleveId,
  ParametresPedagogie,
  PersonaId,
  SessionId,
  TenantId,
} from './contracts/index.js';
import {
  curriculumDemo,
  HeuristicLearnerModel,
  HorlogeManuelle,
  id,
  MagasinMemoire,
  MinimalSafetyFilter,
  MoteurLecon,
  OBJ_ADDITION,
  VerifierStandard,
} from './engine/index.js';

function ligne(): void {
  console.log('─'.repeat(64));
}

async function main(): Promise<void> {
  const tenant_id = id<TenantId>('tenant-demo');
  const eleve_id = id<EleveId>('eleve-lou');
  const session_id = id<SessionId>('session-001');
  const persona_id = id<PersonaId>('persona-lea');

  // Horloge contrôlée : on pourra « avancer le temps » pour montrer le decay.
  const horloge = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));

  const curriculum = curriculumDemo(tenant_id, horloge);
  const verifier = new VerifierStandard();
  const learnerModel = new HeuristicLearnerModel(tenant_id, curriculum, horloge);
  const safety = new MinimalSafetyFilter(tenant_id, horloge);
  const magasin = new MagasinMemoire();

  // Persona : la PÉDAGOGIE est faite de paramètres moteur (§7), pas d'un prompt.
  const pedagogie: ParametresPedagogie = {
    seuil_blocage: 2,
    ordre_leviers: ['simplifier', 'reformuler', 'changer_de_modalite'],
    modalite_par_defaut: 'textuel',
    seuil_maitrise: 0.8,
    intensite_encouragement: 0.7,
  };

  const moteur = new MoteurLecon({
    tenant_id,
    curriculum,
    verifier,
    learnerModel,
    safety,
    magasin,
    horloge,
    pedagogie,
  });

  const contexte: ContexteSession = {
    session_id,
    eleve_id,
    persona_id,
    objectif_initial: OBJ_ADDITION,
  };

  console.log('\n🎓  Léa — démo Phase 1 (tranche verticale, texte seul)\n');
  ligne();

  // Réponses scriptées de l'élève. 27+48 = 75 ; 7+8 = 15 (prérequis).
  const reponses = ['70', '60', '15', '75', '75', '75', '75'];

  let etat = await moteur.demarrer(contexte);
  console.log(`🤖  ${etat.texte_tuteur}`);
  console.log(
    `     ↳ coup=${etat.dernier_coup.type} · maîtrise=${etat.maitrise_cible.probabilite_effective}`,
  );

  for (const r of reponses) {
    if (etat.termine) break;
    horloge.avancer(30_000); // 30 s par échange
    console.log(`\n🧒  ${r}`);
    etat = await moteur.repondre(session_id, r);
    console.log(`🤖  ${etat.texte_tuteur}`);
    console.log(
      `     ↳ coup=${etat.dernier_coup.type} · objectif=${etat.objectif_courant} · maîtrise=${etat.maitrise_cible.probabilite_effective}`,
    );
  }

  ligne();
  const profil = await learnerModel.profilCompetences(eleve_id);
  console.log('\n📊  Profil de compétences (après decay D4) :');
  for (const [c, n] of Object.entries(profil.niveaux)) {
    if (n > 0) console.log(`     ${c.padEnd(12)} ${n}`);
  }

  // Decay : on avance de 14 jours et on observe la maîtrise se dégrader.
  horloge.avancer(14 * 86_400_000);
  const apres = await learnerModel.niveauMaitrise(
    eleve_id,
    OBJ_ADDITION,
    horloge.maintenant(),
  );
  console.log(
    `\n🕰️   Maîtrise de l’objectif 14 jours plus tard : ${apres.probabilite_effective} (à réviser : ${apres.a_reviser})`,
  );

  ligne();
  console.log('\n🛡️   Démonstration SafetyFilter (R5) — entrée en détresse :');
  const res = await safety.filtrer('je veux mourir, je suis nul', 'eleve_entree', {
    eleve_id,
    session_id,
  });
  console.log(
    `     décision=${res.decision} · catégories=[${res.categories.join(', ')}] · alerte=${
      res.alerte ? `${res.alerte.severite} (escalade=${res.alerte.escalade_requise})` : 'aucune'
    }`,
  );

  ligne();
  console.log('\n📈  Télémétrie (events §13) :');
  for (const e of magasin.evenements.evenements) {
    console.log(`     ${e.horodatage}  ${e.type}`);
  }
  console.log(
    `\n   Tentatives persistées : ${magasin.tentatives.length} · ` +
      `tours de dialogue : ${magasin.dialogueTurns.length} · ` +
      `alertes : ${magasin.alertes.length}\n`,
  );
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
