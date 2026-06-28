/**
 * Planificateur — choix de la prochaine action pédagogique (D2, D4, §6).
 *
 * S'appuie sur le DAG (Curriculum) et l'état de l'élève (LearnerModel) pour
 * décider quoi faire, dans cet ordre de priorité :
 *   1. RÉVISER ce qui est dû (répétition espacée, D4) ;
 *   2. sinon CONSOLIDER / TRAVAILLER le premier objectif débloqué non maîtrisé
 *      (prérequis acquis — on ne sort jamais du curriculum, §1.2) ;
 *   3. sinon plus rien à faire (tout maîtrisé).
 *
 * Fournit aussi un PLAN DIAGNOSTIQUE : l'ordre topologique des objectifs, pour
 * sonder du plus simple au plus complexe (placement initial).
 */

import type {
  Curriculum,
  EleveId,
  ISODateTime,
  LearnerModel,
  Objectif,
  ObjectifId,
  ReferentielId,
} from '../../contracts/index.js';

export type ActionPedagogique =
  | { readonly type: 'reviser'; readonly objectif_id: ObjectifId }
  | { readonly type: 'travailler'; readonly objectif_id: ObjectifId }
  | { readonly type: 'consolider'; readonly objectif_id: ObjectifId }
  | { readonly type: 'rien' };

export class Planificateur {
  constructor(
    private readonly curriculum: Curriculum,
    private readonly learnerModel: LearnerModel,
    private readonly seuilMaitrise: number = 0.8,
  ) {}

  /** Décide la prochaine action pour un élève sur un référentiel. */
  async prochaineAction(
    eleve_id: EleveId,
    referentiel_id: ReferentielId,
    maintenant: ISODateTime,
  ): Promise<ActionPedagogique> {
    // 1) Révisions dues d'abord (D4).
    const dus = await this.learnerModel.objectifsAReviser(eleve_id, maintenant);
    const premierDu = dus[0];
    if (premierDu) {
      return { type: 'reviser', objectif_id: premierDu.objectif_id };
    }

    // 2) Premier objectif débloqué et non maîtrisé, en ordre topologique.
    const ordonnes = await this.#ordreTopologique(referentiel_id);
    for (const o of ordonnes) {
      const eff = await this.learnerModel.niveauMaitrise(eleve_id, o.id, maintenant);
      if (eff.probabilite_effective >= this.seuilMaitrise) continue; // déjà acquis

      const prereqs = await this.curriculum.prerequisDirects(o.id);
      const niveaux = await Promise.all(
        prereqs.map((p) => this.learnerModel.niveauMaitrise(eleve_id, p.id, maintenant)),
      );
      const debloque = niveaux.every(
        (m) => m.probabilite_effective >= this.seuilMaitrise,
      );
      if (!debloque) continue; // prérequis non acquis → verrouillé

      return {
        type: eff.probabilite_effective > 0 ? 'consolider' : 'travailler',
        objectif_id: o.id,
      };
    }

    // 3) Tout est maîtrisé.
    return { type: 'rien' };
  }

  /** Plan diagnostique : objectifs en ordre topologique (simple → complexe). */
  async planDiagnostique(
    referentiel_id: ReferentielId,
  ): Promise<readonly Objectif[]> {
    return this.#ordreTopologique(referentiel_id);
  }

  /** Tri topologique du DAG (Kahn) — prérequis avant dépendants. */
  async #ordreTopologique(
    referentiel_id: ReferentielId,
  ): Promise<readonly Objectif[]> {
    const objs = await this.curriculum.objectifs(referentiel_id);
    const dansRef = new Set(objs.map((o) => o.id));
    const prereqs = new Map<ObjectifId, Set<ObjectifId>>();
    for (const o of objs) {
      const directs = await this.curriculum.prerequisDirects(o.id);
      prereqs.set(o.id, new Set(directs.map((p) => p.id).filter((id) => dansRef.has(id))));
    }

    const ordonnes: Objectif[] = [];
    const faits = new Set<ObjectifId>();
    while (ordonnes.length < objs.length) {
      const prets = objs.filter(
        (o) =>
          !faits.has(o.id) &&
          [...(prereqs.get(o.id) ?? [])].every((p) => faits.has(p)),
      );
      if (prets.length === 0) break; // cycle anormal : on s'arrête proprement
      for (const o of prets) {
        ordonnes.push(o);
        faits.add(o.id);
      }
    }
    return ordonnes;
  }
}
