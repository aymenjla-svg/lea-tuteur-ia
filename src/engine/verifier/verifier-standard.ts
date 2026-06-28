/**
 * VerifierStandard — implémentation déterministe du Verifier (D1, §1.1).
 *
 * Phase 1 : familles `numeric` et `qcm` (texte seul). `symbolic` et `libre`
 * sont déclinés explicitement (renvoient un Verdict « non vérifiable ici »)
 * plutôt que de prétendre valider — on ne valide JAMAIS du faux (§1.1).
 *
 * Aucun Verdict n'est forgé à la main : on passe par `creerVerdict`, seul
 * constructeur autorisé (cf. contracts/verifier.ts).
 */

import { creerVerdict } from '../../contracts/verifier.js';
import type {
  Question,
  ReponseEleve,
  Verdict,
  Verifier,
  VerifierKind,
} from '../../contracts/index.js';

export class VerifierStandard implements Verifier {
  readonly kinds: readonly VerifierKind[] = ['numeric', 'qcm'];

  async verifier(question: Question, reponse: ReponseEleve): Promise<Verdict> {
    switch (question.kind) {
      case 'numeric':
        return this.#numeric(question, reponse);
      case 'qcm':
        return this.#qcm(question, reponse);
      case 'symbolic':
      case 'libre':
        return creerVerdict({
          correct: false,
          criteres_satisfaits: [],
          diagnostic: `Famille « ${question.kind} » non vérifiable en Phase 1.`,
        });
    }
  }

  #numeric(
    question: Extract<Question, { kind: 'numeric' }>,
    reponse: ReponseEleve,
  ): Verdict {
    const brut = (reponse.texte ?? '').trim().replace(',', '.');
    const valeur = Number(brut);
    if (brut === '' || !Number.isFinite(valeur)) {
      return creerVerdict({
        correct: false,
        criteres_satisfaits: [],
        erreur_type_id: 'reponse_non_numerique',
        diagnostic: 'La réponse attendue est un nombre.',
      });
    }
    const ecart = Math.abs(valeur - question.attendu.valeur);
    const correct = ecart <= question.attendu.tolerance;
    if (correct) {
      return creerVerdict({ correct: true, criteres_satisfaits: ['valeur'] });
    }
    const unite = question.attendu.unite ? ` ${question.attendu.unite}` : '';
    return creerVerdict({
      correct: false,
      criteres_satisfaits: [],
      erreur_type_id: 'ecart_numerique',
      diagnostic: `Valeur attendue : ${question.attendu.valeur}${unite}.`,
    });
  }

  #qcm(
    question: Extract<Question, { kind: 'qcm' }>,
    reponse: ReponseEleve,
  ): Verdict {
    const choisies = new Set(reponse.options_choisies ?? []);
    const bonnes = new Set(question.bonnes_reponses);
    if (!question.choix_multiple && choisies.size > 1) {
      return creerVerdict({
        correct: false,
        criteres_satisfaits: [],
        erreur_type_id: 'choix_multiple_interdit',
        diagnostic: 'Une seule réponse est attendue.',
      });
    }
    const correct =
      choisies.size === bonnes.size &&
      [...bonnes].every((b) => choisies.has(b));
    if (correct) {
      return creerVerdict({ correct: true, criteres_satisfaits: ['selection'] });
    }
    return creerVerdict({
      correct: false,
      criteres_satisfaits: [],
      erreur_type_id: 'selection_incorrecte',
      diagnostic: 'La sélection ne correspond pas aux bonnes réponses.',
    });
  }
}
