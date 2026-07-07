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
      const vfr = choisirVoixFr();
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

// Choix d'une voix française parmi celles du navigateur (chargées de façon
// asynchrone ; on relit à chaque appel car la liste peut arriver tard).
function choisirVoixFr() {
  if (!synth) return null;
  const voix = synth.getVoices?.() ?? [];
  return (
    voix.find((v) => /fr-FR/i.test(v.lang) && /google|amélie|thomas|virginie/i.test(v.name)) ||
    voix.find((v) => /^fr(-|_)/i.test(v.lang)) ||
    voix.find((v) => /fr/i.test(v.lang)) ||
    null
  );
}
