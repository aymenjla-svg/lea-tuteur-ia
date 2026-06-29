/**
 * PgStore — persistance Postgres (D7), cible Supabase.
 *
 * Implémente la persistance derrière les mêmes contrats (P3) : applique le
 * schéma (`db/schema.sql`), pose le tenant courant pour la RLS, et écrit un
 * `MagasinMemoire` (write-through depuis la session en mémoire vers Postgres).
 *
 * RLS : chaque écriture se fait dans une transaction où l'on positionne
 * `app.current_tenant` via `set_config(...)` ; les policies du schéma isolent
 * alors par tenant (validé contre Postgres 16). Sur Supabase, se connecter avec
 * un rôle NON bypass-RLS (pas le `service_role`) pour que l'isolation s'applique.
 *
 * Les agrégats référencés (élève, objectif, session…) doivent exister (FK) :
 * `persister` écrit la télémétrie de session (tentatives, alertes, tours,
 * events) ; le curriculum et les comptes sont persistés en amont.
 */

import pg from 'pg';

import type { TenantId } from '../../contracts/index.js';
import type { MagasinMemoire } from './in-memory-store.js';

export interface OptionsPgStore {
  readonly connectionString?: string;
  /** Config/pool injectable (tests, socket Unix…). */
  readonly pool?: pg.Pool;
  readonly config?: pg.PoolConfig;
}

export class PgStore {
  readonly #pool: pg.Pool;

  constructor(opts: OptionsPgStore = {}) {
    this.#pool =
      opts.pool ??
      new pg.Pool(
        opts.config ??
          (opts.connectionString ? { connectionString: opts.connectionString } : {}),
      );
  }

  /** Applique un script SQL (ex. db/schema.sql). */
  async migrer(ddl: string): Promise<void> {
    await this.#pool.query(ddl);
  }

  async fermer(): Promise<void> {
    await this.#pool.end();
  }

  /** Pose le tenant courant pour la RLS sur un client donné. */
  async #poserTenant(client: pg.PoolClient, tenant_id: TenantId): Promise<void> {
    await client.query('select set_config($1, $2, false)', [
      'app.current_tenant',
      tenant_id,
    ]);
  }

  /**
   * Écrit la télémétrie de session d'un `MagasinMemoire` (write-through),
   * sous RLS, en une transaction. Idempotent sur les ids (`on conflict`).
   */
  async persister(tenant_id: TenantId, magasin: MagasinMemoire): Promise<void> {
    const client = await this.#pool.connect();
    try {
      await client.query('begin');
      await this.#poserTenant(client, tenant_id);

      for (const t of magasin.tentatives) {
        await client.query(
          `insert into tentatives
             (tenant_id, id, eleve_id, objectif_id, template_id, type_evaluation,
              correct, erreur_type_id, horodatage, cree_le, modifie_le)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           on conflict (tenant_id, id) do nothing`,
          [
            t.tenant_id, t.id, t.eleve_id, t.objectif_id, t.template_id,
            t.type_evaluation, t.verdict.correct, t.verdict.erreur_type_id ?? null,
            t.horodatage, t.cree_le, t.modifie_le,
          ],
        );
      }

      for (const a of magasin.alertes) {
        await client.query(
          `insert into safety_alerts
             (tenant_id, id, eleve_id, session_id, categorie, severite, extrait,
              escalade_requise, cree_a, cree_le, modifie_le)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           on conflict (tenant_id, id) do nothing`,
          [
            a.tenant_id, a.id, a.eleve_id, a.session_id, a.categorie, a.severite,
            a.extrait, a.escalade_requise, a.cree_a, a.cree_le, a.modifie_le,
          ],
        );
      }

      for (const d of magasin.dialogueTurns) {
        await client.query(
          `insert into dialogue_turns
             (tenant_id, id, session_id, locuteur, texte, coup, horodatage, cree_le, modifie_le)
           values ($1,$2,$3,$4,$5,$6,$7,$7,$7)
           on conflict (tenant_id, id) do nothing`,
          [
            tenant_id, d.id, d.session_id, d.locuteur, d.texte,
            d.coup ? JSON.stringify(d.coup) : null, d.horodatage,
          ],
        );
      }

      for (const e of magasin.evenements.evenements) {
        await client.query(
          `insert into events (tenant_id, type, payload, horodatage)
           values ($1,$2,$3,$4)`,
          [e.tenant_id, e.type, JSON.stringify(e.payload), e.horodatage],
        );
      }

      await client.query('commit');
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  }
}
