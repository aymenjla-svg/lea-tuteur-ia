/**
 * Émotion imposée par le déterministe (ADDENDUM v1/A1).
 *
 * L'avatar ne peut PAS « féliciter » une réponse fausse : l'expression liée à
 * une correction découle du `Verdict` du Verifier, pas du LLM (invariant §1.1 &
 * P1). Le LLM ne fournit qu'un indice de ton pour les moments hors correction.
 *
 *   verdict correct            → 'celebrate'
 *   erreur (1re fois)          → 'encouraging'
 *   erreur (blocage, ≥ seuil)  → 'concerned'  (douce, jamais moqueuse)
 */

import type { Expression } from '../../contracts/index.js';

/**
 * Expression déterministe pour un tour lié à une correction.
 * @param correct  résultat du Verifier.
 * @param echecsConsecutifs  nombre d'échecs consécutifs AVANT ce tour (pour
 *   distinguer un simple faux d'un blocage installé).
 */
export function expressionVerdict(
  correct: boolean,
  echecsConsecutifs = 0,
): Expression {
  if (correct) return 'celebrate';
  return echecsConsecutifs >= 1 ? 'concerned' : 'encouraging';
}

/** Vrai si l'expression est positive (réservée aux réponses correctes). */
export function estPositive(e: Expression): boolean {
  return e === 'celebrate' || e === 'happy';
}
