// Léa — voix. Deux pipelines de synthèse (TTS), transparents pour l'appli :
//  1) VOIX NEURALE (si configurée) : une fonction Edge renvoie un audio humain
//     (Google TTS gratuit / OpenAI…) qu'on joue → intonations naturelles.
//  2) Repli NAVIGATEUR (Web Speech) : toujours dispo, mais souvent monotone.
// STT (dictée) : SpeechRecognition. Barge-in : interrompre() coupe les deux.
// Dégradation propre : sans aucune de ces briques, l'écrit reste de plein droit.

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
const RecognitionCtor =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

let audioCourant = null; // <audio> neural en cours (pour le barge-in)

/** Config de la voix neurale : URL de la fonction Edge (+ clé anon éventuelle). */
function ttsConfig() {
  const meta = (n) => (typeof document !== 'undefined' ? document.querySelector(`meta[name="${n}"]`)?.content?.trim() : '') || '';
  let url = '';
  let key = '';
  try { url = localStorage.getItem('lea.tts.url') || ''; key = localStorage.getItem('lea.tts.key') || ''; } catch { /* indispo */ }
  url = url || (typeof window !== 'undefined' && window.LEA_TTS_URL) || meta('lea-tts-url');
  key = key || (typeof window !== 'undefined' && window.LEA_TTS_KEY) || meta('lea-tts-key');
  return { url, key };
}

export const voix = {
  get tts() {
    return !!synth || !!ttsConfig().url;
  },
  get stt() {
    return !!RecognitionCtor;
  },
  /** Vrai si une voix neurale est branchée (vs la voix du navigateur). */
  get neurale() {
    return !!ttsConfig().url;
  },

  /** Vrai pendant que Léa parle (lip-sync + barge-in), voix neurale OU navigateur. */
  enParole() {
    return (!!synth && synth.speaking) || (!!audioCourant && !audioCourant.paused);
  },

  /** Fait parler Léa. Utilise la voix neurale si configurée, sinon le navigateur. */
  parler(texte, opts = {}) {
    const { url } = ttsConfig();
    if (url) this._parlerNeural(String(texte ?? ''), opts, url);
    else this._parlerNavigateur(String(texte ?? ''), opts);
  },

  // Voix neurale : on demande l'audio à la fonction Edge et on le joue.
  _parlerNeural(texte, opts, url) {
    this.interrompre();
    if (!texte.trim()) { opts.onEnd?.(); return; }
    const { key } = ttsConfig();
    const headers = { 'content-type': 'application/json' };
    if (key) { headers.apikey = key; headers.authorization = `Bearer ${key}`; }
    fetch(url, { method: 'POST', headers, body: JSON.stringify({ texte, voix: opts.params?.voixNeurale }) })
      .then((r) => { if (!r.ok) throw new Error('tts ' + r.status); return r.blob(); })
      .then((blob) => {
        const src = URL.createObjectURL(blob);
        const a = new Audio(src);
        audioCourant = a;
        a.playbackRate = opts.params?.rate ?? 1;
        a.onplay = () => opts.onStart?.();
        a.onended = () => { URL.revokeObjectURL(src); if (audioCourant === a) audioCourant = null; opts.onEnd?.(); };
        a.onerror = () => { URL.revokeObjectURL(src); if (audioCourant === a) audioCourant = null; opts.onEnd?.(); };
        a.play().catch(() => { this._parlerNavigateur(texte, opts); }); // geste requis / bloqué → repli
      })
      .catch(() => { this._parlerNavigateur(texte, opts); }); // réseau/serveur KO → repli
  },

  // Voix du navigateur (Web Speech) — repli. Prosodie légèrement adoucie.
  _parlerNavigateur(texte, { params, onStart, onBoundary, onEnd } = {}) {
    if (!synth) { onEnd?.(); return; }
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(texte);
      u.lang = 'fr-FR';
      u.pitch = params?.pitch ?? 1.05;
      u.rate = params?.rate ?? 0.98;
      const vfr = choisirVoix(params?.sexe);
      if (vfr) u.voice = vfr;
      if (onStart) u.onstart = onStart;
      if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
      if (onBoundary) u.onboundary = onBoundary;
      synth.speak(u);
    } catch {
      onEnd?.();
    }
  },

  /** Barge-in : stoppe immédiatement la parole (neurale ET navigateur). */
  interrompre() {
    if (synth) { try { synth.cancel(); } catch { /* no-op */ } }
    if (audioCourant) { try { audioCourant.pause(); audioCourant.currentTime = 0; } catch { /* no-op */ } audioCourant = null; }
  },

  /**
   * Écoute une réponse au micro. Émet des transcriptions partielles puis
   * finales. Renvoie un handle `{ stop() }`. STT indisponible → renvoie null.
   */
  ecouter({ onPartial, onFinal, onStart, onEnd, onErreur } = {}) {
    if (!RecognitionCtor) return null;
    const reco = new RecognitionCtor();
    reco.lang = 'fr-FR';
    reco.interimResults = true;
    reco.continuous = false;
    reco.maxAlternatives = 1;

    reco.onstart = () => onStart?.();
    reco.onerror = (e) => onErreur?.(e?.error ?? 'erreur');
    reco.onend = () => onEnd?.();
    reco.onresult = (e) => {
      let partiel = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onFinal?.(r[0].transcript.trim());
        else partiel += r[0].transcript;
      }
      if (partiel) onPartial?.(partiel.trim());
    };

    try { reco.start(); } catch { return null; }
    return { stop() { try { reco.stop(); } catch { /* no-op */ } } };
  },
};

// Prénoms/marqueurs de voix FR connus, par sexe (Apple, Microsoft, Google…).
const VOIX_FEMME = /amélie|aurélie|marie|virginie|audrey|julie|chloé|céline|denise|hortense|léa|manon|jolie|elise|sabine|charlotte/i;
const VOIX_HOMME = /thomas|henri|nicolas|daniel|paul|guillaume|mathieu|yannick|jacques|claude|antoine|jean|louis/i;
// Marqueurs de qualité (voix « neurales »/améliorées quand elles existent).
const QUALITE = /neural|enhanced|premium|natural|siri|google|wavenet/i;

/**
 * Choisit la meilleure voix FR du navigateur pour un sexe ('f' | 'h'). Score =
 * qualité (neural/enhanced…) + correspondance de genre. À défaut, une voix FR.
 * getVoices() se remplit de façon asynchrone : on relit à chaque appel.
 */
function choisirVoix(sexe) {
  if (!synth) return null;
  const toutes = synth.getVoices?.() ?? [];
  const fr = toutes.filter((v) => /^fr(-|_)?/i.test(v.lang) || /fr/i.test(v.lang));
  if (!fr.length) return null;

  const genre = sexe === 'h' ? VOIX_HOMME : sexe === 'f' ? VOIX_FEMME : null;
  const autreGenre = sexe === 'h' ? VOIX_FEMME : sexe === 'f' ? VOIX_HOMME : null;

  const score = (v) => {
    let s = 0;
    if (/fr-FR/i.test(v.lang)) s += 2;
    if (QUALITE.test(v.name)) s += 4;
    if (genre && genre.test(v.name)) s += 6;
    else if (autreGenre && autreGenre.test(v.name)) s -= 5; // évite le mauvais genre
    return s;
  };
  return [...fr].sort((a, b) => score(b) - score(a))[0] ?? null;
}
