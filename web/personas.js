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
    coiffe: 'longs', sexe: 'f', voix: { pitch: 1.14, rate: 0.98 }, voixN: { lecture: 1.05, openai: 'shimmer' },
  },
  {
    id: 'persona-noe', nom: 'Noé', style: 'Énergique & curieux', emoji: '⚡',
    tagline: 'Transforme chaque notion de physique en expérience.',
    peau: '#f3c9a0', cheveux: '#3a2f2a', cheveux2: '#241d19',
    tenue: '#f2f4f8', tenue2: '#d6dbe4', iris: '#7a5230', accent: '#4a90d9',
    coiffe: 'courts', sexe: 'h', voix: { pitch: 0.85, rate: 1.06 }, voixN: { lecture: 0.9, openai: 'echo' },
  },
  {
    id: 'persona-mila', nom: 'Mila', style: 'Créative & imagée', emoji: '🎨',
    tagline: 'Fait comprendre avec des images et des exemples concrets.',
    peau: '#ffd9c2', cheveux: '#c86fa6', cheveux2: '#a8558a',
    tenue: '#b06ab3', tenue2: '#98549b', iris: '#8e5bd0', accent: '#b06ab3',
    coiffe: 'queue', sexe: 'f', voix: { pitch: 1.22, rate: 1.0 }, voixN: { lecture: 1.12, openai: 'nova' },
  },
  {
    id: 'persona-kenji', nom: 'Kenji', style: 'Calme & rigoureux', emoji: '🧭',
    tagline: 'Avance étape par étape, en posant bien les bases.',
    peau: '#f0c49a', cheveux: '#20242c', cheveux2: '#12151b',
    tenue: '#3f6f8f', tenue2: '#2f556e', iris: '#4a5568', accent: '#2e8b74',
    coiffe: 'carre', lunettes: true, sexe: 'h', voix: { pitch: 0.8, rate: 0.92 }, voixN: { lecture: 0.85, openai: 'onyx' },
  },
];

/** Renvoie un persona par id (défaut : le premier). */
export function personaParId(id) {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}

// --- Cheveux (arrière = derrière la tête, avant = frange à mèches) -----------
// Repère : visage centré ~ (100,108), yeux à y≈112 (pivots d'animation).

// Chevelure ARRIÈRE (derrière la tête/le corps) : masse longue qui encadre.
function cheveuxArriere(p, s) {
  switch (p.coiffe) {
    case 'longs':
      // longues ondulations (courbes en S) qui tombent le long du visage
      return `<path d="M40 96 Q18 150 30 196 Q26 224 48 228 Q40 210 50 190 Q64 156 58 104 Z" fill="url(#hair${s})"/>
              <path d="M160 96 Q182 150 170 196 Q174 224 152 228 Q160 210 150 190 Q136 156 142 104 Z" fill="url(#hair${s})"/>
              <path d="M50 108 Q36 156 46 200 Q44 216 56 216 Q50 196 56 176 Q64 146 60 112 Z" fill="${p.cheveux}" opacity="0.45"/>`;
    case 'queue':
      // queue-de-cheval latérale ondulée (haute) + petite masse arrière
      return `<path d="M150 82 Q216 104 208 172 Q220 210 190 224 Q202 196 188 176 Q206 132 148 100 Z" fill="url(#hair${s})"/>
              <path d="M154 88 Q202 108 196 166 Q206 198 184 208 Q196 182 182 166 Q196 128 150 104 Z" fill="${p.cheveux}"/>
              <path d="M162 112 Q194 132 190 176 Q196 196 180 200 Q190 178 178 164 Q188 138 160 122 Z" fill="#ffffff" opacity="0.14"/>
              <path d="M40 98 Q30 156 50 190 L58 176 Q48 134 54 108 Z" fill="${p.cheveux2}"/>`;
    case 'courts':
      return `<path d="M46 96 Q40 138 60 168 L66 146 Q54 120 58 104 Z" fill="url(#hair${s})"/>
              <path d="M154 96 Q160 138 140 168 L134 146 Q146 120 142 104 Z" fill="url(#hair${s})"/>`;
    case 'carre':
    default:
      // carré net (bob) jusqu'à la mâchoire
      return `<path d="M42 96 Q36 150 54 174 L70 170 Q56 130 58 104 Z" fill="url(#hair${s})"/>
              <path d="M158 96 Q164 150 146 174 L130 170 Q144 130 142 104 Z" fill="url(#hair${s})"/>`;
  }
}

