#!/usr/bin/env bash
# =============================================================================
# Déploiement en 1 commande de la fonction Edge « tuteur » (phase LLM).
#
# Pré-requis : Supabase CLI installé + connecté à ton projet
#   supabase login
#   supabase link --project-ref <ref>
#
# --- Version simple (juste le LLM) -------------------------------------------
#   LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-... ./scripts/deploy-tuteur.sh
#
# --- Fournisseur GRATUIT compatible OpenAI (ex. Groq) ------------------------
#   LLM_PROVIDER=openai \
#   LLM_BASE_URL=https://api.groq.com/openai/v1 \
#   LLM_API_KEY=gsk_... \
#   LLM_MODEL=llama-3.3-70b-versatile \
#   ./scripts/deploy-tuteur.sh
#
# --- Version complète (--full : + RAG + journal) -----------------------------
#   Nécessite en plus l'accès base + une clé OpenAI pour les embeddings :
#   LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-... \
#   OPENAI_API_KEY=sk-... \
#   SUPABASE_URL=https://<ref>.supabase.co \
#   SUPABASE_SERVICE_ROLE_KEY=... \
#   ./scripts/deploy-tuteur.sh --full
#
# (Récupère URL + service_role dans Dashboard → Settings → API.)
#
# Après déploiement : colle l'URL affichée dans l'appli
#   ♿ (en haut) → « Tuteur IA » → colle l'URL → « Connecter ».
# =============================================================================
set -euo pipefail

command -v supabase >/dev/null || { echo "❌ Supabase CLI introuvable : https://supabase.com/docs/guides/cli"; exit 1; }

FULL=0
[ "${1:-}" = "--full" ] && FULL=1

PROVIDER="${LLM_PROVIDER:-anthropic}"
TENANT="${TENANT_ID:-demo}"
echo "→ Provider LLM : $PROVIDER   (mode complet : $([ $FULL = 1 ] && echo oui || echo non))"

# --- Secrets du provider de chat ---------------------------------------------
supabase secrets set "LLM_PROVIDER=$PROVIDER" >/dev/null
if [ "$PROVIDER" = "openai" ]; then
  # Compatible OpenAI : OpenAI par défaut, ou Groq/Mistral/… via LLM_BASE_URL.
  KEY="${LLM_API_KEY:-${OPENAI_API_KEY:-}}"
  [ -n "$KEY" ] || { echo "❌ Définis LLM_API_KEY (ou OPENAI_API_KEY)"; exit 1; }
  supabase secrets set "LLM_API_KEY=$KEY" >/dev/null
  [ -n "${LLM_BASE_URL:-}" ] && supabase secrets set "LLM_BASE_URL=$LLM_BASE_URL" >/dev/null || true
else
  : "${ANTHROPIC_API_KEY:?Définis ANTHROPIC_API_KEY}"
  supabase secrets set "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" >/dev/null
fi
[ -n "${LLM_MODEL:-}" ] && supabase secrets set "LLM_MODEL=$LLM_MODEL" >/dev/null || true

# --- Mode complet : migrations + RAG + journal -------------------------------
if [ $FULL = 1 ]; then
  : "${SUPABASE_URL:?Définis SUPABASE_URL}"
  : "${SUPABASE_SERVICE_ROLE_KEY:?Définis SUPABASE_SERVICE_ROLE_KEY}"
  : "${OPENAI_API_KEY:?Définis OPENAI_API_KEY (embeddings RAG)}"

  echo "→ Application des migrations (pgvector + match_embeddings)…"
  supabase db push

  echo "→ Indexation du contenu des cours (embeddings)…"
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  TENANT_ID="$TENANT" \
  node scripts/indexer-cours.mjs

  echo "→ Activation RAG + journal (secrets fonction)…"
  supabase secrets set "RAG_ENABLED=1" "LOG_ENABLED=1" \
    "SUPABASE_URL=$SUPABASE_URL" \
    "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY" \
    "OPENAI_API_KEY=$OPENAI_API_KEY" \
    "TENANT_ID=$TENANT" >/dev/null
fi

echo "→ Déploiement (accès public, sans JWT)…"
supabase functions deploy tuteur --no-verify-jwt

echo
echo "✅ Fonction « tuteur » déployée$([ $FULL = 1 ] && echo ' (RAG + journal actifs)')."
echo "   URL à coller dans l'appli :  https://<projet>.supabase.co/functions/v1/tuteur"
echo "   Dans Léa : ♿ → « Tuteur IA » → colle l'URL → « Connecter »."
