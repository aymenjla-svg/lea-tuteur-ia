// Léa — bibliothèque de « figures » : schémas de physique animés, réutilisables
// et 100 % SVG (aucun asset distant). Chaque figure dessine tout le schéma et
// met en avant une partie selon `focus` (data-foc) → le schéma se CONSTRUIT
// scène après scène. Les animations sont pilotées en CSS (styles.css) et se
// coupent avec prefers-reduced-motion. C'est la partie « qui reste gravée ».

/** Renvoie le SVG d'une figure. id ∈ 'vitesse' | 'poids' | 'ohm'. */
export function figure(id, focus = '') {
  switch (id) {
    case 'vitesse': return figVitesse(focus);
    case 'poids': return figPoids(focus);
    case 'ohm': return figOhm(focus);
    default: return '';
  }
}

// --- Électricité : analogie hydraulique (pile ≈ pompe, R ≈ rétrécissement) ---
function figOhm(focus) {
  const charges = Array.from({ length: 7 }, (_, i) =>
    `<circle class="charge" r="4.2" fill="#ffd54a" style="animation-delay:${(-i * 0.43).toFixed(2)}s"/>`,
  ).join('');
  return `
<svg class="figure fig-ohm" data-foc="${focus}" viewBox="0 0 320 200" role="img" aria-label="Circuit électrique">
  <!-- fil (boucle) -->
  <path class="fil" d="M60 40 H260 Q280 40 280 60 V140 Q280 160 260 160 H60 Q40 160 40 140 V60 Q40 40 60 40 Z"
        fill="none" stroke="#8fa6c4" stroke-width="5" stroke-linejoin="round"/>
  ${charges}
  <!-- pile (pompe) à gauche -->
  <g class="part part-U">
    <rect x="30" y="82" width="20" height="36" rx="3" fill="#0d2740" stroke="#37e0ff" stroke-width="2"/>
    <line x1="40" y1="70" x2="40" y2="82" stroke="#37e0ff" stroke-width="4"/>
    <line x1="34" y1="130" x2="46" y2="130" stroke="#37e0ff" stroke-width="3"/>
    <line x1="40" y1="118" x2="40" y2="130" stroke="#37e0ff" stroke-width="4"/>
    <text class="lab lab-U" x="12" y="104" fill="#37e0ff">U</text>
    <text class="cap" x="40" y="150" text-anchor="middle" fill="#7fa8c8">pompe</text>
  </g>
  <!-- résistance (rétrécissement) à droite -->
  <g class="part part-R">
    <rect x="266" y="76" width="28" height="48" rx="5" fill="#0d2740" stroke="#ff9f43" stroke-width="3"/>
    <text class="lab lab-R" x="298" y="104" fill="#ff9f43">R</text>
    <text class="cap" x="280" y="150" text-anchor="middle" fill="#c58a55">rétréci</text>
  </g>
  <!-- courant (débit) sur le fil du bas -->
  <g class="part part-I">
    <path d="M150 160 l14 0" stroke="#43c463" stroke-width="0" fill="none"/>
    <path class="fleche" d="M132 174 h44 m0 0 l-8 -5 m8 5 l-8 5" fill="none" stroke="#43c463" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <text class="lab lab-I" x="154" y="192" text-anchor="middle" fill="#43c463">I</text>
  </g>
  <!-- loi -->
  <text class="loi" x="160" y="104" text-anchor="middle">U = R × I</text>
</svg>`;
}

// --- Mouvement : une « course », d parcourue en un temps t → v = d/t ---------
function figVitesse(focus) {
  return `
<svg class="figure fig-vitesse" data-foc="${focus}" viewBox="0 0 320 200" role="img" aria-label="Mobile en mouvement">
  <!-- piste -->
  <line x1="24" y1="150" x2="296" y2="150" stroke="#8fa6c4" stroke-width="4"/>
  <g class="part part-d">
    <line x1="40" y1="168" x2="280" y2="168" stroke="#37e0ff" stroke-width="2"/>
    <line x1="40" y1="162" x2="40" y2="174" stroke="#37e0ff" stroke-width="2"/>
    <line x1="280" y1="162" x2="280" y2="174" stroke="#37e0ff" stroke-width="2"/>
    <text class="lab lab-d" x="160" y="190" text-anchor="middle" fill="#37e0ff">d</text>
  </g>
  <!-- mobile (voiture stylisée) -->
  <g class="mobile">
    <rect x="-26" y="122" width="52" height="20" rx="8" fill="#f5b400"/>
    <rect x="-14" y="112" width="26" height="14" rx="6" fill="#ffd166"/>
    <circle cx="-14" cy="144" r="7" fill="#20242c"/>
    <circle cx="12" cy="144" r="7" fill="#20242c"/>
  </g>
  <!-- horloge (temps) -->
  <g class="part part-t" transform="translate(272 44)">
    <circle r="24" fill="#0d2740" stroke="#a855f7" stroke-width="3"/>
    <line class="aiguille" x1="0" y1="0" x2="0" y2="-16" stroke="#a855f7" stroke-width="3" stroke-linecap="round"/>
    <circle r="2.5" fill="#a855f7"/>
    <text class="lab lab-t" x="0" y="42" text-anchor="middle" fill="#a855f7">t</text>
  </g>
  <!-- loi -->
  <text class="loi" x="150" y="60" text-anchor="middle">v = d / t</text>
</svg>`;
}

// --- Poids & masse : même objet, la Terre tire plus fort que la Lune ---------
function figPoids(focus) {
  const astre = (cx, nom, g, cls, long) => `
  <g class="astre ${cls}" transform="translate(${cx} 0)">
    <text class="astre-nom" x="0" y="34" text-anchor="middle">${nom}</text>
    <!-- objet (masse identique) -->
    <rect class="objet part part-masse" x="-22" y="60" width="44" height="34" rx="6" fill="#f5b400" stroke="#c8902c" stroke-width="2"/>
    <text class="objet-m" x="0" y="82" text-anchor="middle">m</text>
    <!-- flèche du poids -->
    <path class="poids-fleche part part-poids" d="M0 100 v ${long} m0 0 l-7 -9 m7 9 l7 -9" fill="none" stroke="#ff5d7d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <text class="lab-g part part-astre" x="0" y="${112 + long + 16}" text-anchor="middle">${g}</text>
  </g>`;
  return `
<svg class="figure fig-poids" data-foc="${focus}" viewBox="0 0 320 200" role="img" aria-label="Poids sur la Terre et la Lune">
  ${astre(90, 'Terre', 'g = 10 N/kg', 'terre', 44)}
  ${astre(232, 'Lune', 'g = 1,6 N/kg', 'lune', 14)}
  <line x1="160" y1="20" x2="160" y2="180" stroke="#2a3f56" stroke-width="1.5" stroke-dasharray="4 5"/>
  <text class="loi" x="160" y="196" text-anchor="middle">P = m × g</text>
</svg>`;
}
