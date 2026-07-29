-- =============================================================================
-- Migration pgvector — active la recherche sémantique du RAG (Phase 2, §RAG).
--
-- Appliquée et vérifiée en production sur le projet Supabase Léa le 2026-07-07 :
--   pgvector 0.8.0 · embeddings.embedding = vector(768) · index IVFFlat cosinus.
--
-- Avant cette migration, embeddings.embedding est un double precision[] (le
-- moteur tourne sans l'extension). Cette migration bascule la colonne vers le
-- vrai type vector(768) pour une recherche par similarité performante.
-- =============================================================================

-- 1. Extension pgvector.
create extension if not exists vector;

-- 2. Bascule de embeddings.embedding : double precision[] -> vector(768).
--    Les lignes vides/NULL deviennent un vecteur nul (768 zéros).
alter table embeddings
  alter column embedding drop default;

alter table embeddings
  alter column embedding type vector(768)
  using (
    case
      when embedding is null or array_length(embedding, 1) is null
        then array_fill(0::double precision, array[768])::vector
      else embedding::vector
    end
  );

alter table embeddings
  alter column embedding set default array_fill(0::double precision, array[768])::vector;

-- 3. Index de similarité cosinus (IVFFlat) pour la recherche k-NN du RAG.
create index if not exists embeddings_embedding_idx
  on embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);
