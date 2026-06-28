/**
 * RegistreTenants — annuaire multi-tenant (P4, D6/D7).
 *
 * Chaque tenant porte son `mode_ia` (inclus|byok) et sa `region` (résidence des
 * données). Le registre fabrique aussi le `ComplianceContext` d'une interaction
 * — et c'est là qu'on grave l'invariant §1.7 : pour un mineur, `no_train` est
 * FORCÉ à `true`, quel que soit le réglage du tenant (non reportable).
 */

import type {
  ComplianceContext,
  ModeIA,
  Region,
  TenantId,
} from '../../contracts/index.js';

export interface InfoTenant {
  readonly tenant_id: TenantId;
  readonly mode_ia: ModeIA;
  readonly region: Region;
}

export class RegistreTenants {
  readonly #parId = new Map<TenantId, InfoTenant>();

  enregistrer(info: InfoTenant): void {
    this.#parId.set(info.tenant_id, info);
  }

  obtenir(tenant_id: TenantId): InfoTenant | null {
    return this.#parId.get(tenant_id) ?? null;
  }

  /**
   * Construit le contexte de conformité d'une interaction. Pour un mineur,
   * `no_train` est forcé à `true` (§1.7) — on ne fait pas confiance à l'appelant.
   */
  contexteConformite(
    tenant_id: TenantId,
    options: { readonly est_mineur: boolean; readonly consentement_adulte: boolean },
  ): ComplianceContext {
    const info = this.#parId.get(tenant_id);
    if (!info) throw new Error(`Tenant inconnu : ${tenant_id}.`);
    return {
      est_mineur: options.est_mineur,
      consentement_adulte: options.consentement_adulte,
      no_train: options.est_mineur ? true : false,
      region: info.region,
    };
  }
}
