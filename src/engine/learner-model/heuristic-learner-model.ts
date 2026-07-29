/**
 * HeuristicLearnerModel — modèle de l'élève v1 (D3/R2, D4).
 *
 * Heuristique HONNÊTE et transparente (pas de BKT encore — D3/R2 : BKT en
 * Phase 2, calé sur données). La règle de mise à jour est volontairement
 * simple et lisible :
 *   succès → p += alpha·(1−p)     (on monte vers 1, par paliers décroissants)
 *   échec  → p ·= (1−beta)        (on redescend proportionnellement)
 *
 * D4 — decay au CALCUL : la maîtrise stockée est datée (`derniere_revision`).
 * `niveauMaitrise` la dégrade selon le temps écoulé via une demi-vie, SANS job
 * de fond. Un objectif est « à réviser » quand sa maîtrise effective repasse
 * sous un seuil → répétition espacée.
 *
 * L'interface est stable : remplacer cette heuristique par un BKT (Phase 2) ne
 * touche aucun appelant (P3).
 */

import type {
  Competence,
  Curriculum,
  EleveId,
  ISODateTime,
  LearnerModel,
  Maitrise,
  MaitriseEffective,
  ObjectifId,
  ProfilCompetences,
  Tentative,
  TenantId,
} from '../../contracts/index.js';
import { COMPETENCES, type Horloge, versEpoch } from '../core.js';

/** Paramètres de l'heuristique (réglables ; defaults raisonnables v1). */
export interface ParametresHeuristique {
  readonly prior: number; // maîtrise initiale supposée
  readonly alpha: number; // gain sur succès
  readonly beta: number; // pénalité sur échec
  readonly demiVieJours: number; // demi-vie du decay (D4)
  readonly seuilRevision: number; // sous ce niveau effectif → à réviser
}

const DEFAUTS: ParametresHeuristique = {
  prior: 0.1,
  alpha: 0.4,
  beta: 0.5,
  demiVieJours: 7,
  seuilRevision: 0.7,
};

const MS_PAR_JOUR = 86_400_000;

function clef(eleve: EleveId, objectif: ObjectifId): string {
  return `${eleve}::${objectif}`;
}

export class HeuristicLearnerModel implements LearnerModel {
  readonly #maitrises = new Map<string, Maitrise>();
  readonly #params: ParametresHeuristique;
  readonly #lambda: number; // constante de decay dérivée de la demi-vie

  constructor(
    private readonly tenant_id: TenantId,
    private readonly curriculum: Curriculum,
    private readonly horloge: Horloge,
    params: Partial<ParametresHeuristique> = {},
  ) {
    this.#params = { ...DEFAUTS, ...params };
    this.#lambda = Math.LN2 / this.#params.demiVieJours;
  }

  async enregistrerTentative(tentative: Tentative): Promise<Maitrise> {
    const k = clef(tentative.eleve_id, tentative.objectif_id);
    const precedent = this.#maitrises.get(k);
    const pAvant = precedent?.probabilite_maitrise ?? this.#params.prior;
    const reussi = tentative.verdict.correct;
    const pApres = reussi
      ? pAvant + this.#params.alpha * (1 - pAvant)
      : pAvant * (1 - this.#params.beta);

    const maj: Maitrise = {
      tenant_id: this.tenant_id,
      eleve_id: tentative.eleve_id,
      objectif_id: tentative.objectif_id,
      probabilite_maitrise: arrondir(pApres),
      derniere_revision: tentative.horodatage,
      nb_tentatives: (precedent?.nb_tentatives ?? 0) + 1,
      cree_le: precedent?.cree_le ?? tentative.horodatage,
      modifie_le: tentative.horodatage,
      ...(reussi
        ? { derniere_reussite: tentative.horodatage }
        : precedent?.derniere_reussite
          ? { derniere_reussite: precedent.derniere_reussite }
          : {}),
    };
    this.#maitrises.set(k, maj);
    return maj;
  }

  async niveauMaitrise(
    eleve_id: EleveId,
    objectif_id: ObjectifId,
    maintenant: ISODateTime,
  ): Promise<MaitriseEffective> {
    const m = this.#maitrises.get(clef(eleve_id, objectif_id));
    if (!m) {
      // Objectif jamais travaillé : ni maîtrisé, ni « à réviser » (à introduire).
      return {
        objectif_id,
        probabilite_effective: 0,
        a_reviser: false,
      };
    }
    return this.#effective(m, maintenant);
  }

  async objectifsAReviser(
    eleve_id: EleveId,
    maintenant: ISODateTime,
  ): Promise<readonly MaitriseEffective[]> {
    const resultats: MaitriseEffective[] = [];
    for (const m of this.#maitrises.values()) {
      if (m.eleve_id !== eleve_id) continue;
      const eff = this.#effective(m, maintenant);
      if (eff.a_reviser) resultats.push(eff);
    }
    return resultats;
  }

  async profilCompetences(eleve_id: EleveId): Promise<ProfilCompetences> {
    const maintenant = this.horloge.maintenant();
    const sommes = new Map<Competence, { somme: number; n: number }>();
    for (const c of COMPETENCES) sommes.set(c, { somme: 0, n: 0 });

    for (const m of this.#maitrises.values()) {
      if (m.eleve_id !== eleve_id) continue;
      const eff = this.#effective(m, maintenant);
      const objectif = await this.curriculum.obtenirObjectif(m.objectif_id);
      if (!objectif) continue;
      for (const c of objectif.competences) {
        const acc = sommes.get(c);
        if (!acc) continue;
        acc.somme += eff.probabilite_effective;
        acc.n += 1;
      }
    }

    const niveaux: Record<Competence, number> = {
      chercher: 0,
      modeliser: 0,
      representer: 0,
      raisonner: 0,
      calculer: 0,
      communiquer: 0,
    };
    for (const c of COMPETENCES) {
      const acc = sommes.get(c);
      niveaux[c] = acc && acc.n > 0 ? arrondir(acc.somme / acc.n) : 0;
    }

    return { eleve_id, niveaux, calcule_le: maintenant };
  }

  /** Applique le decay (D4) à une maîtrise stockée, à l'instant donné. */
  #effective(m: Maitrise, maintenant: ISODateTime): MaitriseEffective {
    const jours = Math.max(
      0,
      (versEpoch(maintenant) - versEpoch(m.derniere_revision)) / MS_PAR_JOUR,
    );
    const facteur = Math.exp(-this.#lambda * jours);
    const effective = arrondir(m.probabilite_maitrise * facteur);
    return {
      objectif_id: m.objectif_id,
      probabilite_effective: effective,
      a_reviser: effective < this.#params.seuilRevision,
    };
  }
}

function arrondir(x: number): number {
  return Math.round(Math.min(1, Math.max(0, x)) * 1000) / 1000;
}
