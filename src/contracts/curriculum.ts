/**
 * Curriculum — DAG d'objectifs atomiques (D2, §6).
 *
 * Le curriculum est un graphe orienté acyclique : chaque objectif atomique
 * (3–5 par notion, D2) a des prérequis. Invariant §1.2 : ne jamais sortir du
 * curriculum. Données YAML versionnées, BO = 1er référentiel (§6).
 *
 * R1 : le contenu est l'actif stratégique. Les exercices viennent d'abord du
 * prof (`origine:'prof'`, templatisés) ; le LLM est une extension VALIDÉE
 * (`origine:'llm', statut:'à_valider'`, few-shot sur exos prof).
 */

import type {
  Aggregate,
  Competence,
  ExerciceTemplateId,
  ExplicationId,
  Modalite,
  ObjectifId,
  ReferentielId,
} from './common.js';
import type { Question } from './verifier.js';

/* ------------------------------------------------------------------------- */
/* Référentiel & objectifs                                                    */
/* ------------------------------------------------------------------------- */

/** Référentiel = curriculum versionné (ex. « BO cycle 4 — maths »). */
export interface Referentiel extends Aggregate {
  readonly id: ReferentielId;
  readonly libelle: string;
  /** Version du contenu (YAML versionné, §6). */
  readonly version: string;
}

/** Objectif atomique — la maille pédagogique élémentaire (D2). */
export interface Objectif extends Aggregate {
  readonly id: ObjectifId;
  readonly referentiel_id: ReferentielId;
  readonly libelle: string;
  /** Notion parente (3–5 objectifs / notion, D2). */
  readonly notion: string;
  /** Compétences travaillées par cet objectif (agrégation 6 compétences). */
  readonly competences: readonly Competence[];
}

/** Arête du DAG : `objectif_id` requiert `prerequis_id` (D2/§5). */
export interface Prerequis extends Aggregate {
  readonly objectif_id: ObjectifId;
  readonly prerequis_id: ObjectifId;
}

/* ------------------------------------------------------------------------- */
/* Représentations multi-modales (R7)                                         */
/* ------------------------------------------------------------------------- */

/**
 * Une représentation porte une modalité + l'asset/composant associé (R7, §5).
 * Pas de « style d'apprentissage » figé : on offre plusieurs représentations
 * pour tous et on bascule quand ça ne passe pas.
 */
export interface Representation {
  readonly modalite: Modalite;
  /** Référence d'asset (image, schéma) OU id de composant interactif front. */
  readonly asset?: string;
  readonly composant?: string;
  /** Contenu textuel inline pour la modalité `textuel`. */
  readonly texte?: string;
}

/** Provenance d'un contenu (R1). */
export type OrigineContenu = 'prof' | 'llm';
/** Statut de validation éditoriale (R1 : LLM = extension à valider). */
export type StatutContenu = 'valide' | 'a_valider' | 'rejete';

/* ------------------------------------------------------------------------- */
/* Templates d'exercices (D5 : templates paramétrés à étapes)                 */
/* ------------------------------------------------------------------------- */

/** Paramètre d'un template (instancié pour générer une variante). */
export interface ParametreTemplate {
  readonly nom: string;
  /** Domaine de tirage (intervalle numérique, ensemble de valeurs…). */
  readonly domaine: string;
}

/**
 * Sous-étape d'une DÉCOMPOSITION GUIDÉE (P1 : étayage à la demande). Révélée
 * seulement si l'élève bloque : on déroule l'enchaînement une étape à la fois,
 * chacune vérifiée, sans jamais énoncer le résultat final (l'élève le calcule).
 */
export interface SousEtapeGuidee {
  readonly enonce: string;
  /** Valeur numérique attendue à cette sous-étape. */
  readonly attendu: number;
  /** Tolérance absolue (0 = exact). */
  readonly tolerance?: number;
  /** Unité de la sous-étape (pilote les pastilles côté UI). */
  readonly unite?: string;
  /** Coup de pouce ciblé sur cette sous-étape (jamais le résultat). */
  readonly indice: string;
}

/** Étape d'un exercice à étapes (D5 : exercices à étapes). */
export interface EtapeTemplate {
  readonly ordre: number;
  readonly question: Question;
  /** Indice progressif lié à l'étape (jamais la solution d'emblée). */
  readonly indice?: string;
  /**
   * Décomposition en sous-étapes, révélée UNIQUEMENT si l'élève bloque
   * (étayage « on fait ensemble »). L'énoncé principal reste posé en une seule
   * question ; on ne déroule les sous-étapes que sur demande d'aide/blocage.
   */
  readonly decomposition?: readonly SousEtapeGuidee[];
}

/**
 * Template d'exercice paramétré, rattaché à un objectif (D5/R1).
 * `representations[]` (R7) permet de présenter l'exercice en textuel/visuel/
 * interactif selon le levier d'adaptation choisi.
 */
export interface ExerciceTemplate extends Aggregate {
  readonly id: ExerciceTemplateId;
  readonly objectif_id: ObjectifId;
  readonly origine: OrigineContenu;
  readonly statut: StatutContenu;
  readonly parametres: readonly ParametreTemplate[];
  readonly etapes: readonly EtapeTemplate[];
  readonly representations: readonly Representation[];
}

/** Explication d'un objectif, déclinée par modalité (§5 : `explications`). */
export interface Explication extends Aggregate {
  readonly id: ExplicationId;
  readonly objectif_id: ObjectifId;
  readonly modalite: Modalite;
  readonly asset?: string;
  readonly contenu: string;
}

/* ------------------------------------------------------------------------- */
/* Contrat d'accès au curriculum                                              */
/* ------------------------------------------------------------------------- */

/** Accès en lecture au DAG curriculaire. Implémentation remplaçable (P3). */
export interface Curriculum {
  obtenirObjectif(id: ObjectifId): Promise<Objectif | null>;
  /** Tous les objectifs d'un référentiel (pour le parcours / planification). */
  objectifs(referentiel_id: ReferentielId): Promise<readonly Objectif[]>;
  /** Prérequis directs d'un objectif (arêtes entrantes du DAG). */
  prerequisDirects(id: ObjectifId): Promise<readonly Objectif[]>;
  /** Objectifs dont `id` est prérequis (arêtes sortantes — la suite). */
  objectifsSuivants(id: ObjectifId): Promise<readonly Objectif[]>;
  templatesPourObjectif(
    id: ObjectifId,
  ): Promise<readonly ExerciceTemplate[]>;
  explicationsPourObjectif(
    id: ObjectifId,
    modalite?: Modalite,
  ): Promise<readonly Explication[]>;
}
