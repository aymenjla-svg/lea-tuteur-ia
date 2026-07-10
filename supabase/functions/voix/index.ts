// =============================================================================
// Léa — fonction Edge « voix » : synthèse vocale NEURALE (voix humaine).
//
// Reçoit { texte, voix? } et renvoie un audio MP3. Provider CONFIGURABLE :
//   TTS_PROVIDER =
//     'edge' (DÉFAUT) : voix neurales Microsoft Edge — GRATUIT, sans carte,
//                       sans clé. Repli auto sur StreamElements si indispo.
//                       Voix : TTS_VOICE (défaut fr-FR-DeniseNeural).
//     'streamelements': voix Amazon Polly via StreamElements — GRATUIT, sans
//                       clé. Voix : TTS_VOICE (défaut Celine).
//     'google'        : Google Cloud TTS (WaveNet). Secret GOOGLE_TTS_KEY.
//     'openai'        : OpenAI Audio Speech. Secret OPENAI_API_KEY.
//
// Déploiement : voir supabase/functions/voix/README.md
// =============================================================================

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

// --- Microsoft Edge neural (gratuit) -----------------------------------------
const TRUSTED = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WSS = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const GEC_VERSION = '1-131.0.2903.99';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Jeton anti-abus Sec-MS-GEC : SHA-256(ticks arrondis 5 min + token), en HEX maj.
async function secMsGec(): Promise<string> {
  const ticks = (BigInt(Math.floor(Date.now() / 1000) + 11644473600)) * 10000000n;
  const rounded = ticks - (ticks % 3000000000n);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rounded.toString() + TRUSTED));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function ttsEdge(texte: string, voixNom: string): Promise<Uint8Array> {
  const gec = await secMsGec();
  const voice = voixNom || 'fr-FR-DeniseNeural';
  const url = `${WSS}?TrustedClientToken=${TRUSTED}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${GEC_VERSION}&ConnectionId=${crypto.randomUUID().replace(/-/g, '')}`;
  return await new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    const chunks: Uint8Array[] = [];
    let settled = false;
    const rassembler = () => {
      let len = 0; for (const c of chunks) len += c.length;
      const out = new Uint8Array(len); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
      return out;
    };
    const fin = (fn: (v: any) => void, arg: any) => { if (settled) return; settled = true; clearTimeout(t); try { ws.close(); } catch { /* */ } fn(arg); };
    const t = setTimeout(() => fin(reject, new Error('edge timeout')), 12000);
    ws.onopen = () => {
      ws.send(`X-Timestamp:${new Date().toString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`);
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='fr-FR'><voice name='${voice}'>${escapeXml(texte)}</voice></speak>`;
      ws.send(`X-RequestId:${crypto.randomUUID().replace(/-/g, '')}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toString()}\r\nPath:ssml\r\n\r\n${ssml}`);
    };
    ws.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data === 'string') {
        if (ev.data.includes('Path:turn.end')) fin(resolve, rassembler());
      } else {
        const buf = new Uint8Array(ev.data as ArrayBuffer);
        const headerLen = (buf[0] << 8) | buf[1];
        const audio = buf.subarray(2 + headerLen);
        if (audio.length) chunks.push(audio);
      }
    };
    ws.onerror = () => fin(reject, new Error('edge ws error'));
    ws.onclose = () => { if (!settled) { chunks.length ? fin(resolve, rassembler()) : fin(reject, new Error('edge closed')); } };
  });
}

// --- StreamElements (Amazon Polly, gratuit) — filet de secours ---------------
async function ttsStream(texte: string, voixNom: string): Promise<Uint8Array> {
  const v = voixNom || 'Celine';
  const r = await fetch(`https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(v)}&text=${encodeURIComponent(texte)}`);
  if (!r.ok) throw new Error(`streamelements ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

// --- Handler -----------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('non', { status: 405, headers: CORS });

  let texte = '';
  let voixDemandee = '';
  try {
    const b = await req.json();
    texte = String(b.texte ?? '').slice(0, 800);
    voixDemandee = String(b.voix ?? '');
  } catch { return new Response('requête invalide', { status: 400, headers: CORS }); }
  if (!texte.trim()) return new Response('texte vide', { status: 400, headers: CORS });

  const provider = (Deno.env.get('TTS_PROVIDER') ?? 'edge').toLowerCase();
  const voixEnv = Deno.env.get('TTS_VOICE') ?? '';
  try {
    let audio: Uint8Array;
    if (provider === 'openai') {
      const key = Deno.env.get('OPENAI_API_KEY');
      if (!key) throw new Error('OPENAI_API_KEY manquant');
      const r = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: Deno.env.get('TTS_MODEL') ?? 'gpt-4o-mini-tts', voice: voixDemandee || voixEnv || 'shimmer', input: texte, response_format: 'mp3' }),
      });
      if (!r.ok) throw new Error(`OpenAI TTS ${r.status}`);
      audio = new Uint8Array(await r.arrayBuffer());
    } else if (provider === 'google') {
      const key = Deno.env.get('GOOGLE_TTS_KEY');
      if (!key) throw new Error('GOOGLE_TTS_KEY manquant');
      const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: { text: texte }, voice: { languageCode: 'fr-FR', name: voixDemandee || voixEnv || 'fr-FR-Wavenet-C' }, audioConfig: { audioEncoding: 'MP3' } }),
      });
      if (!r.ok) throw new Error(`Google TTS ${r.status}`);
      const j = await r.json();
      audio = Uint8Array.from(atob(j.audioContent), (c) => c.charCodeAt(0));
    } else if (provider === 'streamelements') {
      audio = await ttsStream(texte, voixDemandee || voixEnv);
    } else {
      // 'edge' (défaut) : neural gratuit, repli StreamElements si indispo.
      try { audio = await ttsEdge(texte, voixDemandee || voixEnv); }
      catch { audio = await ttsStream(texte, voixEnv && !voixEnv.includes('Neural') ? voixEnv : 'Celine'); }
    }
    return new Response(audio, { headers: { ...CORS, 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=86400' } });
  } catch (e) {
    return new Response('tts indisponible : ' + String((e as Error).message), { status: 502, headers: CORS });
  }
});
