# Fonction Edge `tuteur` — Léa « lève la main »

Q&R libre ancrée au programme (physique cycle 4), avec filet de sécurité
(détresse → escalade adulte), anti-humiliation, anti-spoiler en exercice, et
commandes de dessin au tableau. **Provider configurable** (Anthropic ou OpenAI).

## Déploiement

```bash
# 1. Secrets (choisir le provider)
supabase secrets set LLM_PROVIDER=anthropic
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# ou
supabase secrets set LLM_PROVIDER=openai
supabase secrets set OPENAI_API_KEY=sk-...
# (optionnel) modèle explicite
supabase secrets set LLM_MODEL=claude-3-5-haiku-latest

# 2. Déployer
supabase functions deploy tuteur

# Accès public (pas de JWT) le plus simple pour le front statique :
supabase functions deploy tuteur --no-verify-jwt
```

L'URL est de la forme `https://<projet>.functions.supabase.co/tuteur`.

## Conformité mineurs (§1.7)

Pour un·e élève mineur·e, le provider doit être **conforme + no-train**. Les
API Anthropic et OpenAI **n'entraînent pas** sur les données transmises par API
par défaut — c'est le cas ici. En mode BYOK, s'assurer que la clé du tenant
pointe vers un provider conforme.

## Brancher le front

Le client lit l'URL (et une clé optionnelle) depuis, dans l'ordre :
1. `localStorage['lea.tuteur.url']` / `localStorage['lea.tuteur.key']`
2. `window.LEA_TUTEUR_URL` / `window.LEA_TUTEUR_KEY`
3. `<meta name="lea-tuteur-url" content="…">` dans `index.html`

Sans URL configurée, l'appli **ne casse pas** : « lève la main » bascule en
mode hors-ligne (aide déterministe qui renvoie au cours). Le déploiement est
donc optionnel pour tester le reste.

## Contrat

Requête `POST` JSON :
```json
{ "question": "…", "contexte": { "module": "…", "notion": "…", "relation": "U = R × I", "points_vus": ["…"], "en_exercice": false } }
```
Réponse :
```json
{ "reponse": "…", "tableau": [ {"type":"ellipse","x":160,"y":100,"rx":40,"ry":16} ], "dans_programme": true, "alerte": { "categorie":"detresse","severite":"critique","escalade_requise":true } }
```
Les commandes `tableau` utilisent le repère du schéma (320×200) et les
primitives de la couche croquis (`fleche`/`trait`/`cercle`/`ellipse`/`texte`).

## Points d'extension (non requis pour tourner)

- Journaliser `events` / `safety_alerts` (tables §5) — brancher le service-role.
- Ancrage RAG (pgvector, phase 2) — enrichir le `systeme()` avec les passages
  du cours les plus proches de la question.
