// =============================================================================
// Léa — fonction Edge « voix » : synthèse vocale plus humaine que le navigateur.
//
// Reçoit { texte, voix? } et renvoie un audio MP3. Provider CONFIGURABLE :
//   TTS_PROVIDER =
//     'gtrad' (DÉFAUT) : Google Translate TTS — GRATUIT, sans carte, sans clé,
//                        fiable côté serveur. Voix FR unique, correcte.
//     'openai'        : OpenAI Audio Speech — TRÈS humain (payant à l'usage).
//                        Secret OPENAI_API_KEY ; voix TTS_VOICE (défaut shimmer).
//     'google'        : Google Cloud TTS WaveNet (carte requise). GOOGLE_TTS_KEY.
//     'edge'          : voix neurales Microsoft (souvent bloquées côté serveur) ;
//                        repli automatique sur 'gtrad'.
//
// Déploiement : voir supabase/functions/voix/README.md
// =============================================================================

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

// --- Google Translate TTS (gratuit, sans clé) — fiable -----------------------
// Découpe en morceaux ≤ 190 caractères (limite du service), puis concatène.
function couper(t: string, max = 190): string[] {
  const out: string[] = [];
  let reste = t.replace(/\s+/g, ' ').trim();
  while (reste.length > max) {
    let i = reste.lastIndexOf(' ', max);
    if (i < max * 0.5) i = max;
    out.push(reste.slice(0, i));
    reste = reste.slice(i).trim();
  }
  if (reste) out.push(reste);
  return out;
}
async function ttsGoogleTrad(texte: string): Promise<Uint8Array> {
  const parts = couper(texte);
  const bufs: Uint8Array[] = [];
  for (let i = 0; i < parts.length; i++) {
    const u = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=fr&total=${parts.length}&idx=${i}&textlen=${parts[i].length}&q=${encodeURIComponent(parts[i])}`;
    const r = await fetch(u, { headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'referer': 'https://translate.google.com/',
    } });
    if (!r.ok) throw new Error(`gtrad ${r.status}`);
    bufs.push(new Uint8Array(await r.arrayBuffer()));
  }
  let len = 0; for (const b of bufs) len += b.length;
  const out = new Uint8Array(len); let o = 0; for (const b of bufs) { out.set(b, o); o += b.length; }
  return out;
}

// --- Microsoft Edge neural (souvent bloqué côté serveur : en option) ---------
const TRUSTED = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WSS = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const GEC_VERSION = '1-131.0.2903.99';
const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
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
    const join = () => { let l = 0; for (const c of chunks) l += c.length; const o = new Uint8Array(l); let p = 0; for (const c of chunks) { o.set(c, p); p += c.length; } return o; };
    const fin = (fn: (v: any) => void, arg: any) => { if (settled) return; settled = true; clearTimeout(t); try { ws.close(); } catch { /* */ } fn(arg); };
    const t = setTimeout(() => fin(reject, new Error('edge timeout')), 4500);
    ws.onopen = () => {
      ws.send(`X-Timestamp:${new Date().toString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`);
      ws.send(`X-RequestId:${crypto.randomUUID().replace(/-/g, '')}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toString()}\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='fr-FR'><voice name='${voice}'>${xml(texte)}</voice></speak>`);
    };
    ws.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data === 'string') { if (ev.data.includes('Path:turn.end')) fin(resolve, join()); }
      else { const b = new Uint8Array(ev.data as ArrayBuffer); const h = (b[0] << 8) | b[1]; const a = b.subarray(2 + h); if (a.length) chunks.push(a); }
    };
    ws.onerror = () => fin(reject, new Error('edge ws error'));
    ws.onclose = () => { if (!settled) chunks.length ? fin(resolve, join()) : fin(reject, new Error('edge closed')); };
  });
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

  const provider = (Deno.env.get('TTS_PROVIDER') ?? 'gtrad').toLowerCase();
  const voixEnv = Deno.env.get('TTS_VOICE') ?? '';
  try {
    let audio: Uint8Array;
    if (provider === 'openai') {
      const key = Deno.env.get('OPENAI_API_KEY');
      if (!key) throw new Error('OPENAI_API_KEY manquant');
      const r = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
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
    } else if (provider === 'edge') {
      try { audio = await ttsEdge(texte, voixDemandee || voixEnv); }
      catch { audio = await ttsGoogleTrad(texte); }
    } else {
      audio = await ttsGoogleTrad(texte); // 'gtrad' (défaut)
    }
    return new Response(audio, { headers: { ...CORS, 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=86400' } });
  } catch (e) {
    return new Response('tts indisponible : ' + String((e as Error).message), { status: 502, headers: CORS });
  }
});
