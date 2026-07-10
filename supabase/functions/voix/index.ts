// =============================================================================
// Léa — fonction Edge « voix » : synthèse vocale NEURALE (voix humaine).
//
// Reçoit { texte, voix? } et renvoie un audio MP3. Provider CONFIGURABLE :
//   TTS_PROVIDER = 'google' (défaut) | 'openai'
//   - google : Google Cloud Text-to-Speech (WaveNet FR, palier gratuit ~1M
//              caractères/mois). Secret : GOOGLE_TTS_KEY. Voix : TTS_VOICE
//              (défaut fr-FR-Wavenet-C, féminine).
//   - openai : OpenAI Audio Speech (très naturel). Secret : OPENAI_API_KEY.
//              Modèle : TTS_MODEL (défaut gpt-4o-mini-tts) ; voix : TTS_VOICE
//              (défaut « shimmer »).
//
// Déploiement : voir supabase/functions/voix/README.md
// =============================================================================

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('non', { status: 405, headers: CORS });

  let texte = '';
  let voixDemandee = '';
  try {
    const b = await req.json();
    texte = String(b.texte ?? '').slice(0, 800); // borne (coût + latence)
    voixDemandee = String(b.voix ?? '');
  } catch {
    return new Response('requête invalide', { status: 400, headers: CORS });
  }
  if (!texte.trim()) return new Response('texte vide', { status: 400, headers: CORS });

  const provider = (Deno.env.get('TTS_PROVIDER') ?? 'google').toLowerCase();
  try {
    let audio: Uint8Array;
    if (provider === 'openai') {
      const key = Deno.env.get('OPENAI_API_KEY');
      if (!key) throw new Error('OPENAI_API_KEY manquant');
      const r = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: Deno.env.get('TTS_MODEL') ?? 'gpt-4o-mini-tts',
          voice: voixDemandee || Deno.env.get('TTS_VOICE') || 'shimmer',
          input: texte,
          response_format: 'mp3',
        }),
      });
      if (!r.ok) throw new Error(`OpenAI TTS ${r.status}: ${await r.text()}`);
      audio = new Uint8Array(await r.arrayBuffer());
    } else {
      // Google Cloud TTS (palier gratuit). WaveNet FR par défaut.
      const key = Deno.env.get('GOOGLE_TTS_KEY');
      if (!key) throw new Error('GOOGLE_TTS_KEY manquant');
      const nom = voixDemandee || Deno.env.get('TTS_VOICE') || 'fr-FR-Wavenet-C';
      const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          input: { text: texte },
          voice: { languageCode: 'fr-FR', name: nom },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: 0.0 },
        }),
      });
      if (!r.ok) throw new Error(`Google TTS ${r.status}: ${await r.text()}`);
      const j = await r.json();
      const bin = atob(j.audioContent);
      audio = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    }
    return new Response(audio, { headers: { ...CORS, 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=86400' } });
  } catch (e) {
    return new Response('tts indisponible : ' + String((e as Error).message), { status: 502, headers: CORS });
  }
});
