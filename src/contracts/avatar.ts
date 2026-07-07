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

/**
 * Paliers de présence, du plus sobre au plus riche (R6).
 *
 * ADDENDUM v1/A1 : le rendu PRIMAIRE est désormais le 2D expressif « manga »
 * (`2d_svg` → rig maison MVP, puis Live2D en prod). Le `3d` (RPM/R3F) est
 * relégué en option lointaine, hors chemin critique.
 */
export type PalierPresence = '3d' | '2d_svg' | 'texte_voix' | 'texte';

/**
 * Jeu d'expressions de l'avatar (ADDENDUM v1/A6). États continus + émotions.
 *
 * L'émotion liée à une correction est IMPOSÉE par le déterministe (A1) :
 * verdict `correct` → `celebrate` ; erreur → `encouraging`/`concerned` (jamais
 * moqueur). Garantit que l'avatar ne peut pas « féliciter » une réponse fausse
 * (invariant §1.1 & P1). Le LLM ne fournit qu'un indice de ton hors correction.
 */
export type Expression =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'happy'
  | 'encouraging'
  | 'surprised'
  | 'concerned'
  | 'celebrate';

/** Réactions one-shot courtes (ADDENDUM v1/A6). */
export type Reaction = 'nod' | 'aha' | 'cheer' | 'tilt';

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
  /** Expression émotionnelle synthétique (énumérée, ADDENDUM v1/A6). */
  readonly expression?: Expression;
  /** Réaction one-shot à jouer sur cette frame, le cas échéant. */
  readonly reaction?: Reaction;
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
