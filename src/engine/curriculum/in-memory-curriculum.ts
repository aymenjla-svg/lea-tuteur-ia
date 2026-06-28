/**
 * InMemoryCurriculum — accès au DAG en mémoire (Phase 1).
 *
 * Implémente le contrat `Curriculum` (§4) sans base de données : suffisant pour
 * la tranche verticale (1 objectif). Remplaçable par une implémentation
 * Postgres en Phase 2 sans toucher les appelants (P3).
 *
 * Le seed `curriculumDemo` fournit le 1ᵉʳ contenu — origine PROF (R1), texte
 * seul — et un prérequis, pour démontrer le levier `simplifier` (R7).
 */

import type {
  Curriculum,
  Explication,
  ExerciceTemplate,
  Modalite,
  Objectif,
  ObjectifId,
  Prerequis,
  Referentiel,
  TenantId,
} from '../../contracts/index.js';
import { type Horloge, id } from '../core.js';

export class InMemoryCurriculum implements Curriculum {
  readonly #objectifs = new Map<ObjectifId, Objectif>();
  readonly #prerequis: Prerequis[] = [];
  readonly #templates = new Map<ObjectifId, ExerciceTemplate[]>();
  readonly #explications = new Map<ObjectifId, Explication[]>();

  ajouterObjectif(o: Objectif): void {
    this.#objectifs.set(o.id, o);
  }
  ajouterPrerequis(p: Prerequis): void {
    this.#prerequis.push(p);
  }
  ajouterTemplate(t: ExerciceTemplate): void {
    const liste = this.#templates.get(t.objectif_id) ?? [];
    liste.push(t);
    this.#templates.set(t.objectif_id, liste);
  }
  ajouterExplication(e: Explication): void {
    const liste = this.#explications.get(e.objectif_id) ?? [];
    liste.push(e);
    this.#explications.set(e.objectif_id, liste);
  }

  async obtenirObjectif(idObjectif: ObjectifId): Promise<Objectif | null> {
    return this.#objectifs.get(idObjectif) ?? null;
  }

  async prerequisDirects(idObjectif: ObjectifId): Promise<readonly Objectif[]> {
    const ids = this.#prerequis
      .filter((p) => p.objectif_id === idObjectif)
      .map((p) => p.prerequis_id);
    return this.#resoudre(ids);
  }

  async objectifsSuivants(idObjectif: ObjectifId): Promise<readonly Objectif[]> {
    const ids = this.#prerequis
      .filter((p) => p.prerequis_id === idObjectif)
      .map((p) => p.objectif_id);
    return this.#resoudre(ids);
  }

  async templatesPourObjectif(
    idObjectif: ObjectifId,
  ): Promise<readonly ExerciceTemplate[]> {
    return this.#templates.get(idObjectif) ?? [];
  }

  async explicationsPourObjectif(
    idObjectif: ObjectifId,
    modalite?: Modalite,
  ): Promise<readonly Explication[]> {
    const liste = this.#explications.get(idObjectif) ?? [];
    return modalite ? liste.filter((e) => e.modalite === modalite) : liste;
  }

  #resoudre(ids: readonly ObjectifId[]): readonly Objectif[] {
    const out: Objectif[] = [];
    for (const i of ids) {
      const o = this.#objectifs.get(i);
      if (o) out.push(o);
    }
    return out;
  }
}

/* ------------------------------------------------------------------------- */
/* Seed Phase 1 — 1 objectif (+ 1 prérequis), origine prof, texte seul         */
/* ------------------------------------------------------------------------- */

/** Identifiants stables du seed (déterministes pour démos & tests). */
export const OBJ_ADDITION = id<ObjectifId>('obj-addition-2-chiffres');
export const OBJ_PREREQ = id<ObjectifId>('obj-tables-addition');

/** Construit un curriculum de démonstration pour la Phase 1. */
export function curriculumDemo(
  tenant_id: TenantId,
  horloge: Horloge,
): InMemoryCurriculum {
  const t = horloge.maintenant();
  const meta = { tenant_id, cree_le: t, modifie_le: t } as const;

  const referentiel: Referentiel = {
    ...meta,
    id: id('ref-bo-cycle3-maths'),
    libelle: 'BO — cycle 3, mathématiques',
    version: '2026.06',
  };

  const c = new InMemoryCurriculum();

  c.ajouterObjectif({
    ...meta,
    id: OBJ_PREREQ,
    referentiel_id: referentiel.id,
    libelle: 'Connaître les compléments et tables d’addition',
    notion: 'Calcul mental',
    competences: ['calculer'],
  });

  c.ajouterObjectif({
    ...meta,
    id: OBJ_ADDITION,
    referentiel_id: referentiel.id,
    libelle: 'Additionner deux nombres à deux chiffres',
    notion: 'Addition posée',
    competences: ['calculer', 'chercher'],
  });

  // DAG : additionner requiert les tables (prérequis direct).
  c.ajouterPrerequis({ ...meta, objectif_id: OBJ_ADDITION, prerequis_id: OBJ_PREREQ });

  // Template PROF (R1) — texte seul, numérique, une étape.
  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-addition-27-48'),
    objectif_id: OBJ_ADDITION,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'numeric',
          modalite: 'textuel',
          enonce: 'Combien font 27 + 48 ?',
          attendu: { valeur: 75, tolerance: 0 },
          // 65 = oubli de la retenue (7+8=15 → on écrit 5 sans reporter le 1).
          pieges: [{ valeur: 65, erreur_type_id: 'oubli_retenue' }],
        },
        indice: 'Additionne d’abord les dizaines (20 + 40), puis les unités (7 + 8).',
      },
    ],
    representations: [
      { modalite: 'textuel', texte: 'Pose l’addition en colonnes, unités sous unités.' },
    ],
  });

  // Template PROF pour le prérequis (sert au levier « simplifier », R7).
  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-tables-7-8'),
    objectif_id: OBJ_PREREQ,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'numeric',
          modalite: 'textuel',
          enonce: 'Combien font 7 + 8 ?',
          attendu: { valeur: 15, tolerance: 0 },
        },
        indice: 'Pense à 7 + 8 = 7 + 3 + 5.',
      },
    ],
    representations: [{ modalite: 'textuel', texte: 'Compte sur tes doigts si besoin.' }],
  });

  c.ajouterExplication({
    ...meta,
    id: id('expl-addition-colonnes'),
    objectif_id: OBJ_ADDITION,
    modalite: 'textuel',
    contenu:
      'Pour additionner deux nombres à deux chiffres, aligne les unités puis ' +
      'les dizaines. Additionne les unités ; si tu dépasses 9, tu retiens 1.',
  });

  return c;
}
