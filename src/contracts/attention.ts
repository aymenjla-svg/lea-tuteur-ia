/**
 * AttentionSource — l'attention comme signal pédagogique (D12), source-agnostique.
 *
 * D10 : caméra 100 % LOCALE. Invariant §1.4 : la vidéo de l'enfant ne sort
 * jamais. Ce contrat n'expose donc QUE des signaux dérivés (scalaires) — jamais
 * d'image, jamais de coordonnées faciales brutes exploitables hors appareil.
 *
 * D12 : source-agnostique — le signal peut venir d'une webcam locale, d'un
 * suivi d'interaction (clavier/scroll), ou de rien (désactivé). Le moteur
 * consomme un signal normalisé, sans savoir d'où il vient.
 *
 * Bienveillante & désactivable (§8) : l'attention sert à AIDER (proposer une
 * pause, rebondir), jamais à surveiller ni sanctionner.
 */

import type { EleveId, ISODateTime } from './common.js';

/** Origine déclarée du signal (pour transparence/UX), jamais les données brutes. */
export type TypeSourceAttention = 'webcam_locale' | 'interaction' | 'desactive';

/**
 * Signal d'attention dérivé. Tous les champs sont des scalaires synthétiques
 * calculés LOCALEMENT (D10) — aucune image ni flux vidéo (§1.4).
 */
export interface SignalAttention {
  readonly eleve_id: EleveId;
  readonly horodatage: ISODateTime;
  /** Niveau d'attention estimé [0,1]. */
  readonly niveau: number;
  /** Signe de fatigue/baisse de régime [0,1] (indice doux, non punitif). */
  readonly fatigue: number;
  readonly source: TypeSourceAttention;
}

/**
 * Source d'attention. Désactivable : si l'utilisateur refuse, `estActive()`
 * renvoie `false` et le moteur fonctionne normalement sans ce signal (§8).
 */
export interface AttentionSource {
  readonly type: TypeSourceAttention;
  estActive(): boolean;
  /** Flux de signaux dérivés (jamais de vidéo — §1.4/D10). */
  signaux(): AsyncIterable<SignalAttention>;
}
