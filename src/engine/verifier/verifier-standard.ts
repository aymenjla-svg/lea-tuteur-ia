/**
 * VerifierStandard — vérificateur déterministe multi-type (D1, §1.1).
 *
 * Couvre les 4 familles du §4 :
 *  - `numeric`  : tolérance + diagnostic d'erreur-type via les « pièges » prof.
 *  - `qcm`      : sélection exacte ; un distracteur peut révéler une erreur-type.
 *  - `symbolic` : équivalence par échantillonnage numérique (cf. expression.ts).
 *  - `libre`    : grille de critères par mots-clés (correction déterministe).
 *
 * On ne valide JAMAIS du faux (§1.1) : tout passe par `creerVerdict`, et en cas
 * de doute (entrée illisible, critère non vérifiable) le verdict est `false`.
 */

import { creerVerdict } from '../../contracts/verifier.js';
import type {
  Question,
  ReponseEleve,
  Verdict,
  Verifier,
  VerifierKind,
} from '../../contracts/index.js';
import { normaliser } from '../core.js';
import { equivalentes } from './expression.js';

/**
 * Lecture TOLÉRANTE d'un nombre saisi par l'élève : virgule décimale, espaces
 * (y compris insécables, séparateurs de milliers) et unité écrite après le
 * nombre (« 60 km/h », « 1 150 W ») sont acceptés. On extrait le premier nombre.
 * Renvoie `null` si aucun nombre n'est présent. Ne valide jamais du faux : on
 * ne fait qu'assouplir la SAISIE, la comparaison de valeur reste stricte.
 */
export function lireNombre(texte: string): number | null {
  const norm = texte.replace(/,/g, '.').replace(/\s/g, '');
  const m = norm.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const v = Number(m[0]);
  return Number.isFinite(v) ? v : null;
}

export class VerifierStandard implements Verifier {
  readonly kinds: readonly VerifierKind[] = [
    'numeric',
    'qcm',
    'symbolic',
    'libre',
  ];

  async verifier(question: Question, reponse: ReponseEleve): Promise<Verdict> {
    switch (question.kind) {
      case 'numeric':
        return this.#numeric(question, reponse);
      case 'qcm':
        return this.#qcm(question, reponse);
      case 'symbolic':
        return this.#symbolic(question, reponse);
      case 'libre':
        return this.#libre(question, reponse);
    }
  }

  #numeric(
    question: Extract<Question, { kind: 'numeric' }>,
    reponse: ReponseEleve,
  ): Verdict {
    const valeur = lireNombre(reponse.texte ?? '');
    if (valeur === null) {
      return creerVerdict({
        correct: false,
        criteres_satisfaits: [],
        erreur_type_id: 'reponse_non_numerique',
        diagnostic: 'La réponse attendue est un nombre.',
      });
    }
    if (Math.abs(valeur - question.attendu.valeur) <= question.attendu.tolerance) {
      return creerVerdict({ correct: true, criteres_satisfaits: ['valeur'] });
    }
    // Diagnostic d'erreur-type via les pièges prof-authored (R1).
    const piege = (question.pieges ?? []).find(
      (p) => Math.abs(valeur - p.valeur) <= (p.tolerance ?? 0),
    );
    const unite = question.attendu.unite ? ` ${question.attendu.unite}` : '';
    return creerVerdict({
      correct: false,
      criteres_satisfaits: [],
      erreur_type_id: piege?.erreur_type_id ?? 'ecart_numerique',
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
    // Erreur-type si l'élève a choisi un distracteur identifié.
    const distracteur = question.options.find(
      (o) => choisies.has(o.id) && !bonnes.has(o.id) && o.erreur_type_id,
    );
    return creerVerdict({
      correct: false,
      criteres_satisfaits: [],
      erreur_type_id: distracteur?.erreur_type_id ?? 'selection_incorrecte',
      diagnostic: 'La sélection ne correspond pas aux bonnes réponses.',
    });
  }

  #symbolic(
    question: Extract<Question, { kind: 'symbolic' }>,
    reponse: ReponseEleve,
  ): Verdict {
    const candidat = (reponse.texte ?? '').trim();
    if (candidat === '') {
      return creerVerdict({
        correct: false,
        criteres_satisfaits: [],
        erreur_type_id: 'reponse_vide',
        diagnostic: 'Aucune expression fournie.',
      });
    }
    const ok = equivalentes(
      question.attendu.expression,
      candidat,
      question.attendu.variables,
    );
    if (ok) {
      return creerVerdict({ correct: true, criteres_satisfaits: ['equivalence'] });
    }
    return creerVerdict({
      correct: false,
      criteres_satisfaits: [],
      erreur_type_id: 'expression_non_equivalente',
      diagnostic: 'L’expression n’est pas équivalente à celle attendue.',
    });
  }

  #libre(
    question: Extract<Question, { kind: 'libre' }>,
    reponse: ReponseEleve,
  ): Verdict {
    const texte = normaliser(reponse.texte ?? '');
    const satisfaits: string[] = [];
    for (const critere of question.criteres) {
      const motsCles = critere.mots_cles ?? [];
      // Sans mots-clés, le critère n'est pas vérifiable déterministiquement :
      // on ne le valide PAS (§1.1) — l'évaluation LLM viendra plus tard (P3).
      const ok =
        motsCles.length > 0 &&
        motsCles.every((m) => texte.includes(normaliser(m)));
      if (ok) satisfaits.push(critere.id);
    }
    const requis = question.criteres.filter((c) => c.requis);
    const correct = requis.every((c) => satisfaits.includes(c.id));
    return creerVerdict(
      correct
        ? { correct: true, criteres_satisfaits: satisfaits }
        : {
            correct: false,
            criteres_satisfaits: satisfaits,
            erreur_type_id: 'criteres_manquants',
            diagnostic: 'Certains éléments attendus manquent dans la réponse.',
          },
    );
  }
}
