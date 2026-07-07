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
    coiffe: 'longs', sexe: 'f', voix: { pitch: 1.14, rate: 0.98 },
  },
  {
    id: 'persona-noe', nom: 'Noé', style: 'Énergique & curieux', emoji: '⚡',
    tagline: 'Transforme chaque notion de physique en expérience.',
    peau: '#f3c9a0', cheveux: '#3a2f2a', cheveux2: '#241d19',
    tenue: '#f2f4f8', tenue2: '#d6dbe4', iris: '#7a5230', accent: '#4a90d9',
    coiffe: 'courts', sexe: 'h', voix: { pitch: 0.85, rate: 1.06 },
  },
  {
    id: 'persona-mila', nom: 'Mila', style: 'Créative & imagée', emoji: '🎨',
    tagline: 'Fait comprendre avec des images et des exemples concrets.',
    peau: '#ffd9c2', cheveux: '#c86fa6', cheveux2: '#a8558a',
    tenue: '#b06ab3', tenue2: '#98549b', iris: '#8e5bd0', accent: '#b06ab3',
    coiffe: 'queue', sexe: 'f', voix: { pitch: 1.22, rate: 1.0 },
  },
  {
    id: 'persona-kenji', nom: 'Kenji', style: 'Calme & rigoureux', emoji: '🧭',
    tagline: 'Avance étape par étape, en posant bien les bases.',
    peau: '#f0c49a', cheveux: '#20242c', cheveux2: '#12151b',
    tenue: '#3f6f8f', tenue2: '#2f556e', iris: '#4a5568', accent: '#2e8b74',
    coiffe: 'carre', lunettes: true, sexe: 'h', voix: { pitch: 0.8, rate: 0.92 },
  },
];

/** Renvoie un persona par id (défaut : le premier). */
export function personaParId(id) {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}

// --- Cheveux (arrière = derrière la tête, avant = frange à mèches) -----------
// Repère : visage centré ~ (100,108), yeux à y≈112 (pivots d'animation).

function cheveuxArriere(p) {
  switch (p.coiffe) {
    case 'longs':
      return `<path d="M34 92 Q26 178 46 214 L60 206 Q48 150 54 100 Z" fill="${p.cheveux2}"/>
              <path d="M166 92 Q174 178 154 214 L140 206 Q152 150 146 100 Z" fill="${p.cheveux2}"/>`;
    case 'queue':
      return `<path d="M146 66 Q198 92 196 176 Q180 150 158 152 Q174 108 146 88 Z" fill="${p.cheveux2}"/>
              <path d="M150 70 Q188 96 188 168 Q176 150 160 150 Q170 112 150 90 Z" fill="${p.cheveux}"/>`;
    case 'courts':
    case 'carre':
    default:
      return `<path d="M40 92 Q38 152 58 180 L64 150 Q54 118 58 96 Z" fill="${p.cheveux2}"/>
              <path d="M160 92 Q162 152 142 180 L136 150 Q146 118 142 96 Z" fill="${p.cheveux2}"/>`;
  }
}

// Frange à mèches pointues (bord dentelé), avec reflet + ombre de front.
function cheveuxAvant(p, s) {
  const base =
    p.coiffe === 'carre'
      ? `M40 100 Q42 46 100 42 Q158 46 160 100 Q152 66 130 62 L134 96
         Q120 62 100 60 Q80 62 66 96 L70 62 Q48 66 40 100 Z`
      : `M40 100 Q44 44 100 40 Q156 44 160 100
         Q150 68 132 64 L140 98 Q126 64 112 62 L118 92 Q106 60 100 60
         Q94 60 82 92 L88 62 Q74 64 60 98 L68 64 Q50 68 40 100 Z`;
  return `
    <!-- ombre portée de la frange sur le front -->
    <path d="M52 92 Q100 108 148 92 Q140 74 100 76 Q60 74 52 92 Z" fill="#00000012"/>
    <path d="${base}" fill="${p.cheveux}"/>
    <!-- mèche foncée (profondeur) -->
    <path d="M40 100 Q52 62 84 60 L74 92 Q58 70 40 100 Z" fill="${p.cheveux2}" opacity="0.55"/>
    <!-- reflet -->
    <path d="M96 50 Q118 50 138 66 Q120 58 100 60 Q86 60 80 70 Q86 54 96 50 Z" fill="#ffffff" opacity="0.22"/>`;
}

