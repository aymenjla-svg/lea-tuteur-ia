/**
 * SafetyFilter — sécurité du dialogue (R5, invariant §1.6).
 *
 * Deux rôles :
 *  1) Filtre de SORTIE : tout texte destiné à l'élève passe par ici avant
 *     d'être prononcé/affiché (le LLM ne parle jamais « en direct » à
 *     l'enfant sans ce filet).
 *  2) Détection de DÉTRESSE : signaux de mal-être → `SafetyAlert` →
 *     escalade vers un adulte (§9). Jamais d'auto-gestion silencieuse.
 *
 * §1.3 : ne jamais humilier. Le filtre bloque aussi les sorties dégradantes.
 */

import type {
  Aggregate,
  EleveId,
  ISODateTime,
  SafetyAlertId,
  SessionId,
} from './common.js';

/** Origine du texte analysé. */
export type SourceTexte = 'llm_sortie' | 'eleve_entree';

/** Catégories de risque surveillées (extensible). */
export type CategorieRisque =
  | 'detresse'
  | 'auto_agression'
  | 'violence'
  | 'contenu_inapproprie'
  | 'humiliation'
  | 'hors_cadre';

/** Sévérité d'une alerte (pilote l'escalade). */
export type Severite = 'info' | 'attention' | 'critique';

/** Décision du filtre de sortie. */
export type DecisionFiltre = 'autoriser' | 'reecrire' | 'bloquer';

/**
 * Résultat du filtrage d'un texte. Si `decision = 'reecrire'`, `texte_sur`
 * contient la version assainie à utiliser à la place.
 */
export interface ResultatFiltre {
  readonly decision: DecisionFiltre;
  readonly texte_sur?: string;
  readonly categories: readonly CategorieRisque[];
  /** Alerte générée si un seuil de détresse est franchi. */
  readonly alerte?: SafetyAlert;
}

/**
 * Alerte de sécurité persistée (table `safety_alerts`, §5) et escaladée vers
 * l'adulte responsable (§9). Aggregate : tenant-scopée + horodatée (§13).
 */
export interface SafetyAlert extends Aggregate {
  readonly id: SafetyAlertId;
  readonly eleve_id: EleveId;
  readonly session_id: SessionId;
  readonly categorie: CategorieRisque;
  readonly severite: Severite;
  /** Extrait minimal nécessaire (minimisation des données, §9). */
  readonly extrait: string;
  readonly cree_a: ISODateTime;
  readonly escalade_requise: boolean;
}

/** Contrat du filtre de sécurité. Implémentation remplaçable (P3). */
export interface SafetyFilter {
  /** Analyse un texte (entrée élève ou sortie LLM) et décide. */
  filtrer(
    texte: string,
    source: SourceTexte,
    contexte: { readonly eleve_id: EleveId; readonly session_id: SessionId },
  ): Promise<ResultatFiltre>;
}
