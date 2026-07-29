/**
 * Démo avancée — capacités P2/P3/P4 (npm run demo:avance).
 *
 * Met en scène, en dehors de la boucle de leçon : banque d'exercices paramétrée,
 * BKT, vérification symbolique & libre, erreurs-types, RAG, résolution de
 * provider sous conformité (§1.7) et tableau de bord.
 */

import type {
  EleveId,
  ISODateTime,
  ObjectifId,
  Question,
  TenantId,
  Tentative,
} from './contracts/index.js';
import {
  BktLearnerModel,
  curriculumDemo,
  genAdditionAvecRetenue,
  HorlogeManuelle,
  id,
  InMemoryRetrievalIndex,
  LLMGatewayStub,
  MagasinMemoire,
  nouvelId,
  rngDepuisGraine,
  StubEmbedder,
  tableauDeBord,
  VerifierStandard,
} from './engine/index.js';

function titre(s: string): void {
  console.log(`\n\x1b[1m${s}\x1b[0m`);
}

async function main(): Promise<void> {
  const tenant_id = id<TenantId>('tenant-demo');
  const eleve_id = id<EleveId>('eleve-lou');
  const horloge = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));
  const verifier = new VerifierStandard();

  // 1) Banque paramétrée + erreur-type ------------------------------------
  titre('1) Banque d’exercices (D5) + erreur-type (oubli de la retenue)');
  const q = genAdditionAvecRetenue(rngDepuisGraine(7));
  if (q.kind === 'numeric') {
    console.log(`   Exercice : ${q.enonce}  (attendu ${q.attendu.valeur})`);
    const faux = await verifier.verifier(q, { texte: String(q.attendu.valeur - 10) });
    console.log(`   Réponse « oubli retenue » → erreur_type = ${faux.erreur_type_id}`);
  }

  // 2) Verifier symbolique & libre ---------------------------------------
  titre('2) Verifier multi-type (symbolic + libre)');
  const sym: Question = {
    kind: 'symbolic',
    modalite: 'textuel',
    enonce: 'Développe 2(x+1).',
    attendu: { expression: '2*(x+1)', variables: ['x'] },
  };
  console.log(`   « 2x+2 » ≡ 2(x+1) ? ${(await verifier.verifier(sym, { texte: '2x+2' })).correct}`);
  console.log(`   « 2x+1 » ≡ 2(x+1) ? ${(await verifier.verifier(sym, { texte: '2x+1' })).correct}`);
  const libre: Question = {
    kind: 'libre',
    modalite: 'textuel',
    enonce: 'Pourquoi la somme de deux pairs est-elle paire ?',
    criteres: [{ id: 'c1', description: 'parité', requis: true, mots_cles: ['pair'] }],
  };
  console.log(`   Libre correcte ? ${(await verifier.verifier(libre, { texte: 'deux nombres pairs donnent un pair' })).correct}`);

  // 3) BKT ----------------------------------------------------------------
  titre('3) BKT (D3/R2) — convergence sur succès répétés');
  const curriculum = curriculumDemo(tenant_id, horloge);
  const bkt = new BktLearnerModel(tenant_id, curriculum, horloge);
  const objectif_id = id<ObjectifId>('obj-addition-2-chiffres');
  const magasin = new MagasinMemoire();
  for (let i = 0; i < 5; i++) {
    const verdict = await verifier.verifier(
      { kind: 'numeric', modalite: 'textuel', enonce: 'x', attendu: { valeur: 1, tolerance: 0 } },
      { texte: '1' },
    );
    const t: ISODateTime = horloge.maintenant();
    const tentative: Tentative = {
      tenant_id, id: nouvelId(), eleve_id, objectif_id,
      template_id: id('tmpl'), type_evaluation: 'formative',
      verdict, horodatage: t, cree_le: t, modifie_le: t,
    };
    magasin.ajouterTentative(tentative);
    await magasin.evenements.emettre({ tenant_id, type: 'tentative_enregistree', horodatage: t, payload: {} });
    const m = await bkt.enregistrerTentative(tentative);
    horloge.avancer(1000);
    console.log(`   tentative ${i + 1} → p(maîtrise) = ${m.probabilite_maitrise}`);
  }

  // 4) RAG ----------------------------------------------------------------
  titre('4) RAG (seam pgvector) — récupération par similarité');
  const index = new InMemoryRetrievalIndex(new StubEmbedder(64));
  await index.indexer({ tenant_id, id: 'd1', texte: 'poser une addition avec retenue' });
  await index.indexer({ tenant_id, id: 'd2', texte: 'le théorème de Pythagore' });
  const res = await index.rechercher(tenant_id, 'addition retenue colonnes', 1);
  console.log(`   meilleur doc pour « addition retenue » : ${res[0]?.document.id} (score ${res[0]?.score.toFixed(3)})`);

  // 5) Conformité LLM (§1.7) ---------------------------------------------
  titre('5) LLMGateway — résolution de provider sous conformité (§1.7)');
  const gw = new LLMGatewayStub();
  const mineur = gw.resoudreProvider({ est_mineur: true, consentement_adulte: true, no_train: true, region: 'eu-west' }, 'byok');
  const majeur = gw.resoudreProvider({ est_mineur: false, consentement_adulte: true, no_train: false, region: 'eu-west' }, 'byok');
  console.log(`   mineur+BYOK → ${mineur.nom} (conforme=${mineur.conforme_mineur}, no_train=${mineur.no_train})`);
  console.log(`   majeur+BYOK → ${majeur.nom}`);

  // 6) Dashboard ----------------------------------------------------------
  titre('6) Dashboard (D13) — projection télémétrie');
  const tb = tableauDeBord(magasin, [await bkt.profilCompetences(eleve_id)]);
  console.log(`   tentatives=${tb.tentatives_total} · taux_réussite=${tb.taux_reussite} · events=${JSON.stringify(tb.evenements)}`);
  console.log('');
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
