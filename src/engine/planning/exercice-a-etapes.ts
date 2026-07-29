/**
 * ExerciceAEtapes — déroulé d'un exercice multi-étapes (D5, §6).
 *
 * Un `ExerciceTemplate` peut comporter plusieurs étapes ordonnées. On les
 * parcourt une à une : chaque réponse est vérifiée (code dur), et on n'avance
 * qu'en cas de succès. L'indice de l'étape est disponible (tremplin, P1) mais
 * la politique d'aide dépend du type d'évaluation (cf. eval-types.ts).
 */

import type {
  EtapeTemplate,
  ExerciceTemplate,
  Verdict,
  Verifier,
} from '../../contracts/index.js';

export interface ResultatEtape {
  readonly verdict: Verdict;
  readonly avance: boolean;
  readonly termine: boolean;
  readonly indice?: string;
}

export class ExerciceAEtapes {
  #index = 0;

  constructor(
    private readonly template: ExerciceTemplate,
    private readonly verifier: Verifier,
  ) {
    const triees = [...template.etapes].sort((a, b) => a.ordre - b.ordre);
    // On fige l'ordre dès la construction (les étapes sont en lecture seule).
    this.#etapes = triees;
  }

  readonly #etapes: readonly EtapeTemplate[];

  /** Étape courante, ou `null` si l'exercice est terminé. */
  etapeCourante(): EtapeTemplate | null {
    return this.#etapes[this.#index] ?? null;
  }

  get progression(): { readonly etape: number; readonly total: number } {
    return { etape: this.#index, total: this.#etapes.length };
  }

  /** Vérifie la réponse à l'étape courante ; avance si correct. */
  async repondre(texte: string): Promise<ResultatEtape> {
    const etape = this.etapeCourante();
    if (!etape) {
      throw new Error(`Exercice ${this.template.id} déjà terminé.`);
    }
    const verdict = await this.verifier.verifier(etape.question, { texte });
    if (!verdict.correct) {
      return etape.indice !== undefined
        ? { verdict, avance: false, termine: false, indice: etape.indice }
        : { verdict, avance: false, termine: false };
    }
    this.#index += 1;
    return { verdict, avance: true, termine: this.#index >= this.#etapes.length };
  }
}
