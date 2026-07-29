/**
 * Politiques des 3 types d'évaluation (D2, §6).
 *
 *  - `diagnostique` : placement initial. On SONDE sans aider ni remédier ;
 *    le but est de mesurer, pas d'enseigner. Pas d'indice.
 *  - `formative`    : apprentissage. On AIDE (indice, remédiation), répétition
 *    illimitée (P1). C'est le mode de la boucle de leçon.
 *  - `sommative`    : bilan. Conditions « examen » : pas d'indice, une seule
 *    passe, score agrégé à la fin.
 *
 * Ce module porte la POLITIQUE (données/règles), pas un nouveau moteur : la
 * vérification reste le Verifier code dur (§1.1).
 */

import type { TypeEvaluation } from '../../contracts/index.js';

export interface PolitiqueEvaluation {
  /** Donne-t-on des indices/remédiation pendant l'évaluation ? */
  readonly aide: boolean;
  /** Autorise-t-on plusieurs tentatives par question ? */
  readonly repetition: boolean;
  /** Agrège-t-on un score final (bilan) ? */
  readonly score_final: boolean;
}

const POLITIQUES: Readonly<Record<TypeEvaluation, PolitiqueEvaluation>> = {
  diagnostique: { aide: false, repetition: false, score_final: false },
  formative: { aide: true, repetition: true, score_final: false },
  sommative: { aide: false, repetition: false, score_final: true },
};

export function politiqueEvaluation(type: TypeEvaluation): PolitiqueEvaluation {
  return POLITIQUES[type];
}

/** Calcule un score sommatif [0,1] à partir de verdicts (questions justes). */
export function scoreSommatif(
  resultats: readonly { readonly correct: boolean }[],
): number {
  if (resultats.length === 0) return 0;
  const justes = resultats.filter((r) => r.correct).length;
  return Math.round((justes / resultats.length) * 1000) / 1000;
}