/**
 * Construit le SVG d'un avatar manga « pro » (yeux détaillés, ombrage, mèches).
 *
 * `uid` suffixe TOUS les IDs (clipPath/gradients + éléments animés) pour éviter
 * les collisions quand plusieurs avatars coexistent. L'avatar principal (animé
 * par app.js) est construit SANS uid → IDs canoniques : #corps #visageG #oeilG
 * #oeilD #irisG #irisD #sourcilG #sourcilD #bouche #sourire #joueG #joueD
 * #goutte #etincelles #bulle. Ancrages : yeux à y≈112, bouche à y≈146.
 */
export function avatarSVG(p, uid = '') {
  const s = uid ? `-${uid}` : '';
  // Un œil manga complet, paramétré par le centre x (miroir pour l'autre œil).
  const oeil = (cx, dir) => {
    const o = -dir; // sens « vers l'extérieur » : gauche→-1, droite→+1
    const ext = cx + o * 15; // coin externe de l'œil
    return `
      <ellipse cx="${cx}" cy="112" rx="16" ry="19" fill="#fff"/>
      <g clip-path="url(#clip${dir > 0 ? 'G' : 'D'}${s})">
        <g id="iris${dir > 0 ? 'G' : 'D'}${s}">
          <circle cx="${cx}" cy="115" r="14" fill="${p.iris}"/>
          <path d="M${cx - 14} 111 A14 14 0 0 1 ${cx + 14} 111 A14 18 0 0 0 ${cx - 14} 111 Z" fill="#000000" opacity="0.28"/>
          <circle cx="${cx}" cy="115" r="14" fill="none" stroke="#00000028" stroke-width="2.5"/>
          <circle cx="${cx}" cy="117" r="6.2" fill="#141010"/>
          <ellipse cx="${cx - 5}" cy="107" rx="4.6" ry="5.4" fill="#fff"/>
          <circle cx="${cx + 6}" cy="122" r="2.3" fill="#fff" opacity="0.85"/>
        </g>
      </g>
      <!-- eyeliner (paupière haute) : arc doux, sans écraser le regard -->
      <path d="M${cx - 15} 110 Q${cx} 100 ${cx + 15} 109" fill="none" stroke="#2a1f18" stroke-width="3.8" stroke-linecap="round"/>
      <!-- cils au coin externe (pointent vers l'extérieur) -->
      <path d="M${ext} 108 q${o * 6} -4 ${o * 9} -6" fill="none" stroke="#2a1f18" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M${ext + o * 1} 112 q${o * 6} -1 ${o * 9} -3" fill="none" stroke="#2a1f18" stroke-width="1.8" stroke-linecap="round"/>
      <!-- pli de paupière inférieure (léger) -->
      <path d="M${cx - 11} 127 Q${cx} 131 ${cx + 11} 126" fill="none" stroke="#c98f77" stroke-width="1.3" opacity="0.45" stroke-linecap="round"/>`;
  };
  const lunettes = p.lunettes
    ? `<g stroke="#20242c" stroke-width="2.6" fill="#ffffff10">
         <rect x="52" y="100" width="40" height="30" rx="12"/>
         <rect x="108" y="100" width="40" height="30" rx="12"/>
         <path d="M92 114 h16" fill="none"/><path d="M52 110 l-10 -3" fill="none"/><path d="M148 110 l10 -3" fill="none"/>
       </g>`
    : '';
  return `
<svg viewBox="0 0 200 240" class="visage" role="img" aria-label="Avatar de ${p.nom}">
  <defs>
    <radialGradient id="joueGrad${s}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff8fa3" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ff8fa3" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="skin${s}" cx="50%" cy="38%" r="62%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.30"/>
      <stop offset="70%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="clipG${s}"><ellipse cx="74" cy="112" rx="16" ry="19"/></clipPath>
    <clipPath id="clipD${s}"><ellipse cx="126" cy="112" rx="16" ry="19"/></clipPath>
  </defs>

  <!-- Corps (respiration) -->
  <g id="corps${s}">
    <path d="M36 240 Q40 186 76 174 L124 174 Q160 186 164 240 Z" fill="${p.tenue}"/>
    <path d="M76 174 Q100 198 124 174 L119 169 Q100 186 81 169 Z" fill="${p.tenue2}"/>
    <path d="M88 154 h24 v20 q-12 10 -24 0 Z" fill="${p.peau}"/>
    <path d="M88 154 h24 v6 q-12 7 -24 0 Z" fill="#00000018"/>
  </g>

  <!-- Tête (inclinaison/rebond via #visageG) -->
  <g id="visageG${s}">
    ${cheveuxArriere(p)}
    <ellipse cx="41" cy="114" rx="7.5" ry="11" fill="${p.peau}"/>
    <ellipse cx="159" cy="114" rx="7.5" ry="11" fill="${p.peau}"/>
    <!-- visage manga (menton affiné) -->
    <path d="M46 106 Q44 54 100 50 Q156 54 154 106 Q152 140 128 160 Q112 174 100 176 Q88 174 72 160 Q48 140 46 106 Z" fill="${p.peau}"/>
    <path d="M46 106 Q44 54 100 50 Q156 54 154 106 Q152 140 128 160 Q112 174 100 176 Q88 174 72 160 Q48 140 46 106 Z" fill="url(#skin${s})"/>
    <!-- ombres de mâchoire -->
    <path d="M72 158 Q100 172 128 158 Q118 168 100 170 Q82 168 72 158 Z" fill="#00000010"/>

    <circle id="joueG${s}" cx="66" cy="130" r="12" fill="url(#joueGrad${s})" opacity="0"/>
    <circle id="joueD${s}" cx="134" cy="130" r="12" fill="url(#joueGrad${s})" opacity="0"/>

    <g id="oeilG${s}">${oeil(74, 1)}</g>
    <g id="oeilD${s}">${oeil(126, -1)}</g>

    <path id="sourcilG${s}" d="M58 85 Q74 78 90 84" stroke="${p.cheveux2}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <path id="sourcilD${s}" d="M110 84 Q126 78 142 85" stroke="${p.cheveux2}" stroke-width="3.2" fill="none" stroke-linecap="round"/>

    <!-- nez -->
    <path d="M101 122 q3.5 7 -3 10" stroke="#00000026" stroke-width="1.6" fill="none" stroke-linecap="round"/>

    <path id="sourire${s}" d="M84 144 Q100 156 116 144" stroke="#b5544a" stroke-width="3" fill="none" stroke-linecap="round" opacity="0"/>
    <ellipse id="bouche${s}" cx="100" cy="146" rx="8.5" ry="3" fill="#b5544a"/>
    <path d="M92 145 q8 4 16 0" stroke="#00000018" stroke-width="1.2" fill="none"/>

    ${cheveuxAvant(p, s)}
    ${lunettes}

    <path id="goutte${s}" d="M150 78 q6 10 0 16 q-6 -6 0 -16 Z" fill="#7fd3f2" opacity="0"/>
    <g id="etincelles${s}" opacity="0">
      <path d="M40 58 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 Z" fill="#ffd54a"/>
      <path d="M160 54 l1.6 5 5 1.6 -5 1.6 -1.6 5 -1.6 -5 -5 -1.6 5 -1.6 Z" fill="#ffd54a"/>
      <path d="M152 98 l1.2 4 4 1.2 -4 1.2 -1.2 4 -1.2 -4 -4 -1.2 4 -1.2 Z" fill="#fff0a8"/>
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
