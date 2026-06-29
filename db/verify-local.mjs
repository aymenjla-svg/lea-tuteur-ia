/**
 * Vérifie le schéma + le PgStore contre un Postgres réel (local ou Supabase).
 *
 *   # Postgres local éphémère :
 *   DATABASE_URL=postgres://postgres@localhost:5432/lea node --import tsx db/verify-local.mjs
 *   # ou via socket :
 *   PGHOST=/tmp/lea-pg/sock PGPORT=55432 PGUSER=postgres PGDATABASE=lea node --import tsx db/verify-local.mjs
 *
 * Applique db/schema.sql, fait tourner une vraie session du moteur, persiste via
 * PgStore (write-through) puis vérifie les écritures et l'isolation RLS.
 * Nécessite un Postgres accessible — non lancé en CI.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  catalogueErreursDemo, curriculumDemo, HeuristicLearnerModel, HorlogeManuelle,
  id, MagasinMemoire, MinimalSafetyFilter, MoteurLecon, PgStore, VerifierStandard,
} from '../src/engine/index.js';

const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST ?? '/tmp/lea-pg/sock',
      port: Number(process.env.PGPORT ?? 55432),
      user: process.env.PGUSER ?? 'postgres',
      database: process.env.PGDATABASE ?? 'lea',
    };

const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));
const pool = new pg.Pool(config);
const store = new PgStore({ pool });

await store.migrer(readFileSync(schemaPath, 'utf8'));

// Parents (FK) — persistés en amont par le curriculum + les comptes en prod.
await pool.query(`
  insert into tenants(tenant_id,mode_ia,region,libelle) values ('tenant-demo','inclus','eu-west','Démo') on conflict do nothing;
  insert into referentiels(tenant_id,id,libelle,version) values ('tenant-demo','ref-bo-cycle3-maths','BO','2026.06') on conflict do nothing;
  insert into objectifs(tenant_id,id,referentiel_id,libelle,notion,competences)
    values ('tenant-demo','obj-addition-2-chiffres','ref-bo-cycle3-maths','Additionner','Addition',array['calculer']) on conflict do nothing;
  insert into users(tenant_id,id,email,role) values ('tenant-demo','u1','a@demo','prof') on conflict do nothing;
  insert into eleves(tenant_id,id,user_id,prenom) values ('tenant-demo','eleve-lou','u1','Lou') on conflict do nothing;
  insert into personas(tenant_id,id,apparence,soul,pedagogie) values ('tenant-demo','persona-lea','{}','{}','{}') on conflict do nothing;
  insert into sessions(tenant_id,id,eleve_id,persona_id) values ('tenant-demo','session-001','eleve-lou','persona-lea') on conflict do nothing;
`);

const tenant_id = id('tenant-demo');
const horloge = new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));
const curriculum = curriculumDemo(tenant_id, horloge);
const magasin = new MagasinMemoire();
const moteur = new MoteurLecon({
  tenant_id, curriculum, verifier: new VerifierStandard(),
  learnerModel: new HeuristicLearnerModel(tenant_id, curriculum, horloge),
  safety: new MinimalSafetyFilter(tenant_id, horloge), magasin, horloge,
  pedagogie: { seuil_blocage: 2, ordre_leviers: ['simplifier', 'reformuler', 'changer_de_modalite'], modalite_par_defaut: 'textuel', seuil_maitrise: 0.8, intensite_encouragement: 0.7 },
  catalogueErreurs: catalogueErreursDemo(tenant_id, horloge),
});
const session_id = id('session-001');
let etat = await moteur.demarrer({ session_id, eleve_id: id('eleve-lou'), persona_id: id('persona-lea'), objectif_initial: id('obj-addition-2-chiffres') });
for (const t of ['je veux mourir', '75', '65', '75', '75', '75']) {
  if (etat.termine) break;
  etat = await moteur.repondre(session_id, t);
}

await store.persister(tenant_id, magasin);

const q = async (sql) => (await pool.query(sql)).rows[0].n;
console.log('Écritures Postgres :');
console.log('  tentatives :', await q("select count(*)::int n from tentatives"));
console.log('  events     :', await q("select count(*)::int n from events"));
console.log('  alertes    :', await q("select count(*)::int n from safety_alerts where escalade_requise"));
console.log('  tours      :', await q("select count(*)::int n from dialogue_turns"));

await pool.query("drop role if exists lea_app; create role lea_app nosuperuser nologin;");
await pool.query("grant usage on schema public to lea_app; grant select on all tables in schema public to lea_app;");
const c = await pool.connect();
await c.query('set role lea_app');
await c.query("select set_config('app.current_tenant','tenant-demo',false)");
const vu = (await c.query('select count(*)::int n from tentatives')).rows[0].n;
await c.query("select set_config('app.current_tenant','autre',false)");
const autre = (await c.query('select count(*)::int n from tentatives')).rows[0].n;
await c.query('reset role');
c.release();
console.log(`RLS : tenant-demo voit ${vu} tentatives · autre voit ${autre}`);

await store.fermer();
console.log(vu > 0 && autre === 0 ? 'OK ✓' : 'ÉCHEC ✗');
