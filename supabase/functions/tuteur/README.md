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

## Tout activer en une commande

Le plus simple (LLM + RAG + journal) :

```bash
supabase login && supabase link --project-ref <ref>
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-... \
OPENAI_API_KEY=sk-... \
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=... \
./scripts/deploy-tuteur.sh --full
```

Puis colle l'URL affichée dans l'appli (♿ → « Tuteur IA » → Connecter). Le
détail manuel de chaque brique est ci-dessous.

## Ancrage RAG (optionnel, pgvector)

Pour ancrer les réponses sur le texte exact du cours (au-delà des `points_vus`
envoyés par le client), on active la recherche sémantique.

1. Appliquer les migrations (dont `..._match_embeddings.sql`) :
   ```bash
   supabase db push
   ```
2. Indexer le contenu des cours (à relancer quand `web/cours.js` change) :
   ```bash
   SUPABASE_URL=https://<projet>.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=... OPENAI_API_KEY=sk-... TENANT_ID=<tenant> \
   node scripts/indexer-cours.mjs
   ```
3. Activer le RAG côté fonction Edge :
   ```bash
   supabase secrets set RAG_ENABLED=1
   supabase secrets set SUPABASE_URL=https://<projet>.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
   supabase secrets set OPENAI_API_KEY=sk-...   # embeddings (768-d)
   supabase secrets set TENANT_ID=<tenant>       # optionnel (filtre)
   ```

Les embeddings utilisent OpenAI `text-embedding-3-small` en **768 dimensions**
(pour matcher `vector(768)`), indépendamment du provider de chat. Si le RAG
n'est pas activé, la fonction retombe sur l'ancrage `points_vus` du client.

## Journal & sécurité (optionnel)

Télémétrie J1 (§13) : chaque Q&R et chaque alerte de détresse peut être tracée.

```bash
supabase secrets set LOG_ENABLED=1
supabase secrets set SUPABASE_URL=https://<projet>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set TENANT_ID=<tenant>
# Écrire AUSSI dans la table dédiée safety_alerts (nécessite des identités
# réelles : lignes eleves + sessions existantes, FK). Sinon l'alerte reste
# dans events, ce qui suffit à la télémétrie.
supabase secrets set LOG_SAFETY_FK=1
```

- `events` (fiable, tenant seul) : `tuteur_qr` (métadonnées SANS le texte de
  l'élève : module, en_exercice, dans_programme, longueur) et `safety_alert`
  (catégorie, sévérité, extrait minimisé ≤120 car., §9).
- `safety_alerts` (table dédiée) : écrite seulement si `LOG_SAFETY_FK=1` et si
  le client fournit `session_id` + `eleve_ref` correspondant à des lignes
  existantes. Le front envoie déjà une identité **pseudonyme** (aucune donnée
  personnelle) ; le câblage aux vrais comptes viendra avec l'authentification.

Sans ces secrets, aucune écriture : le tuteur fonctionne à l'identique.
