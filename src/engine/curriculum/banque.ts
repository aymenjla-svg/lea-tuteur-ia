/**
 * Banque d'exercices — instanciation de templates paramétrés (D5, §6).
 *
 * Un `ExerciceTemplate` (donnée, R1) peut être instancié en une `Question`
 * concrète. La LOGIQUE de génération (calcul de la bonne réponse, des pièges)
 * vit dans du code enregistré par identifiant de template — séparée de la
 * donnée. À défaut de générateur, on retombe sur la 1ʳᵉ étape statique.
 *
 * Le tirage est déterministe (RNG seedé, cf. core) : exercices reproductibles
 * pour les tests et la télémétrie.
 */

import type {
  ExerciceTemplate,
  ExerciceTemplateId,
  Question,
} from '../../contracts/index.js';

/** Génère une question concrète à partir d'un tirage aléatoire. */
export type GenerateurQuestion = (rng: () => number) => Question;

export class Banque {
  readonly #generateurs = new Map<string, GenerateurQuestion>();

  enregistrer(template_id: ExerciceTemplateId, gen: GenerateurQuestion): void {
    this.#generateurs.set(template_id, gen);
  }

  /** Instancie une question : générateur si présent, sinon étape statique. */
  instancier(template: ExerciceTemplate, rng: () => number): Question {
    const gen = this.#generateurs.get(template.id);
    if (gen) return gen(rng);
    const etape = template.etapes[0];
    if (!etape) {
      throw new Error(`Template ${template.id} sans étape ni générateur.`);
    }
    return etape.question;
  }
}

/* ------------------------------------------------------------------------- */
/* Générateurs de démonstration                                               */
/* ------------------------------------------------------------------------- */

/**
 * Addition de deux nombres à deux chiffres AVEC retenue garantie sur les
 * unités. Piège « oubli de la retenue » → résultat trop petit de 10.
 */
export const genAdditionAvecRetenue: GenerateurQuestion = (rng) => {
  const dizA = 1 + Math.floor(rng() * 8); // dizaines 1..8
  const dizB = 1 + Math.floor(rng() * 8);
  const uA = 1 + Math.floor(rng() * 9); // unités 1..9
  let uB = 1 + Math.floor(rng() * 9);
  // Force une retenue sur les unités : uA + uB ≥ 10, en gardant uB ≤ 9.
  if (uA + uB < 10) uB = 10 - uA + Math.floor(rng() * uA);
  const a = dizA * 10 + uA;
  const b = dizB * 10 + uB;
  const somme = a + b;
  return {
    kind: 'numeric',
    modalite: 'textuel',
    enonce: `Combien font ${a} + ${b} ?`,
    attendu: { valeur: somme, tolerance: 0 },
    pieges: [{ valeur: somme - 10, erreur_type_id: 'oubli_retenue' }],
  };
};
