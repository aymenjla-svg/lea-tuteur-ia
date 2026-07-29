/**
 * Dashboard — projection d'indicateurs depuis la télémétrie (D13, §13).
 *
 * Fonction PURE sur le magasin : aucune écriture, aucune dépendance réseau.
 * Renvoie un objet JSON-sérialisable, prêt à alimenter une UI (ou un endpoint
 * HTTP en Phase 3+). C'est la lecture « santé pédagogique » côté éducateur.
 */

import type { ProfilCompetences } from '../../contracts/index.js';
import type { MagasinMemoire } from '../persistence/in-memory-store.js';

export interface IndicateursDashboard {
  readonly tentatives_total: number;
  readonly tentatives_reussies: number;
  readonly taux_reussite: number; // [0,1]
  readonly sessions: number;
  readonly tours_dialogue: number;
  readonly alertes: number;
  readonly alertes_critiques: number;
  /** Comptage des erreurs-types rencontrées (tentatives incorrectes). */
  readonly erreurs_types: Readonly<Record<string, number>>;
  /** Comptage d'événements par type (§13). */
  readonly evenements: Readonly<Record<string, number>>;
  /** Profils de compétences fournis (optionnel). */
  readonly profils: readonly ProfilCompetences[];
}

export function tableauDeBord(
  magasin: MagasinMemoire,
  profils: readonly ProfilCompetences[] = [],
): IndicateursDashboard {
  const total = magasin.tentatives.length;
  const reussies = magasin.tentatives.filter((t) => t.verdict.correct).length;

  const erreurs_types: Record<string, number> = {};
  for (const t of magasin.tentatives) {
    if (t.verdict.correct) continue;
    const e = t.verdict.erreur_type_id;
    if (e) erreurs_types[e] = (erreurs_types[e] ?? 0) + 1;
  }

  const evenements: Record<string, number> = {};
  for (const e of magasin.evenements.evenements) {
    evenements[e.type] = (evenements[e.type] ?? 0) + 1;
  }

  const sessions = new Set(magasin.dialogueTurns.map((d) => d.session_id)).size;

  return {
    tentatives_total: total,
    tentatives_reussies: reussies,
    taux_reussite: total > 0 ? Math.round((reussies / total) * 1000) / 1000 : 0,
    sessions,
    tours_dialogue: magasin.dialogueTurns.length,
    alertes: magasin.alertes.length,
    alertes_critiques: magasin.alertes.filter((a) => a.severite === 'critique')
      .length,
    erreurs_types,
    evenements,
    profils,
  };
}
