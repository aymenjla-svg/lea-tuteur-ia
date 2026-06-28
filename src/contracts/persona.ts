/**
 * Persona — 3 facettes SÉPARÉES (D9, §7).
 *
 * Une persona n'est PAS un prompt monolithique. Trois facettes indépendantes,
 * combinables :
 *   1) Apparence  : RPM (Ready Player Me) + voix — l'enveloppe perçue.
 *   2) Soul       : style/ton — exprimé comme prompt (le LLM *parle*).
 *   3) Pédagogie  : PARAMÈTRES MOTEUR (pas un prompt) — chemin & seuils.
 *
 * Même moteur & mêmes invariants pour toutes les personas (§7) : elles
 * diffèrent par le chemin et le style, jamais par le cadre déterministe (P2).
 * Le catalogue de personas est une donnée (§7), avec matching élève↔persona.
 *
 * H2 : éviter les personas cosmétiques — la facette Pédagogie doit porter une
 * différence didactique réelle (paramètres), pas seulement un habillage.
 */

import type { Aggregate, Modalite, PersonaId } from './common.js';

/* ------------------------------------------------------------------------- */
/* Facette 1 — Apparence (RPM + voix)                                         */
/* ------------------------------------------------------------------------- */

/** Enveloppe perçue : avatar RPM + identité vocale (D9, §8). */
export interface Apparence {
  /** URL/ID du modèle Ready Player Me (RPM). */
  readonly rpm_avatar: string;
  /** Identifiant de voix (résolu par le pipeline Voice). */
  readonly voix_id: string;
}

/* ------------------------------------------------------------------------- */
/* Facette 2 — Soul (style / prompt)                                          */
/* ------------------------------------------------------------------------- */

/**
 * Style relationnel exprimé en langage naturel, réinjecté à chaque tour de la
 * boucle agentique (« `soul` réinjecté chaque tour », §6). C'est la SEULE
 * facette qui est un prompt.
 */
export interface Soul {
  readonly nom_affiche: string;
  readonly style_prompt: string;
  readonly tutoiement: boolean;
}

/* ------------------------------------------------------------------------- */
/* Facette 3 — Pédagogie (PARAMÈTRES moteur, pas un prompt)                   */
/* ------------------------------------------------------------------------- */

/**
 * Paramètres pilotant le moteur déterministe (§7). Aucun de ces champs n'est
 * du texte libre interprété par le LLM : ce sont des réglages du moteur.
 */
export interface ParametresPedagogie {
  /** Nb d'échecs consécutifs avant de déclencher un levier d'adaptation (R7). */
  readonly seuil_blocage: number;
  /** Ordre de préférence des leviers face au blocage (R7). */
  readonly ordre_leviers: readonly ('reformuler' | 'simplifier' | 'changer_de_modalite')[];
  /** Modalité de présentation par défaut (R7 ; jamais un « style » figé). */
  readonly modalite_par_defaut: Modalite;
  /** Seuil de maîtrise considéré « acquis » (pilote progression). */
  readonly seuil_maitrise: number; // [0,1]
  /** Densité d'encouragements (sécurité psychologique P1, sans excès). */
  readonly intensite_encouragement: number; // [0,1]
}

/* ------------------------------------------------------------------------- */
/* Persona = assemblage des 3 facettes                                        */
/* ------------------------------------------------------------------------- */

/** Persona du catalogue (donnée, §7). Aggregate : tenant-scopée + horodatée. */
export interface Persona extends Aggregate {
  readonly id: PersonaId;
  readonly apparence: Apparence;
  readonly soul: Soul;
  readonly pedagogie: ParametresPedagogie;
}

/** Matching élève↔persona (§7). Implémentation remplaçable (P3). */
export interface PersonaCatalogue {
  obtenir(id: PersonaId): Promise<Persona | null>;
  lister(): Promise<readonly Persona[]>;
}
