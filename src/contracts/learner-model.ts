/**
 * LearnerModel — modèle de l'élève (D3/R2, D4).
 *
 * v1 : heuristique honnête (transparente, calibrable). Phase 2 : BKT calé sur
 * données réelles, plafond DKT (D3/R2). Le contrat ci-dessous est volontairement
 * agnostique à l'algorithme : passer de l'heuristique au BKT ne doit RIEN casser
 * en amont (P3).
 *
 * D4 : decay (oubli) + horodatage jour 1 → répétition espacée. Le decay est
 * appliqué AU CALCUL (à la lecture), pas par un job de fond : la maîtrise
 * stockée est datée, et `niveauMaitrise(...)` la dégrade en fonction du temps
 * écoulé depuis la dernière révision.
 */

import type {
  Aggregate,
  Competence,
  EleveId,
  ExerciceTemplateId,
  ISODateTime,
  ObjectifId,
  TentativeId,
} from './common.js';
import type { Verdict } from './verifier.js';

/* ------------------------------------------------------------------------- */
/* Tentatives & maîtrise                                                       */
/* ------------------------------------------------------------------------- */

/** Type d'évaluation (D2 : 3 types d'éval). */
export type TypeEvaluation = 'diagnostique' | 'formative' | 'sommative';

/**
 * Une tentative horodatée sur un objectif. Le `Verdict` provient du Verifier
 * (jamais du LLM — §1.1). Source de vérité pour recalculer la maîtrise.
 */
export interface Tentative extends Aggregate {
  readonly id: TentativeId;
  readonly eleve_id: EleveId;
  readonly objectif_id: ObjectifId;
  readonly template_id: ExerciceTemplateId;
  readonly type_evaluation: TypeEvaluation;
  readonly verdict: Verdict;
  readonly horodatage: ISODateTime;
}

/**
 * État de maîtrise stocké pour un (élève, objectif). On conserve les dates de
 * dernière révision/réussite (§5) afin d'appliquer le decay AU CALCUL (D4).
 * `probabilite_maitrise` est l'estimation brute (heuristique v1 → BKT v2),
 * AVANT application du decay.
 */
export interface Maitrise extends Aggregate {
  readonly eleve_id: EleveId;
  readonly objectif_id: ObjectifId;
  readonly probabilite_maitrise: number; // [0,1]
  readonly derniere_revision: ISODateTime;
  readonly derniere_reussite?: ISODateTime;
  readonly nb_tentatives: number;
}

/** Maîtrise après decay (D4) — ce que consomme le moteur de décision. */
export interface MaitriseEffective {
  readonly objectif_id: ObjectifId;
  /** Probabilité de maîtrise dégradée par le temps écoulé (lecture). */
  readonly probabilite_effective: number; // [0,1]
  /** `true` si l'objectif est dû pour révision (répétition espacée). */
  readonly a_reviser: boolean;
}

/* ------------------------------------------------------------------------- */
/* Profil de compétences (agrégation 6 compétences, §6)                       */
/* ------------------------------------------------------------------------- */

/** Synthèse par compétence, agrégée sur les objectifs travaillés. */
export interface ProfilCompetences {
  readonly eleve_id: EleveId;
  readonly niveaux: Readonly<Record<Competence, number>>; // [0,1] par compétence
  readonly calcule_le: ISODateTime;
}

/* ------------------------------------------------------------------------- */
/* Contrat                                                                    */
/* ------------------------------------------------------------------------- */

/**
 * Modèle de l'apprenant. Heuristique v1 → BKT v2 (D3/R2), interface stable.
 * `niveauMaitrise` applique le decay au calcul (D4).
 */
export interface LearnerModel {
  /** Enregistre une tentative et met à jour la maîtrise brute. */
  enregistrerTentative(tentative: Tentative): Promise<Maitrise>;

  /** Maîtrise effective (après decay) à l'instant `maintenant`. */
  niveauMaitrise(
    eleve_id: EleveId,
    objectif_id: ObjectifId,
    maintenant: ISODateTime,
  ): Promise<MaitriseEffective>;

  /** Objectifs dus pour révision (répétition espacée, D4). */
  objectifsAReviser(
    eleve_id: EleveId,
    maintenant: ISODateTime,
  ): Promise<readonly MaitriseEffective[]>;

  /** Profil agrégé sur les 6 compétences (§6). */
  profilCompetences(eleve_id: EleveId): Promise<ProfilCompetences>;
}
