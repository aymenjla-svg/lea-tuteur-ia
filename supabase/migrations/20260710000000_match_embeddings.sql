-- =============================================================================
-- Recherche sémantique du RAG (phase LLM) : fonction kNN sur pgvector.
--
-- Prérequis : migration 20260707000000_lea_pgvector (embedding = vector(768) +
-- index IVFFlat cosinus). Cette fonction renvoie les passages du cours les plus
-- proches d'une question, pour ancrer la réponse du tuteur sur la source de
-- vérité. Appelée par la fonction Edge `tuteur` via PostgREST (rpc), sous clé
-- service-role (contourne RLS ; le tenant est filtré explicitement).
-- =============================================================================

create or replace function match_embeddings(
  query_embedding vector(768),
  match_count int default 4,
  p_tenant text default null
) returns table (id text, objectif_id text, texte text, similarite float)
language sql stable as $$
  select e.id, e.objectif_id, e.texte,
         1 - (e.embedding <=> query_embedding) as similarite
  from embeddings e
  where (p_tenant is null or e.tenant_id = p_tenant)
    and e.embedding is not null
  order by e.embedding <=> query_embedding
  limit greatest(1, least(match_count, 12));
$$;

comment on function match_embeddings is
  'RAG Léa : k plus proches passages du cours (cosinus) pour ancrer le tuteur.';
