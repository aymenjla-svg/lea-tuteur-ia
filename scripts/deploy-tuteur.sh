#!/usr/bin/env bash
# =============================================================================
# Déploiement en 1 commande de la fonction Edge « tuteur » (phase LLM).
#
# Pré-requis : Supabase CLI installé + connecté à ton projet
#   (`supabase login` puis `supabase link --project-ref <ref>`).
#
# Usage (provider Anthropic) :
#   LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-... ./scripts/deploy-tuteur.sh
# Usage (provider OpenAI) :
#   LLM_PROVIDER=openai OPENAI_API_KEY=sk-... ./scripts/deploy-tuteur.sh
#
# Après le déploiement, l'URL affichée est à coller dans l'appli :
#   ♿ (en haut) → « Tuteur IA » → colle l'URL → « Connecter ».
# =============================================================================
set -euo pipefail

command -v supabase >/dev/null || { echo "❌ Supabase CLI introuvable. Installe-le : https://supabase.com/docs/guides/cli"; exit 1; }

PROVIDER="${LLM_PROVIDER:-anthropic}"
echo "→ Provider LLM : $PROVIDER"

supabase secrets set "LLM_PROVIDER=$PROVIDER" >/dev/null
if [ "$PROVIDER" = "openai" ]; then
  : "${OPENAI_API_KEY:?Définis OPENAI_API_KEY}"
  supabase secrets set "OPENAI_API_KEY=$OPENAI_API_KEY" >/dev/null
else
  : "${ANTHROPIC_API_KEY:?Définis ANTHROPIC_API_KEY}"
  supabase secrets set "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" >/dev/null
fi
[ -n "${LLM_MODEL:-}" ] && supabase secrets set "LLM_MODEL=$LLM_MODEL" >/dev/null || true

echo "→ Déploiement (accès public, sans JWT)…"
supabase functions deploy tuteur --no-verify-jwt

REF="$(supabase status 2>/dev/null | grep -oiE 'https://[a-z0-9]+\.supabase\.co' | head -1 || true)"
echo
echo "✅ Fonction « tuteur » déployée."
if [ -n "$REF" ]; then
  echo "   URL à coller dans l'appli :  ${REF/https:\/\//https://}/functions/v1/tuteur"
  echo "   (ou la forme :  https://<projet>.functions.supabase.co/tuteur )"
else
  echo "   URL : https://<projet>.functions.supabase.co/tuteur"
fi
echo "   Dans Léa : ♿ → « Tuteur IA » → colle l'URL → « Connecter »."
