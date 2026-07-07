// Léa — voix (Addendum A2 MVP). Pipeline navigateur via la Web Speech API :
//  - TTS  : SpeechSynthesis (Léa parle ses réponses, voix FR).
//  - STT  : SpeechRecognition (l'élève répond au micro, transcription partielle).
//  - Barge-in : interrompre() coupe la synthèse dès que l'élève prend la parole.
//
// Tout est détecté à l'exécution : sur un navigateur sans ces API, on dégrade
// proprement (l'écrit reste de plein droit, P1). Aucune donnée ne sort de
// l'appareil au-delà de ce que le navigateur envoie à son service de dictée.

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
const RecognitionCtor =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const voix = {
  get tts() {
    return !!synth;
  },
  get stt() {
    return !!RecognitionCtor;
  },

  /** Vrai pendant que Léa parle (pour le lip-sync et le barge-in). */
  enParole() {
    return !!synth && synth.speaking;
  },

  /**
   * Fait parler Léa. Coupe toute parole en cours d'abord. `params` module le
   * timbre selon le prof (pitch/rate). Les callbacks pilotent le lip-sync.
   */
  parler(texte, { params, onStart, onBoundary, onEnd } = {}) {
    if (!synth) return;
    try {
      synth.cancel(); // repart propre (évite l'empilement)
      const u = new SpeechSynthesisUtterance(texte);
      u.lang = 'fr-FR';
      u.pitch = params?.pitch ?? 1;
      u.rate = params?.rate ?? 1;
      const vfr = choisirVoix(params?.sexe);
      if (vfr) u.voice = vfr;
      if (onStart) u.onstart = onStart;
      if (onEnd) {
        u.onend = onEnd;
        u.onerror = onEnd;
      }
      if (onBoundary) u.onboundary = onBoundary;
      synth.speak(u);
    } catch {
      /* API capricieuse selon navigateur : on ignore, l'écrit prend le relais. */
    }
  },

  /** Barge-in : stoppe immédiatement la synthèse en cours (R4). */
  interrompre() {
    if (synth) {
      try {
        synth.cancel();
      } catch {
        /* no-op */
      }
    }
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
        if (r.isFinal) {
          onFinal?.(r[0].transcript.trim());
        } else {
          partiel += r[0].transcript;
        }
      }
      if (partiel) onPartial?.(partiel.trim());
    };

    try {
      reco.start();
    } catch {
      return null;
    }
    return {
      stop() {
        try {
          reco.stop();
        } catch {
          /* no-op */
        }
      },
    };
  },
};

// Prénoms/marqueurs de voix FR connus, par sexe (Apple, Microsoft, Google…).
const VOIX_FEMME = /amélie|aurélie|marie|virginie|audrey|julie|chloé|céline|denise|hortense|léa|manon|jolie|elise|sabine|charlotte/i;
const VOIX_HOMME = /thomas|henri|nicolas|daniel|paul|guillaume|mathieu|yannick|jacques|claude|antoine|jean|louis/i;
// Marqueurs de qualité (voix « neurales »/améliorées quand elles existent).
const QUALITE = /neural|enhanced|premium|natural|siri|google|wavenet/i;

/**
 * Choisit la meilleure voix FR pour un sexe ('f' | 'h'). Score = qualité
 * (neural/enhanced…) + correspondance de genre. À défaut, une voix FR quelconque.
 * La liste `getVoices()` se remplit de façon asynchrone : on relit à chaque appel.
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