// Chevelure AVANT : couronne volumineuse + mèches balayées (asymétriques,
// bords lisses), reflet en bandeau et ombre portée sur le front.
function cheveuxAvant(p, s) {
  // Mèches longues qui encadrent le visage (devant les oreilles) selon la coupe.
  const meches =
    p.coiffe === 'courts'
      ? ''
      : p.coiffe === 'carre'
        ? `<path d="M46 96 Q44 140 62 168 Q56 132 60 100 Z" fill="url(#hair${s})"/>
           <path d="M154 96 Q156 140 138 168 Q144 132 140 100 Z" fill="url(#hair${s})"/>`
        : `<path d="M46 94 Q38 140 50 176 Q46 196 58 196 Q52 172 58 148 Q64 122 60 100 Z" fill="url(#hair${s})"/>
           <path d="M154 94 Q162 140 150 176 Q154 196 142 196 Q148 172 142 148 Q136 122 140 100 Z" fill="url(#hair${s})"/>`;
  return `
    ${meches}
    <!-- ombre portée de la frange sur le front -->
    <path d="M56 78 Q100 94 144 78 Q138 66 100 68 Q62 66 56 78 Z" fill="#00000014"/>
    <!-- couronne + frange balayée (mèches nettes, front dégagé) -->
    <path d="M42 104
             C38 52 66 34 100 34
             C136 34 164 52 158 104
             C157 86 150 74 140 72
             C143 82 138 88 128 88
             C132 74 122 68 110 70
             C113 82 106 86 96 86
             C100 72 88 66 76 70
             C80 82 72 86 62 86
             C67 74 57 74 50 80
             C46 86 43 96 42 104 Z" fill="url(#hair${s})"/>
    <!-- mèche foncée (profondeur, côté gauche) -->
    <path d="M42 104 C45 62 64 44 92 40 C72 52 60 76 60 98 C54 86 46 92 42 104 Z" fill="${p.cheveux2}" opacity="0.45"/>
    <!-- reflet en bandeau (brillance) -->
    <path d="M58 62 Q100 42 142 62 Q118 52 100 52 Q80 52 58 62 Z" fill="#ffffff" opacity="0.22"/>
    <path d="M74 50 Q94 42 114 47 Q98 46 86 52 Q79 50 74 50 Z" fill="#ffffff" opacity="0.28"/>`;
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
    const G = dir > 0 ? 'G' : 'D';
    return `
      <!-- blanc de l'œil (grand, ouvert, arc régulier) -->
      <path d="M${cx - 15} 111 Q${cx - 14} 103 ${cx} 103 Q${cx + 14} 103 ${cx + 15} 111 Q${cx + 15} 124 ${cx} 125 Q${cx - 15} 124 ${cx - 15} 111 Z" fill="#f8fafc"/>
      <g clip-path="url(#clip${G}${s})">
        <g id="iris${G}${s}">
          <!-- iris lumineux, remonte jusqu'à la paupière -->
          <ellipse cx="${cx}" cy="114" rx="12" ry="13" fill="${p.iris}"/>
          <ellipse cx="${cx}" cy="114" rx="12" ry="13" fill="url(#irisSheen${s})"/>
          <!-- croissant clair en bas -->
          <ellipse cx="${cx}" cy="121" rx="9" ry="5.5" fill="#ffffff" opacity="0.16"/>
          <!-- pupille -->
          <ellipse cx="${cx}" cy="115" rx="3.6" ry="4.8" fill="#130c0a"/>
          <!-- gros reflet haut + petit reflet bas -->
          <ellipse cx="${cx - 4}" cy="107" rx="4.4" ry="5.4" fill="#fff"/>
          <circle cx="${cx + 5}" cy="120" r="2.1" fill="#fff" opacity="0.9"/>
        </g>
      </g>
      <!-- paupière haute épaisse : arc doux et haut (regard ouvert) -->
      <path d="M${cx - 15} 111 Q${cx - 13} 104 ${cx} 104 Q${cx + 13} 104 ${cx + 15} 110" fill="none" stroke="#241812" stroke-width="3.8" stroke-linecap="round"/>
      <!-- cils : 3 mèches douces au coin externe -->
      <path d="M${cx + o * 14} 108 q${o * 5} -1 ${o * 9} -5" fill="none" stroke="#241812" stroke-width="2.3" stroke-linecap="round"/>
      <path d="M${cx + o * 15} 111 q${o * 5} 1 ${o * 9} -2" fill="none" stroke="#241812" stroke-width="1.9" stroke-linecap="round"/>
      <path d="M${cx + o * 15} 114 q${o * 5} 1 ${o * 8} 1" fill="none" stroke="#241812" stroke-width="1.5" stroke-linecap="round"/>
      <!-- trait de paupière basse (discret) -->
      <path d="M${cx - 8} 123 Q${cx} 125 ${cx + 8} 123" fill="none" stroke="#8a6656" stroke-width="1.2" opacity="0.45" stroke-linecap="round"/>`;
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
    <!-- iris lumineux : clair en bas, sombre sur les bords (façon cel anime) -->
    <radialGradient id="irisSheen${s}" cx="50%" cy="72%" r="68%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="46%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#001018" stop-opacity="0.42"/>
    </radialGradient>
    <linearGradient id="hair${s}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.cheveux}"/>
      <stop offset="100%" stop-color="${p.cheveux2}"/>
    </linearGradient>
    <clipPath id="clipG${s}"><path d="M59 111 Q60 103 74 103 Q88 103 89 111 Q89 124 74 125 Q59 124 59 111 Z"/></clipPath>
    <clipPath id="clipD${s}"><path d="M111 111 Q112 103 126 103 Q140 103 141 111 Q141 124 126 125 Q111 124 111 111 Z"/></clipPath>
    <linearGradient id="coat${s}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e8edf5"/>
    </linearGradient>
  </defs>

  <!-- Corps : col roulé (couleur du prof) + blouse de laborantin -->
  <g id="corps${s}">
    <!-- cou -->
    <path d="M88 168 Q88 186 100 190 Q112 186 112 168 Z" fill="${p.peau}"/>
    <path d="M88 170 Q100 182 112 170 L112 165 Q100 174 88 165 Z" fill="#00000018"/>
    <!-- épaules / col roulé -->
    <path d="M30 240 Q34 196 74 184 L126 184 Q166 196 170 240 Z" fill="${p.tenue}"/>
    <path d="M74 184 Q100 202 126 184 Q124 176 100 178 Q76 176 74 184 Z" fill="${p.tenue2}"/>
    <path d="M80 182 Q100 196 120 182" fill="none" stroke="#0000001a" stroke-width="1.6"/>
    <!-- blouse (revers ouverts) -->
    <path d="M30 240 Q33 200 72 185 L98 214 L82 240 Z" fill="url(#coat${s})"/>
    <path d="M170 240 Q167 200 128 185 L102 214 L118 240 Z" fill="url(#coat${s})"/>
    <path d="M72 185 L98 214 L92 216 L70 190 Z" fill="#00000010"/>
    <path d="M128 185 L102 214 L108 216 L130 190 Z" fill="#00000010"/>
  </g>

  <!-- Tête (inclinaison/rebond via #visageG) -->
  <g id="visageG${s}">
    ${cheveuxArriere(p, s)}
    <!-- oreilles -->
    <path d="M44 108 Q36 110 38 122 Q40 132 50 130 Z" fill="${p.peau}"/>
    <path d="M156 108 Q164 110 162 122 Q160 132 150 130 Z" fill="${p.peau}"/>
    <path d="M46 114 Q42 116 44 124" fill="none" stroke="#00000022" stroke-width="1.4"/>
    <path d="M154 114 Q158 116 156 124" fill="none" stroke="#00000022" stroke-width="1.4"/>
    <!-- visage (ovale allongé, menton fin façon anime) -->
    <path d="M50 104 C50 64 72 50 100 50 C128 50 150 64 150 104 C150 134 138 158 118 172 C110 179 104 183 100 184 C96 183 90 179 82 172 C62 158 50 134 50 104 Z" fill="${p.peau}"/>
    <path d="M50 104 C50 64 72 50 100 50 C128 50 150 64 150 104 C150 134 138 158 118 172 C110 179 104 183 100 184 C96 183 90 179 82 172 C62 158 50 134 50 104 Z" fill="url(#skin${s})"/>
    <!-- ombres de mâchoire / pommettes -->
    <path d="M78 166 Q100 178 122 166 Q112 176 100 178 Q88 176 78 166 Z" fill="#00000010"/>
    <path d="M54 108 Q52 130 66 146 Q58 126 60 108 Z" fill="#00000008"/>

    <!-- blush doux permanent (rendu « soft anime ») -->
    <ellipse cx="71" cy="131" rx="9" ry="5" fill="#ff9ba8" opacity="0.18"/>
    <ellipse cx="129" cy="131" rx="9" ry="5" fill="#ff9ba8" opacity="0.18"/>
    <circle id="joueG${s}" cx="70" cy="132" r="11" fill="url(#joueGrad${s})" opacity="0"/>
    <circle id="joueD${s}" cx="130" cy="132" r="11" fill="url(#joueGrad${s})" opacity="0"/>

    <g id="oeilG${s}">${oeil(74, 1)}</g>
    <g id="oeilD${s}">${oeil(126, -1)}</g>

    <path id="sourcilG${s}" d="M59 84 Q74 77 90 82" stroke="${p.cheveux}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.9"/>
    <path id="sourcilD${s}" d="M110 82 Q126 77 141 84" stroke="${p.cheveux}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.9"/>

    <!-- nez (arête + narine, discret) -->
    <path d="M102 118 Q106 130 99 134" fill="none" stroke="#00000024" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M99 134 q-3 1 -4 -1" fill="none" stroke="#00000018" stroke-width="1.2" stroke-linecap="round"/>

    <!-- bouche (lèvres fines) -->
    <path id="sourire${s}" d="M84 144 Q100 156 116 144" stroke="#c06a5e" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0"/>
    <ellipse id="bouche${s}" cx="100" cy="146" rx="7.5" ry="2.6" fill="#c06a5e"/>
    <path d="M91 145 q9 4 18 0" stroke="#00000016" stroke-width="1.1" fill="none"/>
    <path d="M93 150 q7 3 14 0" stroke="#ffffff" stroke-width="1" opacity="0.25" fill="none"/>

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
