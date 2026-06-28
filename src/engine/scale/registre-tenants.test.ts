import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { TenantId } from '../../contracts/index.js';
import { id } from '../core.js';
import { RegistreTenants } from './registre-tenants.js';

function registre() {
  const r = new RegistreTenants();
  r.enregistrer({ tenant_id: id<TenantId>('t'), mode_ia: 'byok', region: 'eu-west' });
  return r;
}

test('§1.7 : no_train est FORCÉ à true pour un mineur (non reportable)', () => {
  const ctx = registre().contexteConformite(id<TenantId>('t'), {
    est_mineur: true,
    consentement_adulte: true,
  });
  assert.equal(ctx.no_train, true);
  assert.equal(ctx.region, 'eu-west');
});

test('majeur : no_train non forcé', () => {
  const ctx = registre().contexteConformite(id<TenantId>('t'), {
    est_mineur: false,
    consentement_adulte: true,
  });
  assert.equal(ctx.no_train, false);
});

test('tenant inconnu ⇒ lève', () => {
  assert.throws(() =>
    registre().contexteConformite(id<TenantId>('absent'), {
      est_mineur: false,
      consentement_adulte: true,
    }),
  );
});
