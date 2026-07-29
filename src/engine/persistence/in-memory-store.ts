/**
 * MagasinMemoire — persistance en mémoire (Phase 1).
 *
 * « Persister » dans la boucle P1 (§12) sans base de données : des tableaux
 * tenant-scopés + un collecteur d'événements (§13). Remplaçable par Postgres
 * (D7, RLS) en Phase 2 — le contrat des dépôts ne change pas (P3).
 *
 * Chaque entité stockée est un `Aggregate` (tenant_id + timestamps), donc les
 * invariants §13 sont déjà respectés à la source.
 */

import type {
  DialogueTurn,
  SafetyAlert,
  Tentative,
} from '../../contracts/index.js';
import { CollecteurEvenements } from '../core.js';

export class MagasinMemoire {
  readonly tentatives: Tentative[] = [];
  readonly alertes: SafetyAlert[] = [];
  readonly dialogueTurns: DialogueTurn[] = [];
  readonly evenements = new CollecteurEvenements();

  ajouterTentative(t: Tentative): void {
    this.tentatives.push(t);
  }
  ajouterAlerte(a: SafetyAlert): void {
    this.alertes.push(a);
  }
  ajouterTurn(d: DialogueTurn): void {
    this.dialogueTurns.push(d);
  }
}
