// Léa — catalogue de personas + rig d'avatar 2D « manga » expressif.
//
// ADDENDUM v1/A1 : rendu primaire 2D expressif (gros yeux anime), 100 % SVG,
// zéro licence/asset distant. L'élève choisit son prof au démarrage (§7 :
// matching élève↔persona). Chaque persona ne change QUE l'apparence — même
// moteur, mêmes invariants (R6). L'avatar expose des IDs stables pour que
// l'animation (app.js) les pilote quel que soit le persona.

// v1 = PHYSIQUE uniquement (les autres matières viendront dans une autre appli).
// Le choix ne porte donc PAS sur la matière mais sur le STYLE du prof : même
// programme de physique pour tous, présence/personnalité différentes (§7).
export const MATIERE = 'Physique';

/** Catalogue des profs (styles). `coiffe` choisit un gabarit de cheveux. */
export const PERSONAS = [
  {
    id: 'persona-lea', nom: 'Léa', style: 'Douce & patiente', emoji: '🌸',
    tagline: 'Explique calmement, te laisse tout le temps qu’il faut.',
    peau: '#ffdcc0', cheveux: '#8a5a3b', cheveux2: '#6f4529',
    tenue: '#e0a83e', tenue2: '#c8902c', iris: '#5a9e6f', accent: '#e0a83e',
    coiffe: 'longs',
  },
  {
    id: 'persona-noe', nom: 'Noé', style: 'Énergique & curieux', emoji: '⚡',
    tagline: 'Transforme chaque notion de physique en expérience.',
    peau: '#f3c9a0', cheveux: '#3a2f2a', cheveux2: '#241d19',
    tenue: '#f2f4f8', tenue2: '#d6dbe4', iris: '#7a5230', accent: '#4a90d9',
    coiffe: 'courts',
  },
  {
    id: 'persona-mila', nom: 'Mila', style: 'Créative & imagée', emoji: '🎨',
    tagline: 'Fait comprendre avec des images et des exemples concrets.',
    peau: '#ffd9c2', cheveux: '#c86fa6', cheveux2: '#a8558a',
    tenue: '#b06ab3', tenue2: '#98549b', iris: '#8e5bd0', accent: '#b06ab3',
    coiffe: 'queue',
  },
  {
    id: 'persona-kenji', nom: 'Kenji', style: 'Calme & rigoureux', emoji: '🧭',
    tagline: 'Avance étape par étape, en posant bien les bases.',
    peau: '#f0c49a', cheveux: '#20242c', cheveux2: '#12151b',
    tenue: '#3f6f8f', tenue2: '#2f556e', iris: '#4a5568', accent: '#2e8b74',
    coiffe: 'carre', lunettes: true,
  },
];

/** Renvoie un persona par id (défaut : le premier). */
export function personaParId(id) {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}

// --- Gabarits de cheveux (arrière = derrière la tête, avant = frange) --------
// Repère : visage centré ~ (100,104), rayon ~ 60. Coordonnées en viewBox 200×240.

function cheveuxArriere(p) {
  switch (p.coiffe) {
    case 'longs': // longue chevelure qui tombe sur les épaules
      return `<path d="M32 96 Q28 176 44 208 L58 200 Q46 150 52 104 Z" fill="${p.cheveux2}"/>
              <path d="M168 96 Q172 176 156 208 L142 200 Q154 150 148 104 Z" fill="${p.cheveux2}"/>`;
    case 'queue': // queue de côté
      return `<path d="M150 70 Q196 96 190 168 Q176 150 158 150 Q170 110 150 92 Z" fill="${p.cheveux2}"/>`;
    case 'courts':
    case 'carre':
    default:
      return `<path d="M40 96 Q40 150 56 176 L60 150 Q52 120 56 100 Z" fill="${p.cheveux2}"/>
              <path d="M160 96 Q160 150 144 176 L140 150 Q148 120 144 100 Z" fill="${p.cheveux2}"/>`;
  }
}

function cheveuxAvant(p) {
  switch (p.coiffe) {
    case 'longs':
      return `<path d="M40 92 Q52 34 100 32 Q148 34 160 92 Q150 66 128 60
              Q120 84 108 66 Q100 88 92 66 Q80 84 72 60 Q50 66 40 92 Z" fill="${p.cheveux}"/>`;
    case 'queue':
      return `<path d="M42 92 Q54 36 100 34 Q150 36 160 92 Q152 64 130 58
              Q116 82 104 62 Q96 86 84 64 Q68 70 42 92 Z" fill="${p.cheveux}"/>`;
    case 'courts':
      return `<path d="M44 92 Q54 40 100 38 Q146 40 156 92 Q150 58 118 56
              Q110 74 96 58 Q84 74 74 60 Q52 62 44 92 Z" fill="${p.cheveux}"/>`;
    case 'carre':
    default:
      return `<path d="M42 96 Q46 42 100 40 Q154 42 158 96 Q150 60 100 58
              Q50 60 42 96 Z" fill="${p.cheveux}"/>`;
  }
}

/**
 * Construit le SVG d'un avatar manga expressif.
 *
 * `uid` suffixe TOUS les IDs (clipPath/gradient + éléments animés) pour éviter
 * les collisions quand plusieurs avatars coexistent (cartes de choix). L'avatar
 * principal (animé par app.js) est construit SANS uid → il garde les IDs
 * canoniques : #corps #visageG #oeilG #oeilD #irisG #irisD #sourcilG #sourcilD
 * #bouche #sourire #joueG #joueD #goutte #etincelles #bulle.
 */
