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

/** Piège : une mauvaise réponse attendue, reliée à une erreur-type (R1). */
export interface PiegeNumeric {
  readonly valeur: number;
  readonly tolerance?: number;
  readonly erreur_type_id: string;
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
  /** Distracteurs prof-authored → diagnostic d'erreur-type (D2/§6). */
  readonly pieges?: readonly PiegeNumeric[];
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

/** Option de QCM ; un distracteur peut pointer vers une erreur-type (R1). */
export interface OptionQcm {
  readonly id: string;
  readonly libelle: string;
  readonly erreur_type_id?: string;
}

/** QCM — une ou plusieurs bonnes réponses. */
export interface QuestionQcm extends QuestionBase {
  readonly kind: 'qcm';
  readonly options: readonly OptionQcm[];
  readonly bonnes_reponses: readonly string[];
  readonly choix_multiple: boolean;
}

/**
 * Réponse libre — vérifiée contre une grille de critères. L'évaluation
 * sémantique peut s'appuyer sur le LLM, mais le Verifier reste l'autorité
 * qui émet le `Verdict` (le LLM ne valide jamais directement).
 */
export interface CritereLibre {
  readonly id: string;
  readonly description: string;
  readonly requis: boolean;
  /**
   * Mots-clés attendus (tous présents ⇒ critère satisfait). Permet une
   * correction DÉTERMINISTE en Phase 2 ; une évaluation sémantique LLM pourra
   * s'y substituer plus tard sans changer le contrat (le Verifier reste seul
   * juge — §1.1).
   */
  readonly mots_cles?: readonly string[];
}

export interface QuestionLibre extends QuestionBase {
  readonly kind: 'libre';
  readonly criteres: readonly CritereLibre[];
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

// Symbole RÉEL (pas `declare`) : il sert de marque en position de valeur dans
// `creerVerdict`. Non exporté → privé au module, donc infalsifiable ailleurs.
const __verdict: unique symbol = Symbol('verdict');

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

/* ------------------------------------------------------------------------- */
/* Constructeur de Verdict — co-localisé avec le type (smart constructor)      */
/* ------------------------------------------------------------------------- */

/** Données nécessaires pour sceller un Verdict (la marque est ajoutée ici). */
export interface DonneesVerdict {
  readonly correct: boolean;
  readonly criteres_satisfaits: readonly string[];
  readonly erreur_type_id?: string;
  readonly diagnostic?: string;
}

/**
 * Seul moyen de produire un `Verdict` (§1.1). Volontairement défini DANS ce
 * module : la marque `[__verdict]` y est privée, donc aucun autre fichier ne
 * peut forger un Verdict sans passer par ce constructeur. Le baril public
 * (`export type *`) n'exporte pas cette fonction — seules les implémentations
 * de `Verifier` l'importent directement.
 */
export function creerVerdict(donnees: DonneesVerdict): Verdict {
  return { [__verdict]: true, ...donnees };
}
