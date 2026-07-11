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
    portrait: 'avatars/persona-lea.png',
    peau: '#ffdcc0', cheveux: '#8a5a3b', cheveux2: '#6f4529',
    tenue: '#e0a83e', tenue2: '#c8902c', iris: '#5a9e6f', accent: '#e0a83e',
    coiffe: 'longs', sexe: 'f', voix: { pitch: 1.14, rate: 0.98 }, voixN: { lecture: 1.05, openai: 'shimmer' },
    soul: 'Tu es douce, patiente et rassurante. Tu ne presses jamais l’élève (« on a tout notre temps »). Tu valorises chaque effort AVANT de corriger, avec beaucoup de bienveillance. Tu expliques calmement, avec des mots simples et des exemples du quotidien. Quand l’élève se trompe, tu dédramatises : l’erreur fait partie de l’apprentissage.',
  },
  {
    id: 'persona-mila', nom: 'Mila', style: 'Créative & imagée', emoji: '🎨',
    tagline: 'Fait comprendre avec des images et des exemples concrets.',
    portrait: 'avatars/persona-mila.png',
    peau: '#ffd9c2', cheveux: '#c86fa6', cheveux2: '#a8558a',
    tenue: '#b06ab3', tenue2: '#98549b', iris: '#8e5bd0', accent: '#b06ab3',
    coiffe: 'queue', sexe: 'f', voix: { pitch: 1.22, rate: 1.0 }, voixN: { lecture: 1.12, openai: 'nova' },
    soul: 'Tu es créative et imagée. Tu fais comprendre en peignant des images mentales (« imagine que… »), avec des comparaisons tirées de la nature, de l’art, de la vie de tous les jours. Tu es enthousiaste et colorée dans tes mots. Tu proposes souvent une petite analogie visuelle ou un croquis pour ancrer l’idée.',
  },
  {
    id: 'persona-theo', nom: 'Théo', style: 'Malin & taquin', emoji: '😄',
    tagline: 'Glisse une pointe d’humour pour que ça reste en tête.',
    portrait: 'avatars/persona-theo.png',
    peau: '#f0c49a', cheveux: '#4a2f1e', cheveux2: '#33200f',
    tenue: '#e06d5a', tenue2: '#c4543f', iris: '#6a4a2a', accent: '#e06d5a',
    coiffe: 'boucles', sexe: 'h', voix: { pitch: 0.82, rate: 1.05 }, voixN: { lecture: 0.8, openai: 'ballad' },
    soul: 'Tu es malin et taquin. Tu glisses une pointe d’humour, un jeu de mots léger ou une petite blague pour rendre la physique fun et mémorable — SANS JAMAIS te moquer de l’élève. Tu donnes des « astuces de malin » pour retenir. Tu restes complice, positif et encourageant.',
  },
  {
    id: 'persona-sami', nom: 'Sami', style: 'Complice & rassurant', emoji: '🤝',
    tagline: 'Comme un grand frère : jamais tu ne restes bloqué·e seul·e.',
    portrait: 'avatars/persona-sami.png',
    peau: '#e0a878', cheveux: '#161619', cheveux2: '#0b0b0d',
    tenue: '#4a90d9', tenue2: '#3a72ad', iris: '#3a3f4c', accent: '#4a90d9',
    coiffe: 'ondules', sexe: 'h', voix: { pitch: 0.78, rate: 0.99 }, voixN: { lecture: 0.77, openai: 'verse' },
    soul: 'Tu es le grand frère complice et rassurant. Tu mets l’élève en confiance (« t’inquiète, on va y arriver ensemble »). Tu décomposes tout pas à pas, calmement. Tu utilises des exemples proches de la vie des ados (sport, jeux vidéo, téléphone). Tu rassures dès que l’élève doute et tu célèbres ses progrès.',
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
    case 'rase':
      // coupe très courte : rien derrière (le crâne est net), nuque discrète
      return `<path d="M52 104 Q50 122 60 138 L66 128 Q58 114 60 104 Z" fill="${p.cheveux2}" opacity=".8"/>
              <path d="M148 104 Q150 122 140 138 L134 128 Q142 114 140 104 Z" fill="${p.cheveux2}" opacity=".8"/>`;
    case 'boucles':
      // masse bouclée qui déborde en petits arcs autour des tempes/nuque
      return `<path d="M44 96 Q34 140 56 172 Q46 150 52 128 Q48 110 56 100 Z" fill="url(#hair${s})"/>
              <path d="M156 96 Q166 140 144 172 Q154 150 148 128 Q152 110 144 100 Z" fill="url(#hair${s})"/>
              <g fill="${p.cheveux2}" opacity=".5"><circle cx="50" cy="150" r="7"/><circle cx="60" cy="164" r="6"/><circle cx="150" cy="150" r="7"/><circle cx="140" cy="164" r="6"/></g>`;
    case 'ondules':
      // coupe homme mi-courte, un peu ondulée : masse ramassée sur la nuque
      // (ne descend pas le long des joues → lecture masculine)
      return `<path d="M48 98 Q40 128 58 150 L66 136 Q56 116 60 102 Z" fill="url(#hair${s})"/>
              <path d="M152 98 Q160 128 142 150 L134 136 Q144 116 140 102 Z" fill="url(#hair${s})"/>
              <path d="M52 104 Q46 128 58 146 Q56 128 62 112 Z" fill="${p.cheveux2}" opacity=".4"/>`;
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
    p.coiffe === 'courts' || p.coiffe === 'rase' || p.coiffe === 'boucles' || p.coiffe === 'ondules'
      ? ''
      : p.coiffe === 'carre'
        ? `<path d="M46 96 Q44 140 62 168 Q56 132 60 100 Z" fill="url(#hair${s})"/>
           <path d="M154 96 Q156 140 138 168 Q144 132 140 100 Z" fill="url(#hair${s})"/>`
        : `<path d="M46 94 Q38 140 50 176 Q46 196 58 196 Q52 172 58 148 Q64 122 60 100 Z" fill="url(#hair${s})"/>
           <path d="M154 94 Q162 140 150 176 Q154 196 142 196 Q148 172 142 148 Q136 122 140 100 Z" fill="url(#hair${s})"/>`;

  // Coupe très courte (buzz) : calotte qui épouse le crâne, ligne de cheveux nette.
  if (p.coiffe === 'rase') {
    return `
      <path d="M44 102 C42 60 68 42 100 42 C132 42 158 60 156 102
               C150 88 140 80 128 79 Q100 73 72 79 C60 80 50 88 44 102 Z" fill="url(#hair${s})"/>
      <path d="M44 102 C46 66 66 48 92 44 C74 56 62 80 60 100 C54 90 48 94 44 102 Z" fill="${p.cheveux2}" opacity="0.4"/>
      <g fill="#ffffff" opacity="0.10"><circle cx="82" cy="60" r="1.4"/><circle cx="100" cy="55" r="1.4"/><circle cx="118" cy="60" r="1.4"/><circle cx="70" cy="72" r="1.2"/><circle cx="130" cy="72" r="1.2"/></g>
      <path d="M60 84 Q100 72 140 84 Q118 78 100 78 Q82 78 60 84 Z" fill="#ffffff" opacity="0.14"/>`;
  }

  // Boucles : couronne en festons (bords en arcs), volume rond au-dessus du front.
  if (p.coiffe === 'boucles') {
    return `
      <path d="M40 108 C36 52 66 32 100 32 C134 32 164 52 160 108
               Q156 96 148 96 Q150 84 138 84 Q140 74 128 76 Q130 66 116 70
               Q118 60 104 66 Q100 58 92 68 Q86 62 80 72 Q72 68 68 80
               Q58 78 56 90 Q46 90 44 100 Q42 104 40 108 Z" fill="url(#hair${s})"/>
      <g fill="${p.cheveux2}" opacity="0.4"><circle cx="72" cy="74" r="8"/><circle cx="94" cy="64" r="9"/><circle cx="118" cy="66" r="8"/><circle cx="136" cy="80" r="7"/></g>
      <g fill="#ffffff" opacity="0.16"><circle cx="86" cy="58" r="4"/><circle cx="108" cy="56" r="4"/><circle cx="128" cy="64" r="3.5"/></g>`;
  }

  // Ondulé : couronne balayée avec vaguelettes sur le bord haut.
  const couronne = p.coiffe === 'ondules'
    ? `<path d="M42 106
              C38 54 66 34 100 34 C136 34 164 54 158 106
              Q152 92 146 96 Q142 82 134 88 Q130 76 120 84 Q116 72 106 80
              Q100 70 94 80 Q88 74 80 84 Q72 78 66 88 Q58 84 54 94 Q48 92 42 106 Z" fill="url(#hair${s})"/>
       <path d="M42 106 C45 62 64 44 92 40 C72 54 60 78 60 100 C54 88 46 94 42 106 Z" fill="${p.cheveux2}" opacity="0.42"/>
       <path d="M58 66 Q100 48 142 66 Q118 58 100 58 Q80 58 58 66 Z" fill="#ffffff" opacity="0.32"/>`
    : `<path d="M42 104
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
       <path d="M42 104 C45 62 64 44 92 40 C72 52 60 76 60 98 C54 86 46 92 42 104 Z" fill="${p.cheveux2}" opacity="0.45"/>
       <path d="M58 62 Q100 42 142 62 Q118 52 100 52 Q80 52 58 62 Z" fill="#ffffff" opacity="0.34"/>
       <path d="M74 49 Q94 41 114 46 Q98 45 86 51 Q79 49 74 49 Z" fill="#ffffff" opacity="0.44"/>`;

  return `
    ${meches}
    <!-- ombre portée de la frange sur le front -->
    <path d="M56 78 Q100 94 144 78 Q138 66 100 68 Q62 66 56 78 Z" fill="#00000014"/>
    ${couronne}`;
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
export function avatarSVG(p, uid = '', opts = {}) {
  const s = uid ? `-${uid}` : '';
  const entier = !!opts.entier; // corps complet (debout, avec les pieds)
  const masc = p.sexe === 'h'; // rendu masculin : mâchoire carrée, pas de cils/blush/lèvres
  // Un œil manga complet, paramétré par le centre x (miroir pour l'autre œil).
  // Version masculine : œil plus sobre (pas de longs cils, paupière plus fine).
  // Œil « manga dessiné main » : blanc arrondi, grand iris ROND ambré cerné
  // d'encre, pupille ronde, un reflet franc, paupière haute à l'encre épaisse.
  const oeil = (cx, dir) => {
    const o = -dir; // sens « vers l'extérieur » : gauche→-1, droite→+1
    const G = dir > 0 ? 'G' : 'D';
    return `
      <!-- blanc de l'œil (grand, ouvert, légèrement crème) -->
      <path d="M${cx - 15} 112 Q${cx - 14} 102 ${cx} 102 Q${cx + 14} 102 ${cx + 15} 112 Q${cx + 14} 126 ${cx} 127 Q${cx - 14} 126 ${cx - 15} 112 Z" fill="#fbfaf5"/>
      <g clip-path="url(#clip${G}${s})">
        <g id="iris${G}${s}">
          <!-- grand iris ROND, remonte sous la paupière -->
          <circle cx="${cx}" cy="114" r="11.5" fill="${p.iris}"/>
          <circle cx="${cx}" cy="114" r="11.5" fill="url(#irisSheen${s})"/>
          <!-- cerne d'encre (trait d'iris dessiné) -->
          <circle cx="${cx}" cy="114" r="11.5" fill="none" stroke="#00000055" stroke-width="1.5"/>
          <!-- pupille ronde -->
          <circle cx="${cx}" cy="114.5" r="4.6" fill="#140c08"/>
          <!-- reflet franc unique + petite étincelle -->
          <circle cx="${cx - 3.5}" cy="110" r="3" fill="#fff"/>
          <circle cx="${cx + 4}" cy="118" r="1.3" fill="#fff" opacity="0.75"/>
        </g>
      </g>
      <!-- paupière haute : trait d'encre épais + coins marqués -->
      <path d="M${cx - 16} 110 Q${cx - 14} 100 ${cx} 100 Q${cx + 14} 100 ${cx + 16} 110" fill="none" stroke="#20140d" stroke-width="${masc ? 3.6 : 3.4}" stroke-linecap="round"/>
      <path d="M${cx + o * 16} 110 q${o * 3} -2 ${o * 6} -1" fill="none" stroke="#20140d" stroke-width="2.6" stroke-linecap="round"/>
      ${masc ? '' : `<!-- une pointe de cil au coin externe -->
      <path d="M${cx + o * 15} 105 q${o * 4} -1 ${o * 8} -4" fill="none" stroke="#20140d" stroke-width="2" stroke-linecap="round"/>`}
      <!-- pli sous l'œil (dessiné main) -->
      <path d="M${cx - 9} 129 Q${cx} 132 ${cx + 9} 129" fill="none" stroke="#c98f78" stroke-width="1.3" opacity="0.5" stroke-linecap="round"/>`;
  };
  const lunettes = p.lunettes
    ? `<g stroke="#20242c" stroke-width="2.6" fill="#ffffff10">
         <rect x="52" y="100" width="40" height="30" rx="12"/>
         <rect x="108" y="100" width="40" height="30" rx="12"/>
         <path d="M92 114 h16" fill="none"/><path d="M52 110 l-10 -3" fill="none"/><path d="M148 110 l10 -3" fill="none"/>
       </g>`
    : '';
  // Barbe courte : bandeau qui suit la mâchoire (des pattes au menton) + moustache,
  // en laissant la bouche dégagée. Se relie aux cheveux au niveau des tempes.
  const barbe = p.barbe
    ? `<g>
         <path d="M56 118 Q56 152 78 172 Q90 182 100 184 Q110 182 122 172 Q144 152 144 118
                  Q138 142 122 150 Q116 158 100 160 Q84 158 78 150 Q62 142 56 118 Z" fill="url(#hair${s})"/>
         <path d="M56 118 Q60 144 74 154 Q66 140 62 120 Z" fill="${p.cheveux2}" opacity="0.5"/>
         <path d="M82 139 Q100 133 118 139 Q108 145 100 145 Q92 145 82 139 Z" fill="url(#hair${s})"/>
         <path d="M92 156 Q100 160 108 156 Q100 166 92 156 Z" fill="${p.cheveux2}" opacity="0.6"/>
       </g>`
    : '';
  // Bas du corps (uniquement en mode « entier ») : debout, blouse + pantalon +
  // chaussures, pour voir le prof en pied.
  // Une chaussure propre (corps + semelle claire + lacet + reflet), orientée
  // vers l'extérieur (flip pour le pied gauche).
  const chaussure = (cx, flip) =>
    `<g transform="translate(${cx} 0) scale(${flip ? -1 : 1} 1)">` +
      `<ellipse cx="1" cy="461" rx="17" ry="4" fill="#00000026"/>` +
      `<path d="M-8 443 Q-16 444 -17 452 Q-17 459 -8 460 L12 460 Q19 459 18 451 Q16 444 5 443 Q-2 442 -8 443 Z" fill="#2b2f38"/>` +
      `<path d="M-18 458 L18 458 Q19 462 13 462 L-14 462 Q-19 462 -18 458 Z" fill="#e9e6df"/>` +
      `<path d="M-8 447 Q2 445 12 448" stroke="#00000033" stroke-width="1.2" fill="none"/>` +
      `<ellipse cx="0" cy="450" rx="6" ry="2.4" fill="#ffffff" opacity=".12"/>` +
    `</g>`;
  const basCorps = entier ? `
    <g id="jambes${s}">
      <!-- deux jambes distinctes avec un écart net -->
      <path d="M79 344 L76 442 Q76 449 84 449 L94 449 Q98 449 98 441 L98 344 Z" fill="#2b3a56"/>
      <path d="M102 344 L102 441 Q102 449 106 449 L116 449 Q124 449 124 442 L121 344 Z" fill="#2b3a56"/>
      <!-- reflet clair sur le devant + ourlet -->
      <rect x="82" y="352" width="3.5" height="88" rx="1.75" fill="#ffffff" opacity=".08"/>
      <rect x="108" y="352" width="3.5" height="88" rx="1.75" fill="#ffffff" opacity=".08"/>
      <path d="M76 445 H98 M102 445 H124" stroke="#1c2740" stroke-width="1.8"/>
      ${chaussure(86, true)}${chaussure(114, false)}
    </g>
    <path d="M34 240 Q32 322 56 366 Q100 382 144 366 Q168 322 166 240 Z" fill="url(#coat${s})"/>
    <path d="M84 238 Q84 274 100 282 Q116 274 116 238 Z" fill="${p.tenue}"/>
    <path d="M100 282 L95 366 M100 282 L105 366" stroke="#00000010" stroke-width="1.5" fill="none"/>
    <circle cx="100" cy="302" r="2.6" fill="#c9d2e0"/><circle cx="100" cy="324" r="2.6" fill="#c9d2e0"/><circle cx="100" cy="346" r="2.6" fill="#c9d2e0"/>
    <path d="M56 332 h22 v20 h-22 Z" fill="#00000010"/><path d="M124 332 h22 v20 h-22 Z" fill="#00000010"/>
  ` : '';
  return `
<svg viewBox="0 0 200 ${entier ? 468 : 240}" class="visage${entier ? ' visage-entier' : ''}" role="img" aria-label="Avatar de ${p.nom}">
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
    <clipPath id="clipG${s}"><path d="M59 112 Q60 102 74 102 Q88 102 89 112 Q89 126 74 127 Q59 126 59 112 Z"/></clipPath>
    <clipPath id="clipD${s}"><path d="M111 112 Q112 102 126 102 Q140 102 141 112 Q141 126 126 127 Q111 126 111 112 Z"/></clipPath>
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
    ${basCorps}
  </g>

  <!-- Tête (inclinaison/rebond via #visageG) -->
  <g id="visageG${s}">
    ${cheveuxArriere(p, s)}
    <!-- oreilles -->
    <path d="M44 108 Q36 110 38 122 Q40 132 50 130 Z" fill="${p.peau}"/>
    <path d="M156 108 Q164 110 162 122 Q160 132 150 130 Z" fill="${p.peau}"/>
    <path d="M46 114 Q42 116 44 124" fill="none" stroke="#00000022" stroke-width="1.4"/>
    <path d="M154 114 Q158 116 156 124" fill="none" stroke="#00000022" stroke-width="1.4"/>
    <!-- visage : ovale fin (femme) ou mâchoire large et carrée (homme) -->
    ${(() => {
      const vd = masc
        ? 'M48 102 C48 60 70 46 100 46 C130 46 152 60 152 102 C152 128 148 148 134 164 C124 176 112 184 100 184 C88 184 76 176 66 164 C52 148 48 128 48 102 Z'
        : 'M50 104 C50 64 72 50 100 50 C128 50 150 64 150 104 C150 134 138 158 118 172 C110 179 104 183 100 184 C96 183 90 179 82 172 C62 158 50 134 50 104 Z';
      return `<path d="${vd}" fill="${p.peau}"/><path d="${vd}" fill="url(#skin${s})"/>` +
             `<path d="${vd}" fill="none" stroke="#7a4a34" stroke-width="1.5" opacity="0.5"/>`;
    })()}
    <!-- ombres de mâchoire / pommettes -->
    ${masc
      ? `<path d="M70 162 Q100 176 130 162 Q116 174 100 176 Q84 174 70 162 Z" fill="#00000014"/>
         <path d="M62 138 Q66 156 78 166 Q68 150 66 132 Z" fill="#00000010"/>
         <path d="M138 138 Q134 156 122 166 Q132 150 134 132 Z" fill="#00000010"/>`
      : `<path d="M78 166 Q100 178 122 166 Q112 176 100 178 Q88 176 78 166 Z" fill="#00000010"/>
         <path d="M54 108 Q52 130 66 146 Q58 126 60 108 Z" fill="#00000008"/>`}

    <!-- rougeur douce + hachures diagonales (marque « aquarelle » dessinée main) -->
    <ellipse cx="72" cy="133" rx="9" ry="5" fill="#f0917a" opacity="0.16"/>
    <ellipse cx="128" cy="133" rx="9" ry="5" fill="#f0917a" opacity="0.16"/>
    <g stroke="#e07d63" stroke-width="1.5" stroke-linecap="round" opacity="0.42">
      <path d="M64 130 l9 -3"/><path d="M65 134 l9 -3"/><path d="M66 138 l8 -3"/>
      <path d="M136 130 l-9 -3"/><path d="M135 134 l-9 -3"/><path d="M134 138 l-8 -3"/>
    </g>
    <circle id="joueG${s}" cx="70" cy="132" r="11" fill="url(#joueGrad${s})" opacity="0"/>
    <circle id="joueD${s}" cx="130" cy="132" r="11" fill="url(#joueGrad${s})" opacity="0"/>

    <g id="oeilG${s}">${oeil(74, 1)}</g>
    <g id="oeilD${s}">${oeil(126, -1)}</g>

    <!-- sourcils : épais et droits (homme) / arqués et fins (femme) -->
    <path id="sourcilG${s}" d="${masc ? 'M57 86 Q74 81 91 85' : 'M59 84 Q74 77 90 82'}" stroke="${p.cheveux}" stroke-width="${masc ? 4 : 2.4}" fill="none" stroke-linecap="round" opacity="0.92"/>
    <path id="sourcilD${s}" d="${masc ? 'M109 85 Q126 81 143 86' : 'M110 82 Q126 77 141 84'}" stroke="${p.cheveux}" stroke-width="${masc ? 4 : 2.4}" fill="none" stroke-linecap="round" opacity="0.92"/>

    <!-- nez : arête douce, base marquée + petite rougeur (style manga) -->
    <ellipse cx="100" cy="132" rx="7" ry="3.2" fill="#e07d63" opacity="0.16"/>
    <path d="M103 119 Q107 131 100 135" fill="none" stroke="#00000026" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M100 135 q-4 1.5 -6 -0.5" fill="none" stroke="#0000001f" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M100 135 q4 1.5 6 -0.5" fill="none" stroke="#00000016" stroke-width="1.1" stroke-linecap="round"/>

    <!-- bouche : trait sobre (homme) / lèvres fines colorées (femme) -->
    <path id="sourire${s}" d="M84 144 Q100 156 116 144" stroke="${masc ? '#8a5347' : '#c06a5e'}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0"/>
    <ellipse id="bouche${s}" cx="100" cy="146" rx="${masc ? 7 : 7.5}" ry="2.6" fill="${masc ? '#8a5347' : '#c06a5e'}"/>
    <path d="M91 145 q9 4 18 0" stroke="#00000016" stroke-width="1.1" fill="none"/>
    ${masc ? '' : `<path d="M93 150 q7 3 14 0" stroke="#ffffff" stroke-width="1" opacity="0.25" fill="none"/>`}

    ${barbe}
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