export function avatarSVG(p, uid = '') {
  const s = uid ? `-${uid}` : '';
  const lunettes = p.lunettes
    ? `<g stroke="#2c2c2c" stroke-width="2.4" fill="none" opacity="0.9">
         <circle cx="74" cy="112" r="20"/><circle cx="126" cy="112" r="20"/>
         <path d="M94 112 h12"/><path d="M54 108 l-10 -4"/><path d="M146 108 l10 -4"/>
       </g>`
    : '';
  return `
<svg viewBox="0 0 200 240" class="visage" role="img" aria-label="Avatar de ${p.nom}">
  <defs>
    <radialGradient id="joueGrad${s}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff8fa3" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ff8fa3" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="clipG${s}"><ellipse cx="74" cy="112" rx="17" ry="21"/></clipPath>
    <clipPath id="clipD${s}"><ellipse cx="126" cy="112" rx="17" ry="21"/></clipPath>
  </defs>

  <!-- Corps (respiration) -->
  <g id="corps${s}">
    <path d="M40 240 Q44 188 78 176 L122 176 Q156 188 160 240 Z" fill="${p.tenue}"/>
    <path d="M78 176 Q100 196 122 176 L118 172 Q100 184 82 172 Z" fill="${p.tenue2}"/>
    <rect x="88" y="158" width="24" height="26" rx="8" fill="${p.peau}"/>
  </g>

  <!-- Tête (inclinaison/rebond via #visageG) -->
  <g id="visageG${s}">
    ${cheveuxArriere(p)}
    <ellipse cx="40" cy="112" rx="8" ry="12" fill="${p.peau}"/>
    <ellipse cx="160" cy="112" rx="8" ry="12" fill="${p.peau}"/>
    <path d="M44 104 Q44 48 100 46 Q156 48 156 104 Q156 156 100 168 Q44 156 44 104 Z" fill="${p.peau}"/>

    <circle id="joueG${s}" cx="66" cy="130" r="13" fill="url(#joueGrad${s})" opacity="0"/>
    <circle id="joueD${s}" cx="134" cy="130" r="13" fill="url(#joueGrad${s})" opacity="0"/>

    <!-- GROS yeux manga -->
    <g id="oeilG${s}">
      <ellipse cx="74" cy="112" rx="17" ry="21" fill="#ffffff" stroke="#2c2c2c" stroke-width="1.4"/>
      <g clip-path="url(#clipG${s})">
        <g id="irisG${s}">
          <circle cx="74" cy="114" r="13" fill="${p.iris}"/>
          <circle cx="74" cy="114" r="12" fill="none" stroke="#00000022" stroke-width="3"/>
          <circle cx="74" cy="115" r="6.5" fill="#1a1a1a"/>
          <circle cx="69" cy="108" r="3.6" fill="#ffffff"/>
          <circle cx="79" cy="118" r="1.8" fill="#ffffff" opacity="0.8"/>
        </g>
      </g>
    </g>
    <g id="oeilD${s}">
      <ellipse cx="126" cy="112" rx="17" ry="21" fill="#ffffff" stroke="#2c2c2c" stroke-width="1.4"/>
      <g clip-path="url(#clipD${s})">
        <g id="irisD${s}">
          <circle cx="126" cy="114" r="13" fill="${p.iris}"/>
          <circle cx="126" cy="114" r="12" fill="none" stroke="#00000022" stroke-width="3"/>
          <circle cx="126" cy="115" r="6.5" fill="#1a1a1a"/>
          <circle cx="121" cy="108" r="3.6" fill="#ffffff"/>
          <circle cx="131" cy="118" r="1.8" fill="#ffffff" opacity="0.8"/>
        </g>
      </g>
    </g>
    <path d="M57 100 l-7 -4" stroke="#2c2c2c" stroke-width="2" stroke-linecap="round"/>
    <path d="M143 100 l7 -4" stroke="#2c2c2c" stroke-width="2" stroke-linecap="round"/>

    <path id="sourcilG${s}" d="M58 88 Q74 82 90 88" stroke="${p.cheveux2}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <path id="sourcilD${s}" d="M110 88 Q126 82 142 88" stroke="${p.cheveux2}" stroke-width="3.2" fill="none" stroke-linecap="round"/>

    <path d="M100 118 q3 6 -2 8" stroke="#00000033" stroke-width="1.6" fill="none" stroke-linecap="round"/>

    <path id="sourire${s}" d="M84 140 Q100 152 116 140" stroke="#b0463f" stroke-width="3" fill="none" stroke-linecap="round" opacity="0"/>
    <ellipse id="bouche${s}" cx="100" cy="142" rx="9" ry="3" fill="#b0463f"/>

    ${cheveuxAvant(p)}
    ${lunettes}

    <path id="goutte${s}" d="M150 78 q6 10 0 16 q-6 -6 0 -16 Z" fill="#7fd3f2" opacity="0"/>
    <g id="etincelles${s}" opacity="0">
      <path d="M40 60 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 Z" fill="#ffd54a"/>
      <path d="M158 56 l1.6 5 5 1.6 -5 1.6 -1.6 5 -1.6 -5 -5 -1.6 5 -1.6 Z" fill="#ffd54a"/>
      <path d="M150 100 l1.2 4 4 1.2 -4 1.2 -1.2 4 -1.2 -4 -4 -1.2 4 -1.2 Z" fill="#fff0a8"/>
    </g>
    <g id="bulle${s}" opacity="0">
      <circle cx="150" cy="70" r="3" fill="#ffffff" stroke="#c9d2e0"/>
      <circle cx="160" cy="62" r="4" fill="#ffffff" stroke="#c9d2e0"/>
      <circle cx="172" cy="52" r="6" fill="#ffffff" stroke="#c9d2e0"/>
      <text x="172" y="56" font-size="8" text-anchor="middle" fill="#8a93a3">?</text>
    </g>
  </g>
</svg>`;
}
