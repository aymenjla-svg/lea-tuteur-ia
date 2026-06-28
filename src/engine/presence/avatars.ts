/**
 * Avatars — paliers de présence (R6, §8).
 *
 * Implémentations réalisables sans frontend 3D :
 *  - `TextAvatar` (palier `texte`)   : aucune incarnation visuelle (mode sobre).
 *  - `SvgAvatar`  (palier `2d_svg`)  : rend un visage SVG minimal animé par les
 *    visèmes/regard de la `FrameAvatar` — coordonnées synthétiques, JAMAIS de
 *    pixels caméra (§1.4).
 *
 * Le palier `3d` (RPM + R3F) relève d'un client web/Three.js : hors de ce dépôt
 * backend, mais derrière le MÊME contrat `Avatar` (P3/R6).
 */

import type {
  Avatar,
  FrameAvatar,
  PalierPresence,
  PersonaId,
} from '../../contracts/index.js';

export class TextAvatar implements Avatar {
  readonly palier: PalierPresence = 'texte';
  #persona: PersonaId | null = null;
  async monterPersona(persona_id: PersonaId): Promise<void> {
    this.#persona = persona_id;
  }
  get persona(): PersonaId | null {
    return this.#persona;
  }
  rendre(_frame: FrameAvatar): void {
    /* mode texte : pas d'incarnation visuelle, on ignore les frames. */
  }
}

export class SvgAvatar implements Avatar {
  readonly palier: PalierPresence = '2d_svg';
  #persona: PersonaId | null = null;
  #dernierSvg = '';

  async monterPersona(persona_id: PersonaId): Promise<void> {
    this.#persona = persona_id;
  }

  rendre(frame: FrameAvatar): void {
    this.#dernierSvg = this.dessiner(frame);
  }

  get dernierSvg(): string {
    return this.#dernierSvg;
  }

  /** Génère un visage SVG : ouverture de bouche ∝ visèmes, pupilles ∝ regard. */
  dessiner(frame: FrameAvatar): string {
    const ouverture =
      6 + 14 * Math.min(1, frame.visemes.reduce((s, v) => s + v.intensite, 0));
    const px = 50 + frame.regard.x * 6;
    const py = 42 + frame.regard.y * 4;
    return [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
      '<circle cx="50" cy="50" r="46" fill="#ffe0bd"/>',
      `<circle cx="36" cy="42" r="6" fill="#fff"/><circle cx="${px - 14}" cy="${py}" r="3" fill="#333"/>`,
      `<circle cx="64" cy="42" r="6" fill="#fff"/><circle cx="${px + 14}" cy="${py}" r="3" fill="#333"/>`,
      `<ellipse cx="50" cy="68" rx="12" ry="${ouverture.toFixed(1)}" fill="#a33"/>`,
      '</svg>',
    ].join('');
  }
}

/** Sélectionne une implémentation d'avatar pour un palier (détecté au lancement). */
export function avatarPourPalier(palier: PalierPresence): Avatar {
  switch (palier) {
    case '2d_svg':
      return new SvgAvatar();
    case '3d':
    case 'texte_voix':
    case 'texte':
      return new TextAvatar();
  }
}
