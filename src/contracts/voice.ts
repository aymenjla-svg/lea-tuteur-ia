/**
 * Voice — pipeline voix modulaire, interface temps-réel (D11/R4).
 *
 * R4 : budget latence premier son < ~1 s ; parole streamée, barge-in supporté
 * (l'élève peut interrompre l'avatar en parlant — la synthèse s'arrête).
 *
 * Pipeline modulaire (D11) : STT et TTS sont deux briques remplaçables (P3),
 * derrière une interface streaming commune. La voix elle-même est choisie par
 * la facette Apparence de la persona (voix_id).
 */

/* ------------------------------------------------------------------------- */
/* Synthèse (TTS) — streaming                                                  */
/* ------------------------------------------------------------------------- */

/** Fragment audio synthétisé, prêt à être joué. */
export interface FragmentAudio {
  readonly pcm: ArrayBuffer;
  readonly t_ms: number;
  /** Dernier fragment de l'énoncé courant. */
  readonly final: boolean;
}

/** Énoncé à synthétiser. */
export interface RequeteTTS {
  readonly texte: string;
  readonly voix_id: string;
}

/**
 * Synthèse vocale streaming. Le premier `FragmentAudio` doit arriver sous le
 * budget R4 (~1 s). `interrompre()` réalise le barge-in.
 */
export interface SyntheseVocale {
  synthetiser(requete: RequeteTTS): AsyncIterable<FragmentAudio>;
  /** Barge-in : stoppe immédiatement la synthèse en cours (R4). */
  interrompre(): void;
}

/* ------------------------------------------------------------------------- */
/* Reconnaissance (STT) — streaming                                           */
/* ------------------------------------------------------------------------- */

/** Hypothèse de transcription (partielle puis finale). */
export interface TranscriptionPartielle {
  readonly texte: string;
  readonly final: boolean;
  readonly confiance: number; // [0,1]
}

/**
 * Reconnaissance vocale streaming. Émet des hypothèses au fil de l'eau ;
 * le début de parole de l'élève déclenche le barge-in côté TTS.
 */
export interface ReconnaissanceVocale {
  transcrire(
    audio: AsyncIterable<ArrayBuffer>,
  ): AsyncIterable<TranscriptionPartielle>;
}

/** Pipeline voix complet (D11). Briques remplaçables (P3). */
export interface Voice {
  readonly tts: SyntheseVocale;
  readonly stt: ReconnaissanceVocale;
}
