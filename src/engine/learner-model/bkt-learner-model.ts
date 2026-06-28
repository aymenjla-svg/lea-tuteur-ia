/**
 * BktLearnerModel — Bayesian Knowledge Tracing (D3/R2, Phase 2).
 *
 * Modèle probabiliste classique à 4 paramètres :
 *   p_init    P(connaissance initiale)
 *   p_transit P(apprentissage entre deux tentatives)
 *   p_slip    P(se tromper alors qu'on sait)
 *   p_guess   P(réussir par chance alors qu'on ne sait pas)
 *
 * À chaque tentative : 1) mise à jour bayésienne du postérieur selon
 * l'observation, 2) transition d'apprentissage. Le decay D4 reste appliqué AU
 * CALCUL (à la lecture), exactement comme pour l'heuristique.
 *
 * Point clé d'architecture : ce modèle implémente le MÊME contrat
 * `LearnerModel` que `HeuristicLearnerModel`. On peut donc remplacer l'un par
 * l'autre sans toucher au moteur (P3 / R2 : heuristique v1 → BKT v2).
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

export interface ParametresBKT {
  readonly pInit: number;
  readonly pTransit: number;
  readonly pSlip: number;
  readonly pGuess: number;
  readonly demiVieJours: number;
  readonly seuilRevision: number;
}

const DEFAUTS: ParametresBKT = {
  pInit: 0.2,
  pTransit: 0.3,
  pSlip: 0.1,
  pGuess: 0.2,
  demiVieJours: 10,
  seuilRevision: 0.7,
};

const MS_PAR_JOUR = 86_400_000;

function clef(eleve: EleveId, objectif: ObjectifId): string {
  return `${eleve}::${objectif}`;
}

export class BktLearnerModel implements LearnerModel {
  readonly #maitrises = new Map<string, Maitrise>();
  readonly #params: ParametresBKT;
  readonly #lambda: number;

  constructor(
    private readonly tenant_id: TenantId,
    private readonly curriculum: Curriculum,
    private readonly horloge: Horloge,
    params: Partial<ParametresBKT> = {},
  ) {
    this.#params = { ...DEFAUTS, ...params };
    this.#lambda = Math.LN2 / this.#params.demiVieJours;
  }

  async enregistrerTentative(tentative: Tentative): Promise<Maitrise> {
    const k = clef(tentative.eleve_id, tentative.objectif_id);
    const precedent = this.#maitrises.get(k);
    const pAvant = precedent?.probabilite_maitrise ?? this.#params.pInit;
    const pApres = this.#miseAJour(pAvant, tentative.verdict.correct);

    const reussi = tentative.verdict.correct;
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

  /** Postérieur bayésien puis transition d'apprentissage. */
  #miseAJour(p: number, correct: boolean): number {
    const { pSlip, pGuess, pTransit } = this.#params;
    const posterieur = correct
      ? (p * (1 - pSlip)) / (p * (1 - pSlip) + (1 - p) * pGuess)
      : (p * pSlip) / (p * pSlip + (1 - p) * (1 - pGuess));
    return posterieur + (1 - posterieur) * pTransit;
  }

  async niveauMaitrise(
    eleve_id: EleveId,
    objectif_id: ObjectifId,
    maintenant: ISODateTime,
  ): Promise<MaitriseEffective> {
    const m = this.#maitrises.get(clef(eleve_id, objectif_id));
    if (!m) {
      return { objectif_id, probabilite_effective: 0, a_reviser: false };
    }
    return this.#effective(m, maintenant);
  }

  async objectifsAReviser(
    eleve_id: EleveId,
    maintenant: ISODateTime,
  ): Promise<readonly MaitriseEffective[]> {
    const out: MaitriseEffective[] = [];
    for (const m of this.#maitrises.values()) {
      if (m.eleve_id !== eleve_id) continue;
      const eff = this.#effective(m, maintenant);
      if (eff.a_reviser) out.push(eff);
    }
    return out;
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
