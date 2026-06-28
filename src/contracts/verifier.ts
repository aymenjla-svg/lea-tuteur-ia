/**
 * Verifier — outil code dur n°1 (D1).
 *
 * Invariant §1.1 : NE JAMAIS VALIDER DU FAUX. La vérification est
 * déterministe (code dur, P2), identique pour tous. Le LLM *parle* ; il
 * n'a PAS le droit de produire un verdict — seul le Verifier le fait.
 *
 * Pour rendre cet invariant structurel, `Verdict` porte une marque privée
 * (`_atteste`) qui ne peut être fabriquée qu'au sein de l'implémentation du
 * Verifier : un module applicatif ne peut donc pas forger un `Verdict`.
 */

import type { Modalite } from './common.js';

/** Familles de vérification supportées (SPEC §4 : numeric|symbolic|qcm|libre). */
export type VerifierKind = 'numeric' | 'symbolic' | 'qcm' | 'libre';

/* ------------------------------------------------------------------------- */
/* Questions — union discriminée par `kind`                                   */
/* ------------------------------------------------------------------------- */

interface QuestionBase {
  readonly enonce: string;
  /** Modalité de présentation de la question (R7). */
  readonly modalite: Modalite;
}

/** Réponse numérique avec tolérance (ex. arrondis, unités). */
export interface QuestionNumeric extends QuestionBase {
  readonly kind: 'numeric';
  readonly attendu: {
    readonly valeur: number;
    /** Tolérance absolue acceptée (0 = exact). */
    readonly tolerance: number;
    readonly unite?: string;
  };
}

/** Équivalence symbolique (ex. `2(x+1)` ≡ `2x+2`). */
export interface QuestionSymbolic extends QuestionBase {
  readonly kind: 'symbolic';
  readonly attendu: {
    /** Expression canonique attendue (CAS côté implémentation). */
    readonly expression: string;
    readonly variables: readonly string[];
  };
}

/** QCM — une ou plusieurs bonnes réponses. */
export interface QuestionQcm extends QuestionBase {
  readonly kind: 'qcm';
  readonly options: readonly { readonly id: string; readonly libelle: string }[];
  readonly bonnes_reponses: readonly string[];
  readonly choix_multiple: boolean;
}

/**
 * Réponse libre — vérifiée contre une grille de critères. L'évaluation
 * sémantique peut s'appuyer sur le LLM, mais le Verifier reste l'autorité
 * qui émet le `Verdict` (le LLM ne valide jamais directement).
 */
export interface QuestionLibre extends QuestionBase {
  readonly kind: 'libre';
  readonly criteres: readonly {
    readonly id: string;
    readonly description: string;
    readonly requis: boolean;
  }[];
}

export type Question =
  | QuestionNumeric
  | QuestionSymbolic
  | QuestionQcm
  | QuestionLibre;

/* ------------------------------------------------------------------------- */
/* Réponse de l'élève                                                         */
/* ------------------------------------------------------------------------- */

/** Réponse brute fournie par l'élève (texte, sélection QCM, expression…). */
export interface ReponseEleve {
  /** Pour numeric/symbolic/libre : texte saisi. */
  readonly texte?: string;
  /** Pour qcm : identifiants d'options choisies. */
  readonly options_choisies?: readonly string[];
}

/* ------------------------------------------------------------------------- */
/* Verdict — seul le Verifier peut en produire un                             */
/* ------------------------------------------------------------------------- */

declare const __verdict: unique symbol;

/**
 * Résultat de vérification. La marque `[__verdict]` est inaccessible hors de
 * l'implémentation du Verifier : impossible de forger un Verdict ailleurs
 * (matérialise §1.1 dans le système de types).
 */
export interface Verdict {
  readonly [__verdict]: true;
  readonly correct: boolean;
  /** Critères satisfaits (utile pour libre/qcm partiels). */
  readonly criteres_satisfaits: readonly string[];
  /** Erreur-type détectée le cas échéant (alimente le LearnerModel). */
  readonly erreur_type_id?: string;
  /** Explication factuelle de l'écart (jamais humiliante — §1.3). */
  readonly diagnostic?: string;
}

/**
 * Contrat du vérificateur. Implémentation déterministe et remplaçable (P3).
 * Asynchrone car le mode `libre` peut nécessiter un appel externe.
 */
export interface Verifier {
  /** Familles supportées par cette implémentation. */
  readonly kinds: readonly VerifierKind[];
  verifier(question: Question, reponse: ReponseEleve): Promise<Verdict>;
}
