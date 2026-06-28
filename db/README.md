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

## Statut & limites

Ce fichier **n'a pas été exécuté** dans cet environnement (aucune base
disponible). À relire et tester (`psql -f db/schema.sql`) avant tout usage.
Le mapping `verdict` (objet riche en mémoire) est aplati en `correct` +
`erreur_type_id` dans `tentatives` — suffisant pour la maîtrise et le dashboard.
