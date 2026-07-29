# Fonction Edge `voix` — voix neurale de Léa (TTS humain)

Renvoie un MP3 à partir d'un texte. L'appli le joue à la place de la voix
robotique du navigateur → intonations naturelles. Provider **configurable**.

## Option GRATUITE par défaut : Google Translate TTS (sans carte, sans clé)

Fiable côté serveur, voix française correcte (plus naturelle que le navigateur).
**Aucun secret requis** — c'est le défaut.

```bash
supabase functions deploy voix --no-verify-jwt   # rien d'autre à faire
```

Pour une voix VRAIMENT humaine, voir « OpenAI » ci-dessous (payant mais très
peu cher). L'option `edge` (voix neurales Microsoft) existe mais est souvent
bloquée côté serveur (repli auto sur Google Translate) :
`supabase secrets set TTS_PROVIDER=edge`.

## Option payante : Google Cloud TTS (WaveNet) — nécessite une carte

Palier « gratuit » ≈ 1 M car./mois **mais facturation à activer (carte)**.
```bash
supabase secrets set TTS_PROVIDER=google GOOGLE_TTS_KEY=AIza... TTS_VOICE=fr-FR-Wavenet-C
supabase functions deploy voix --no-verify-jwt
```

## Option premium : OpenAI (très naturel, payant à l'usage)

```bash
supabase secrets set TTS_PROVIDER=openai
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set TTS_VOICE=shimmer        # nova, shimmer, alloy…
supabase secrets set TTS_MODEL=gpt-4o-mini-tts
supabase functions deploy voix --no-verify-jwt
```

## Brancher l'appli

L'URL est `https://<projet>.supabase.co/functions/v1/voix`. Renseigne-la dans
`web/config.js` (partagée pour tous les testeurs) :
```js
window.LEA_TTS_URL = 'https://<projet>.supabase.co/functions/v1/voix';
window.LEA_TTS_KEY = ''; // clé anon si « Verify JWT » activé, sinon vide
```
Sans URL, l'appli garde la voix du navigateur (repli automatique). En cas
d'erreur réseau/serveur, elle retombe aussi sur la voix du navigateur.

## Contrat
`POST` JSON `{ "texte": "…", "voix": "fr-FR-Wavenet-C" }` → corps `audio/mpeg`.
Le texte est borné à 800 caractères (coût + latence). Réponses mises en cache
24 h côté client.
