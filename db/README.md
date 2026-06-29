# Schéma Postgres — `db/schema.sql`

Schéma multi-tenant de référence (D7, §5, §13), aligné sur les contrats de
`src/contracts`. **Artefact de conception, pas encore câblé** : la persistance
Phases 1–2 est en mémoire (`src/engine/persistence`). En Phase 4, un `PgStore`
remplacera `MagasinMemoire` derrière les mêmes contrats (P3), sans toucher le
moteur.

## Ce que le schéma garantit

- **`tenant_id` sur chaque table** + **`cree_le`/`modifie_le` partout** (§13).
- **RLS activée et forcée** sur toutes les tables : chaque requête ne voit que
  le tenant courant (D7). L'application positionne :
  ```sql
  SET app.current_tenant = '<uuid-du-tenant>';
  ```
- **DAG curriculaire** (`objectifs` + `prerequis`, anti-boucle via `CHECK`).
- **Contenu prof vs LLM** (`exercice_templates.origine/statut`, R1).
- **`events` + `safety_alerts`** : télémétrie et sécurité dès le départ
  (D13, R5).
- **`embeddings`** prêt pour pgvector (Phase 2 ; colonne `vector(N)` à activer).

## Cible : Supabase (Postgres managé)

Supabase = Postgres, donc ce schéma s'y applique directement. Le MCP Supabase
du projet est déclaré dans `.mcp.json` (`project_ref` = `wncsqdxtqfhwjkmeqpgt`) ;
deux skills sont installées (`supabase`, `supabase-postgres-best-practices`).

À faire (demain, quand le MCP est connecté + authentifié) :
1. `create extension if not exists vector;` puis activer la colonne
   `embedding vector(768)` de `embeddings` (RAG, Phase 2).
2. Appliquer `db/schema.sql` (via le MCP Supabase ou `psql`).
3. Implémenter `PgStore` (`pg`) : `migrer()` applique le schéma, `persister()`
   écrit un `MagasinMemoire` (write-through), `definirTenant()` pose
   `app.current_tenant` (`select set_config('app.current_tenant', $1, false)`).
4. RLS : le schéma isole par `app.current_tenant` (GUC), adapté à une
   connexion service backend. Pour une RLS basée sur Supabase Auth, remplacer
   les policies par `tenant_id = (auth.jwt() ->> 'tenant_id')`.

> ⚠️ Les `id`/`tenant_id` sont typés `uuid`. Les seeds de démo utilisent des
> identifiants lisibles (`obj-addition-2-chiffres`) : en production, générer des
> UUID (`gen_random_uuid()`), ou passer ces colonnes en `text` si l'on veut
> conserver des identifiants lisibles.

## Statut & limites

Ce fichier **n'a pas été exécuté** dans cet environnement (aucune base
disponible / MCP Supabase non connecté à cette session). À appliquer demain via
le MCP Supabase. Le mapping `verdict` (objet riche en mémoire) est aplati en
`correct` + `erreur_type_id` dans `tentatives` — suffisant pour la maîtrise et
le dashboard.
