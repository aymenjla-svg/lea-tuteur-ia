/**
 * MinimalSafetyFilter — sécurité du dialogue minimale (R5, §1.6), dès la P1.
 *
 * Volontairement simple (listes de motifs) mais REELLEMENT branché : tout
 * texte tuteur passe par le filtre de sortie avant d'être prononcé, et toute
 * entrée élève est scannée pour la détresse → `SafetyAlert` + escalade adulte.
 *
 * Choix de design :
 *  - Sortie LLM humiliante (§1.3) → on RÉÉCRIT vers une formulation neutre
 *    (on ne laisse jamais passer, mais on ne casse pas le dialogue).
 *  - Détresse en entrée → on AUTORISE l'expression de l'enfant (ne pas le faire
 *    taire) MAIS on lève une alerte critique escaladée à l'adulte (§9).
 *
 * Ce n'est PAS un classifieur robuste : la Phase 2 le remplace (P3). Le
 * contrat, lui, ne bouge pas.
 */

import type {
  EleveId,
  ISODateTime,
  ResultatFiltre,
  SafetyAlert,
  SafetyFilter,
  SessionId,
  SourceTexte,
  TenantId,
} from '../../contracts/index.js';
import { type Horloge, nouvelId } from '../core.js';

/** Motifs d'humiliation à ne jamais laisser sortir vers l'élève (§1.3). */
const MOTIFS_HUMILIATION = [
  'nul',
  'nulle',
  'idiot',
  'bête',
  'stupide',
  'incapable',
  'débile',
];

/** Motifs de détresse en entrée élève (signal → escalade adulte). */
const MOTIFS_DETRESSE = [
  'je veux mourir',
  'me faire du mal',
  'me faire mal',
  'plus envie de vivre',
  'personne ne m’aime',
  'personne ne m’aime pas',
  'je déteste ma vie',
];

const REECRITURE_NEUTRE =
  'Reprenons calmement, étape par étape — tu peux y arriver.';

function contient(texte: string, motifs: readonly string[]): string | null {
  const bas = texte.toLowerCase();
  for (const m of motifs) {
    if (bas.includes(m)) return m;
  }
  return null;
}

export class MinimalSafetyFilter implements SafetyFilter {
  constructor(
    private readonly tenant_id: TenantId,
    private readonly horloge: Horloge,
  ) {}

  async filtrer(
    texte: string,
    source: SourceTexte,
    contexte: { readonly eleve_id: EleveId; readonly session_id: SessionId },
  ): Promise<ResultatFiltre> {
    if (source === 'llm_sortie') {
      const motif = contient(texte, MOTIFS_HUMILIATION);
      if (motif) {
        return {
          decision: 'reecrire',
          texte_sur: REECRITURE_NEUTRE,
          categories: ['humiliation'],
        };
      }
      return { decision: 'autoriser', categories: [] };
    }

    // source === 'eleve_entree' : on cherche un signal de détresse.
    const motif = contient(texte, MOTIFS_DETRESSE);
    if (motif) {
      const alerte = this.#alerte(texte, contexte);
      return {
        decision: 'autoriser', // on ne fait pas taire l'enfant
        categories: ['detresse', 'auto_agression'],
        alerte,
      };
    }
    return { decision: 'autoriser', categories: [] };
  }

  #alerte(
    extraitBrut: string,
    contexte: { readonly eleve_id: EleveId; readonly session_id: SessionId },
  ): SafetyAlert {
    const t: ISODateTime = this.horloge.maintenant();
    return {
      tenant_id: this.tenant_id,
      id: nouvelId(),
      eleve_id: contexte.eleve_id,
      session_id: contexte.session_id,
      categorie: 'detresse',
      severite: 'critique',
      extrait: extraitBrut.slice(0, 200), // minimisation (§9)
      cree_a: t,
      escalade_requise: true,
      cree_le: t,
      modifie_le: t,
    };
  }
}
