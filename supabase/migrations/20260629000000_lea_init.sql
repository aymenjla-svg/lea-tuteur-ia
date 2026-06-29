-- Migration initiale Léa (Supabase / Postgres). Validée contre Postgres 16.
-- Miroir de db/schema.sql ; régénérer via 'supabase db pull' après application.

-- =============================================================================
-- Léa — schéma Postgres multi-tenant (D7, §5, §13).
--
-- ARTEFACT DE CONCEPTION : ce schéma matérialise le modèle de données des
-- contrats (§4/§5). Il n'est PAS encore câblé au code (la persistance Phase 1/2
-- est en mémoire — cf. src/engine/persistence). À brancher en Phase 4 derrière
-- les mêmes contrats (P3), via un `PgStore`. À relire avant exécution.
--
-- Invariants gravés ici (§13) :
--   • tenant_id sur CHAQUE table          → cloison multi-tenant
--   • cree_le / modifie_le sur CHAQUE table → timestamps partout
--   • table `events` + `safety_alerts`     → télémétrie / sécurité dès J1
--   • RLS activée partout                   → isolation par tenant (D7)
--
-- Convention d'isolation : l'application pose le tenant courant via
--   SET app.current_tenant = '<text>';
-- et toutes les policies RLS filtrent sur ce réglage.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()::text
-- CREATE EXTENSION IF NOT EXISTS vector;  -- pgvector (embeddings, Phase 2)

-- Helper : tenant courant (NULL si non positionné).
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS text
  LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.current_tenant', true), '')::text
$$;

-- Trigger générique : maintient modifie_le à jour.
CREATE OR REPLACE FUNCTION set_modifie_le() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  NEW.modifie_le := now();
  RETURN NEW;
END
$$;

-- -----------------------------------------------------------------------------
-- Tenants & comptes
-- -----------------------------------------------------------------------------

CREATE TABLE tenants (
  tenant_id   text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  mode_ia     text NOT NULL CHECK (mode_ia IN ('inclus','byok')),
  region      text NOT NULL CHECK (region IN ('eu-west','eu-central','us-east')),
  libelle     text NOT NULL,
  cree_le     timestamptz NOT NULL DEFAULT now(),
  modifie_le  timestamptz NOT NULL DEFAULT now()
);

-- Compte ADULTE (§1.5) : titulaire du consentement.
CREATE TABLE users (
  tenant_id            text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  id                   text NOT NULL DEFAULT gen_random_uuid()::text,
  email                text NOT NULL,
  role                 text NOT NULL,
  cree_le              timestamptz NOT NULL DEFAULT now(),
  modifie_le           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, email)
);

