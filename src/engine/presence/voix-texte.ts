/**
 * Voix « texte » et attention désactivée — paliers sobres (R6, §8).
 *
 * `VoixTexte` implémente le contrat `Voice` sans audio : la synthèse n'émet
 * rien (le texte est affiché), la reconnaissance fait passer le texte tel quel.
 * Un vrai pipeline streaming (TTS/STT + barge-in, D11/R4) se substitue derrière
 * le même contrat (P3).
 *
 * `AttentionDesactivee` matérialise le choix « désactivable » (§8/D12) : aucune
 * caméra, aucun signal — le moteur fonctionne identiquement (R6).
 */

import type {
  AttentionSource,
  FragmentAudio,
  ReconnaissanceVocale,
  RequeteTTS,
  SignalAttention,
  SyntheseVocale,
  TranscriptionPartielle,
  TypeSourceAttention,
  Voice,
} from '../../contracts/index.js';

class SyntheseTexte implements SyntheseVocale {
  // eslint-disable-next-line require-yield
  async *synthetiser(_requete: RequeteTTS): AsyncIterable<FragmentAudio> {
    /* mode texte : aucun fragment audio émis. */
  }
  interrompre(): void {
    /* rien à interrompre. */
  }
}

class ReconnaissanceTexte implements ReconnaissanceVocale {
  async *transcrire(
    _audio: AsyncIterable<ArrayBuffer>,
  ): AsyncIterable<TranscriptionPartielle> {
    /* mode texte : pas d'entrée audio à transcrire. */
  }
}

export class VoixTexte implements Voice {
  readonly tts: SyntheseVocale = new SyntheseTexte();
  readonly stt: ReconnaissanceVocale = new ReconnaissanceTexte();
}

export class AttentionDesactivee implements AttentionSource {
  readonly type: TypeSourceAttention = 'desactive';
  estActive(): boolean {
    return false;
  }
  async *signaux(): AsyncIterable<SignalAttention> {
    /* désactivée : aucun signal (et surtout aucune vidéo — §1.4). */
  }
}
