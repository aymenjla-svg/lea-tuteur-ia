/**
 * Avatar — rendu incarné, avec paliers de présence (R6, D9, §8).
 *
 * R6 : dégradation gracieuse 3D → 2D/SVG → texte+voix → texte seul. Le moteur
 * pédagogique est IDENTIQUE à tous les paliers — seule la présence change. Le
 * palier est détecté au lancement (§8) selon les capacités du client.
 *
 * Invariant §1.4 : la vidéo de l'enfant ne sort JAMAIS. L'avatar émet des
 * `FrameAvatar` (visèmes/regard = coordonnées dérivées), jamais une image
 * issue de la caméra (cf. attention.ts / D10).
 */

import type { PersonaId } from './common.js';

/** Paliers de présence, du plus riche au plus sobre (R6). */
export type PalierPresence = '3d' | '2d_svg' | 'texte_voix' | 'texte';

/** Visème = forme de bouche associée à un phonème (lip-sync). */
export interface Viseme {
  readonly code: string;
  /** Poids d'activation [0,1] sur la frame courante. */
  readonly intensite: number;
}

/** Direction du regard (coordonnées dérivées, AUCUNE image caméra — §1.4). */
export interface Regard {
  readonly x: number; // [-1,1]
  readonly y: number; // [-1,1]
}

/**
 * Frame de rendu de l'avatar : uniquement des signaux d'animation synthétiques.
 * Ne contient jamais de pixels provenant de la caméra de l'enfant (§1.4/D10).
 */
export interface FrameAvatar {
  readonly t_ms: number;
  readonly visemes: readonly Viseme[];
  readonly regard: Regard;
  /** Expression émotionnelle synthétique (ex. « bienveillant »). */
  readonly expression?: string;
}

/**
 * Contrat de l'avatar. Implémentation par palier (RPM+R3F, SVG…), remplaçable
 * (P3). Le moteur ne « sait » pas quel palier rend — il pousse des frames.
 */
export interface Avatar {
  readonly palier: PalierPresence;
  /** Charge l'apparence d'une persona (D9). */
  monterPersona(persona_id: PersonaId): Promise<void>;
  /** Pousse une frame d'animation (lip-sync/regard synchronisés à la voix). */
  rendre(frame: FrameAvatar): void;
}