-- Élève (potentiellement mineur) rattaché à un compte adulte.
CREATE TABLE eleves (
  tenant_id            text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  id                   text NOT NULL DEFAULT gen_random_uuid()::text,
  user_id              text NOT NULL,
  prenom               text NOT NULL,
  est_mineur           boolean NOT NULL DEFAULT true,
  consentement_adulte  boolean NOT NULL DEFAULT false,
  cree_le              timestamptz NOT NULL DEFAULT now(),
  modifie_le           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Curriculum (DAG d'objectifs atomiques, D2)
-- -----------------------------------------------------------------------------

CREATE TABLE referentiels (
  tenant_id   text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  id          text NOT NULL DEFAULT gen_random_uuid()::text,
  libelle     text NOT NULL,
  version     text NOT NULL,
  cree_le     timestamptz NOT NULL DEFAULT now(),
  modifie_le  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE objectifs (
  tenant_id        text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  id               text NOT NULL DEFAULT gen_random_uuid()::text,
  referentiel_id   text NOT NULL,
  libelle          text NOT NULL,
  notion           text NOT NULL,
  competences      text[] NOT NULL DEFAULT '{}',  -- parmi les 6 compétences
  cree_le          timestamptz NOT NULL DEFAULT now(),
  modifie_le       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, referentiel_id) REFERENCES referentiels (tenant_id, id) ON DELETE CASCADE
);

-- Arêtes du DAG : objectif_id requiert prerequis_id.
CREATE TABLE prerequis (
  tenant_id     text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  objectif_id   text NOT NULL,
  prerequis_id  text NOT NULL,
  cree_le       timestamptz NOT NULL DEFAULT now(),
  modifie_le    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, objectif_id, prerequis_id),
  FOREIGN KEY (tenant_id, objectif_id)  REFERENCES objectifs (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, prerequis_id) REFERENCES objectifs (tenant_id, id) ON DELETE CASCADE,
  CHECK (objectif_id <> prerequis_id)
);

CREATE TABLE exercice_templates (
  tenant_id        text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  id               text NOT NULL DEFAULT gen_random_uuid()::text,
  objectif_id      text NOT NULL,
  origine          text NOT NULL CHECK (origine IN ('prof','llm')),       -- R1
  statut           text NOT NULL CHECK (statut IN ('valide','a_valider','rejete')),
  parametres       jsonb NOT NULL DEFAULT '[]',
  etapes           jsonb NOT NULL DEFAULT '[]',
  representations  jsonb NOT NULL DEFAULT '[]',                            -- R7
  cree_le          timestamptz NOT NULL DEFAULT now(),
  modifie_le       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, objectif_id) REFERENCES objectifs (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE explications (
  tenant_id    text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  id           text NOT NULL DEFAULT gen_random_uuid()::text,
  objectif_id  text NOT NULL,
  modalite     text NOT NULL CHECK (modalite IN ('textuel','visuel','interactif')),
  asset        text,
  contenu      text NOT NULL,
  cree_le      timestamptz NOT NULL DEFAULT now(),
  modifie_le   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, objectif_id) REFERENCES objectifs (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE erreurs_type (
  tenant_id    text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  id           text NOT NULL,                      -- identifiant stable (ex. oubli_retenue)
  objectif_id  text,
  libelle      text NOT NULL,
  description  text NOT NULL,
  remediation  text NOT NULL,
  cree_le      timestamptz NOT NULL DEFAULT now(),
  modifie_le   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, objectif_id) REFERENCES objectifs (tenant_id, id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Modèle de l'élève (heuristique → BKT, D3/R2 ; decay au calcul, D4)
-- -----------------------------------------------------------------------------

CREATE TABLE maitrise (
  tenant_id            text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  eleve_id             text NOT NULL,
  objectif_id          text NOT NULL,
  probabilite_maitrise double precision NOT NULL CHECK (probabilite_maitrise BETWEEN 0 AND 1),
  derniere_revision    timestamptz NOT NULL,
  derniere_reussite    timestamptz,
  nb_tentatives        integer NOT NULL DEFAULT 0,
  cree_le              timestamptz NOT NULL DEFAULT now(),
  modifie_le           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, eleve_id, objectif_id),
  FOREIGN KEY (tenant_id, eleve_id)    REFERENCES eleves (tenant_id, id)    ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, objectif_id) REFERENCES objectifs (tenant_id, id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Personas (3 facettes, D9/§7) — catalogue = donnée
-- -----------------------------------------------------------------------------

CREATE TABLE personas (
  tenant_id    text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  id           text NOT NULL DEFAULT gen_random_uuid()::text,
  apparence    jsonb NOT NULL,   -- { rpm_avatar, voix_id }
  soul         jsonb NOT NULL,   -- { nom_affiche, style_prompt, tutoiement }
  pedagogie    jsonb NOT NULL,   -- ParametresPedagogie (paramètres moteur, pas prompt)
  cree_le      timestamptz NOT NULL DEFAULT now(),
  modifie_le   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

-- -----------------------------------------------------------------------------
-- Sessions & dialogue
-- -----------------------------------------------------------------------------

CREATE TABLE sessions (
  tenant_id    text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  id           text NOT NULL DEFAULT gen_random_uuid()::text,
  eleve_id     text NOT NULL,
  persona_id   text NOT NULL,
  debut        timestamptz NOT NULL DEFAULT now(),
  fin          timestamptz,
  cree_le      timestamptz NOT NULL DEFAULT now(),
  modifie_le   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, eleve_id)   REFERENCES eleves (tenant_id, id)   ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, persona_id) REFERENCES personas (tenant_id, id) ON DELETE RESTRICT
);

-- Tentative : porte le verdict (issu du Verifier, §1.1) — source de la maîtrise.
CREATE TABLE tentatives (
  tenant_id        text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  id               text NOT NULL DEFAULT gen_random_uuid()::text,
  eleve_id         text NOT NULL,
  objectif_id      text NOT NULL,
  template_id      text NOT NULL,
  type_evaluation  text NOT NULL CHECK (type_evaluation IN ('diagnostique','formative','sommative')),
  correct          boolean NOT NULL,
  erreur_type_id   text,
  horodatage       timestamptz NOT NULL DEFAULT now(),
  cree_le          timestamptz NOT NULL DEFAULT now(),
  modifie_le       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, eleve_id)    REFERENCES eleves (tenant_id, id)    ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, objectif_id) REFERENCES objectifs (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE dialogue_turns (
  tenant_id    text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  id           text NOT NULL DEFAULT gen_random_uuid()::text,
  session_id   text NOT NULL,
  locuteur     text NOT NULL CHECK (locuteur IN ('eleve','tuteur')),
  texte        text NOT NULL,    -- côté tuteur : déjà filtré (§1.6)
  coup         jsonb,            -- CoupTuteur (R7) le cas échéant
  horodatage   timestamptz NOT NULL DEFAULT now(),
  cree_le      timestamptz NOT NULL DEFAULT now(),
  modifie_le   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, session_id) REFERENCES sessions (tenant_id, id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- RAG (pgvector, Phase 2). `embedding` typé vector(N) une fois l'extension active.
-- -----------------------------------------------------------------------------

CREATE TABLE embeddings (
  tenant_id    text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  id           text NOT NULL DEFAULT gen_random_uuid()::text,
  objectif_id  text,
  texte        text NOT NULL,
  -- embedding  vector(768),   -- décommenter avec l'extension vector
  embedding    double precision[] NOT NULL DEFAULT '{}',
  cree_le      timestamptz NOT NULL DEFAULT now(),
  modifie_le   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, objectif_id) REFERENCES objectifs (tenant_id, id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Sécurité & télémétrie (R5, D13, §13)
-- -----------------------------------------------------------------------------

CREATE TABLE safety_alerts (
  tenant_id          text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  id                 text NOT NULL DEFAULT gen_random_uuid()::text,
  eleve_id           text NOT NULL,
  session_id         text NOT NULL,
  categorie          text NOT NULL,
  severite           text NOT NULL CHECK (severite IN ('info','attention','critique')),
  extrait            text NOT NULL,        -- minimisé (§9)
  escalade_requise   boolean NOT NULL DEFAULT false,
  cree_a             timestamptz NOT NULL DEFAULT now(),
  cree_le            timestamptz NOT NULL DEFAULT now(),
  modifie_le         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, eleve_id)   REFERENCES eleves (tenant_id, id)   ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, session_id) REFERENCES sessions (tenant_id, id) ON DELETE CASCADE
);

-- Journal d'événements (télémétrie complète J1).
CREATE TABLE events (
  tenant_id    text NOT NULL REFERENCES tenants ON DELETE CASCADE,
  id           bigint GENERATED ALWAYS AS IDENTITY,
  type         text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}',
  horodatage   timestamptz NOT NULL DEFAULT now(),
  cree_le      timestamptz NOT NULL DEFAULT now(),
  modifie_le   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

-- -----------------------------------------------------------------------------
-- Triggers modifie_le + Row-Level Security (D7) sur toutes les tables
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'tenants','users','eleves','referentiels','objectifs','prerequis',
    'exercice_templates','explications','erreurs_type','maitrise','personas',
    'sessions','tentatives','dialogue_turns','embeddings','safety_alerts','events'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- modifie_le auto
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_modifie BEFORE UPDATE ON %1$I
         FOR EACH ROW EXECUTE FUNCTION set_modifie_le()', t);
    -- RLS : isolation par tenant courant
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY p_%1$s_tenant ON %1$I
         USING (tenant_id = app_current_tenant())
         WITH CHECK (tenant_id = app_current_tenant())', t);
  END LOOP;
END
$$;

-- Index utiles (lectures fréquentes du moteur).
CREATE INDEX idx_maitrise_eleve        ON maitrise (tenant_id, eleve_id);
CREATE INDEX idx_tentatives_eleve_obj  ON tentatives (tenant_id, eleve_id, objectif_id);
CREATE INDEX idx_dialogue_session      ON dialogue_turns (tenant_id, session_id);
CREATE INDEX idx_events_type           ON events (tenant_id, type);
CREATE INDEX idx_alerts_eleve          ON safety_alerts (tenant_id, eleve_id);
