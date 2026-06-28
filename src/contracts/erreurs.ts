/**
 * Erreurs-types — catalogue des méprises fréquentes (D2, §5 `erreurs_type`, §6).
 *
 * Une erreur-type décrit une méprise récurrente sur un objectif (ex. « oubli de
 * la retenue »). Elle est détectée de façon DÉTERMINISTE : les contenus prof
 * (R1) déclarent les « pièges » (mauvaises réponses attendues) qui pointent vers
 * une erreur-type. Le `Verifier` attache l'`erreur_type_id` au `Verdict`, et le
 * `LearnerModel` peut suivre la fréquence des erreurs pour cibler la remédiation.
 */

import type { Aggregate, ErreurTypeId, ObjectifId } from './common.js';

/** Une méprise récurrente, avec sa remédiation pédagogique (jamais punitive). */
export interface ErreurType extends Aggregate {
  readonly id: ErreurTypeId;
  /** Objectif concerné (absent = erreur transverse). */
  readonly objectif_id?: ObjectifId;
  readonly libelle: string;
  readonly description: string;
  /** Conseil de remédiation, formulé positivement (§1.3). */
  readonly remediation: string;
}

/** Accès au catalogue d'erreurs-types. Implémentation remplaçable (P3). */
export interface CatalogueErreurs {
  obtenir(id: ErreurTypeId): Promise<ErreurType | null>;
  pourObjectif(objectif_id: ObjectifId): Promise<readonly ErreurType[]>;
}
