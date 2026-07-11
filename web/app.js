// Léa — client web (front modulaire « prof devant toi »).
// Accueil = choix d'un MODULE (avec % d'avancement). Leçon = le prof écrit la
// consigne au tableau, la LIT (voix), et sa parole s'affiche en SOUS-TITRES.
// Le moteur tourne embarqué (window.LeaEngine) ou via l'API HTTP. L'avatar
// n'émet que des signaux synthétiques — jamais de caméra (§1.4). L'expression
// est imposée par le déterministe (A1).

import { PERSONAS, MATIERE, personaParId, avatarSVG } from './personas.js';
import { soulEffectif } from './souls.js';
import { charteEffective } from './charte.js';
import { voix } from './voix.js';
import { MODULES, chargerProgress, majProgress, progressModule } from './modules.js';
import { COURS, verifierCheckpoint } from './cours.js';
import { exosDuModule } from './exos.js';
import { figure } from './figures.js';
import { enregistrerReponse, ERREUR_LIB } from './suivi.js';
import { lireA11y, appliquerA11y, definirA11y } from './accessibilite.js';
import {
  NIVEAUX, niveauCourant, definirNiveau, appliquerVibe,
  xp, ajouterXp, niveauJeu, progNiveauJeu, majSerie, serie, etoiles,
} from './jeu.js';
import { poserQuestion, tuteurConfigure, testerTuteur } from './tuteur-llm.js';
import {
  lireProfil, profilExiste, creerProfil, enregistrerVisite, memoriserModule, joursDepuis,
} from './profil.js';
import {
  salutRetour, reprise, introCours, clotureCours, felicite, courage, auRevoir, genrer,
} from './humain.js';

const $ = (s) => document.querySelector(s);
const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const EMBARQUE = typeof window !== 'undefined' && window.LeaEngine;

// Config visuelle par expression (A1).
const EXPR = {
  idle:        { browY: 0,  smile: 0,  cheeks: 0,   tilt: 0,  eye: 1,    sparkle: 0, sweat: 0, bulle: 0 },
  listening:   { browY: -1, smile: 0,  cheeks: 0,   tilt: 3,  eye: 1.05, sparkle: 0, sweat: 0, bulle: 0 },
  speaking:    { browY: 0,  smile: 0,  cheeks: 0,   tilt: 0,  eye: 1,    sparkle: 0, sweat: 0, bulle: 0 },
  thinking:    { browY: -2, smile: 0,  cheeks: 0,   tilt: 4,  eye: 0.9,  sparkle: 0, sweat: 0, bulle: 1 },
  happy:       { browY: -2, smile: 1,  cheeks: 0.4, tilt: 0,  eye: 1,    sparkle: 0, sweat: 0, bulle: 0 },
  encouraging: { browY: -2, smile: 1,  cheeks: 0.3, tilt: 4,  eye: 1,    sparkle: 0, sweat: 0, bulle: 0 },
  surprised:   { browY: -4, smile: 0,  cheeks: 0,   tilt: 0,  eye: 1.25, sparkle: 0, sweat: 0.6, bulle: 0 },
  concerned:   { browY: 2,  smile: -1, cheeks: 0,   tilt: -5, eye: 0.95, sparkle: 0, sweat: 1, bulle: 0 },
  celebrate:   { browY: -3, smile: 1,  cheeks: 0.9, tilt: 0,  eye: 1.1,  sparkle: 1, sweat: 0, bulle: 0 },
};

const CLE_PROF = 'lea.prof.v1';

let persona = personaParId(localStorage.getItem(CLE_PROF) ?? '');
let moduleActuel = null;
let sessionId = null;
let parleJusqua = 0;
let expression = 'idle';
let celebreJusqua = 0;
let attente = false;
let voixActive = false;
let micActif = false;
let micHandle = null;
let stFallback = 0;
// Cours (lecteur de scènes) : 'cours' (leçon animée) ou 'exos' (série moteur).
let mode = 'exos';
let coursScenes = [];
let coursFigureId = '';
let sceneIdx = 0;
let checkpointOk = true;
const cpFaits = new Set();
let etatExo = null;      // dernier état moteur (pour « lever la main » en exercice)
// Tableau progressif : le schéma persiste et se CONSTRUIT au fil des scènes.
let figureRendue = '';   // figure actuellement dessinée dans #figureHost
let etapeMax = 0;        // plus haute étape déjà révélée (le tableau n'efface pas)
// À quelle étape du schéma correspond chaque « focus » de scène (par figure).
// Le tableau se remplit dans cet ordre, comme un prof qui dessine.
const ETAPE_PAR_FOCUS = {
  vitesse: { mobile: 1, d: 2, t: 3, vitesse: 4 },
  poids: { masse: 1, astre: 2, poids: 3, relation: 4 },
  ohm: { circuit: 1, U: 2, I: 3, R: 4, loi: 5 },
  etats: { etats: 3, changements: 4 },
  matiere: { bloc: 1, masse: 2, volume: 3, relation: 4 },
  energie: { puissance: 4, tension: 2, intensite: 3, loi: 5 },
  signaux: { distance: 3, temps: 4, vitesse: 5 },
};
// Quand Léa PARLE d'une notion, elle « pointe » la bonne partie du schéma :
// on repère un mot-clé dans sa réponse → on allume le focus correspondant.
const MOTS_FOC = {
  ohm: [[/résistance|ohm|frein|rétréci/i, 'R'], [/tension|volt|pile|pompe/i, 'U'], [/courant|intensité|amp[eè]re|débit/i, 'I'], [/loi d.ohm|u *= *r|relation/i, 'loi']],
  vitesse: [[/distance|chemin|m[eè]tre|kilom/i, 'd'], [/temps|dur[eé]e|heure|seconde|horloge/i, 't'], [/vitesse|rapide|v *= *d/i, 'vitesse']],
  poids: [[/masse|kilo|balance/i, 'masse'], [/poids|newton|force|attire/i, 'poids'], [/terre|lune|pesanteur|\bg\b/i, 'astre'], [/p *= *m|relation/i, 'relation']],
  matiere: [[/volume|cm.?3|place/i, 'volume'], [/masse|gramme|balance/i, 'masse'], [/masse volumique|densit|rh[oô]|flotte|coule/i, 'relation']],
  etats: [[/fusion|vaporis|solidif|liqu[eé]fa|changement|fond|bout/i, 'changements'], [/solide|liquide|gaz|[eé]tat/i, 'etats']],
  energie: [[/puissance|watt|radiateur/i, 'puissance'], [/tension|volt/i, 'tension'], [/courant|intensité|amp[eè]re/i, 'intensite'], [/p *= *u|relation/i, 'loi']],
  signaux: [[/temps|dur[eé]e|seconde/i, 'temps'], [/distance|m[eè]tre|kilom/i, 'distance'], [/vitesse|son|lumi[eè]re|340|300/i, 'vitesse']],
};
// Allume la partie du schéma correspondant au concept dont Léa parle.
function souligneConcept(figId, texte) {
  const svg = $('#figureHost')?.querySelector('svg');
  if (!svg || figId !== figureRendue) return;
  for (const [re, foc] of MOTS_FOC[figId] ?? []) {
    if (re.test(texte)) { svg.setAttribute('data-foc', foc); return; }
  }
}
// Bilan de séance (série d'exercices) : alimenté par etat.correction.
let bilan = { total: 0, reussis: 0, erreurs: {} };

/* --- Transport ------------------------------------------------------------ */

async function api(chemin, methode = 'GET', corps) {
  const res = await fetch(chemin, {
    method: methode,
    headers: corps ? { 'content-type': 'application/json' } : undefined,
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erreur || `HTTP ${res.status}`);
  return data;
}
// Difficulté visée (1..4) dérivée de la classe choisie (6ᵉ→3ᵉ) : adapte le
// choix des exercices de la série. Sans classe → pas d'adaptation.
const NIVEAU_DIFFICULTE = { '6e': 1, '5e': 2, '4e': 3, '3e': 4 };
function difficulteClasse() {
  return NIVEAU_DIFFICULTE[niveauCourant()?.id] ?? undefined;
}
async function moteurCreer(objectifId) {
  const niv = difficulteClasse();
  return EMBARQUE
    ? window.LeaEngine.creerSession(objectifId, niv)
    : api('/sessions', 'POST', { objectif_id: objectifId, niveau_cible: niv });
}
async function moteurRepondre(texte) {
  return EMBARQUE
    ? window.LeaEngine.repondre(sessionId, texte)
    : api(`/sessions/${sessionId}/repondre`, 'POST', { texte });
}

/* --- Accueil (modules) ---------------------------------------------------- */

// Accent néon signature : cyan sur l'accueil, couleur du module en leçon.
function theme(couleur) {
  document.documentElement.style.setProperty('--neon', couleur);
}
const NEON_DEFAUT = '#37e0ff';

function etoilesMission(pct) {
  const n = etoiles(pct);
  return `<span class="mission-etoiles">${'★'.repeat(n)}<span class="off">${'★'.repeat(3 - n)}</span></span>`;
}

/* --- Stats (HUD) + classe (adaptation à l'âge) --------------------------- */

function construireStats() {
  $('#stats').innerHTML =
    `<span class="chip">🔥 <b>${serie()}</b><small>série</small></span>` +
    `<span class="chip">⭐ <b>${xp()}</b><small>XP</small></span>` +
    `<span class="chip lvl"><b>N${niveauJeu()}</b><small>niv.</small></span>`;
}

function construireNiveauSeg() {
  const seg = $('#niveauSeg');
  const courant = niveauCourant();
  seg.replaceChildren();
  for (const n of NIVEAUX) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = n.id === courant?.id ? 'actif' : '';
    b.style.setProperty('--cn', n.couleur);
    b.innerHTML = `${n.id[0]}<sup>e</sup>`;
    b.addEventListener('click', () => { definirNiveau(n.id); construireAccueil(); });
    seg.append(b);
  }
}

/* --- Hero (hologramme) + choix du prof ----------------------------------- */

// Grand HALL d'école (arrière-plan) : hautes fenêtres en arcade sur la cour,
// colonnes, voûte au plafond, pendule de Foucault. Ciel selon l'heure.
// Salle de sciences (cartoon chaleureux) : tableau vert, portraits, poster,
// bibliothèque + microscope, pendule, aimant, plante, horloge. Palette crème/
// bois/vert. Petite fenêtre à gauche pour la lumière du jour.
function ecoleHallSVG() {
  const h = new Date().getHours();
  const jour = h >= 6 && h < 19;
  const ciel = jour ? '#bfe3f5' : '#26386a';
  const dehors = jour
    ? '<rect x="12" y="104" width="32" height="22" fill="#7cc481"/><circle cx="20" cy="86" r="5" fill="#fff3b0"/><circle cx="34" cy="110" r="6" fill="#4fa85f"/>'
    : '<rect x="12" y="104" width="32" height="22" fill="#20402a"/><circle cx="38" cy="84" r="4" fill="#eef2ff"/>';
  return '<svg class="sp-hall" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
    '<defs>' +
      '<linearGradient id="spWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e8d3"/><stop offset="1" stop-color="#e7d8bc"/></linearGradient>' +
      '<linearGradient id="spBoard" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#487a5b"/><stop offset="1" stop-color="#39604a"/></linearGradient>' +
      '<linearGradient id="spWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bd7743"/><stop offset="1" stop-color="#9c5c30"/></linearGradient>' +
    '</defs>' +
    // mur, plafond (bandeau terracotta + néons), plinthe
    '<rect x="0" y="0" width="400" height="300" fill="url(#spWall)"/>' +
    '<rect x="0" y="0" width="400" height="24" fill="#cf7b62"/><rect x="0" y="22" width="400" height="4" fill="#af5f3e"/>' +
    '<g fill="#f9f2e2" opacity=".9"><rect x="72" y="6" width="66" height="10" rx="2"/><rect x="252" y="6" width="66" height="10" rx="2"/></g>' +
    '<rect x="0" y="196" width="400" height="6" fill="#d6c096"/>' +
    // petite fenêtre (lumière du jour) à gauche
    `<rect x="8" y="70" width="40" height="60" rx="2" fill="#a9663e"/><rect x="12" y="74" width="32" height="52" fill="${ciel}"/>${dehors}` +
    '<g stroke="#ecdfc6" stroke-width="2" fill="none"><line x1="28" y1="74" x2="28" y2="126"/><line x1="12" y1="100" x2="44" y2="100"/></g>' +
    // pendule suspendu (oscille) dans le coin gauche
    '<line x1="40" y1="24" x2="66" y2="24" stroke="#9a8a6a" stroke-width="3" stroke-linecap="round"/>' +
    '<g class="sp-swing" style="transform-origin:53px 24px"><line x1="53" y1="24" x2="53" y2="52" stroke="#7d8798" stroke-width="2"/><circle cx="53" cy="56" r="6" fill="#c0553f" stroke="#8a3a2a" stroke-width="1.2"/></g>' +
    // portraits de savants
    '<rect x="60" y="34" width="26" height="30" rx="2" fill="#caa25a"/><rect x="63" y="37" width="20" height="24" fill="#9fb0b8"/><circle cx="73" cy="46" r="5" fill="#e9d6bf"/><path d="M66 61 q7 -8 14 0 z" fill="#6a4a30"/>' +
    '<rect x="92" y="34" width="26" height="30" rx="2" fill="#caa25a"/><rect x="95" y="37" width="20" height="24" fill="#9fb0b8"/><circle cx="105" cy="46" r="5" fill="#e9d6bf"/><path d="M98 61 q7 -8 14 0 z" fill="#8a6a4a"/>' +
    // poster graphique (barres)
    '<rect x="60" y="74" width="58" height="46" rx="2" fill="#f9f2e2" stroke="#caa25a" stroke-width="2"/>' +
    '<g><rect x="66" y="100" width="7" height="14" fill="#e0a83e"/><rect x="76" y="92" width="7" height="22" fill="#4a90d9"/><rect x="86" y="104" width="7" height="10" fill="#d0553f"/><rect x="96" y="96" width="7" height="18" fill="#3fae8f"/><rect x="106" y="88" width="7" height="26" fill="#b06ab3"/></g>' +
    // TABLEAU vert central + craies + molécule + schéma pendule + aimant
    '<rect x="128" y="40" width="150" height="98" rx="4" fill="url(#spWood)"/>' +
    '<rect x="134" y="46" width="138" height="86" rx="2" fill="url(#spBoard)"/>' +
    '<rect x="134" y="46" width="138" height="18" fill="#ffffff" opacity=".05"/>' +
    '<g fill="#eef5ec" font-family="var(--round,sans-serif)" font-weight="700" opacity=".95"><text x="146" y="70" font-size="12">v = d ⁄ t</text><text x="146" y="90" font-size="12">P = m·g</text><text x="146" y="110" font-size="12">U = R·I</text></g>' +
    '<g stroke="#eef5ec" stroke-width="1.4" fill="none" opacity=".85"><circle cx="228" cy="72" r="5"/><circle cx="250" cy="66" r="5"/><circle cx="248" cy="92" r="5"/><line x1="233" y1="70" x2="245" y2="67"/><line x1="230" y1="77" x2="246" y2="88"/></g>' +
    '<g stroke="#eef5ec" stroke-width="1.4" fill="#eef5ec" opacity=".85"><line x1="222" y1="104" x2="246" y2="104"/><line x1="234" y1="104" x2="228" y2="122"/><circle cx="227" cy="124" r="3"/></g>' +
    '<rect x="132" y="132" width="142" height="5" rx="1" fill="#8a4e2a"/><rect x="150" y="133" width="12" height="3" rx="1.5" fill="#f4e9c9"/><rect x="166" y="133" width="10" height="3" rx="1.5" fill="#e6a0a0"/>' +
    '<g transform="translate(196,120)"><path d="M0 16 V6 a8 8 0 0 1 16 0 V16 h-5 V6 a3 3 0 0 0 -6 0 V16 Z" fill="#d0553f"/><rect x="0" y="16" width="5" height="4" fill="#cfd3d8"/><rect x="11" y="16" width="5" height="4" fill="#cfd3d8"/></g>' +
    // horloge
    '<circle cx="356" cy="52" r="13" fill="#f9f2e2" stroke="#a9663e" stroke-width="2.5"/><circle cx="356" cy="52" r="1.6" fill="#3a4048"/><line x1="356" y1="52" x2="356" y2="44" stroke="#3a4048" stroke-width="1.6"/><line x1="356" y1="52" x2="362" y2="52" stroke="#3a4048" stroke-width="1.6"/>' +
    // BIBLIOTHÈQUE (reliures + microscope + verrerie)
    '<rect x="300" y="72" width="72" height="128" rx="2" fill="#8a4e2a"/><rect x="304" y="76" width="64" height="120" fill="url(#spWood)"/>' +
    '<g fill="#8a4e2a"><rect x="304" y="108" width="64" height="4"/><rect x="304" y="146" width="64" height="4"/></g>' +
    '<g><rect x="310" y="82" width="8" height="26" fill="#3fae8f"/><rect x="319" y="82" width="8" height="26" fill="#e0a83e"/><rect x="328" y="82" width="8" height="26" fill="#d0553f"/><rect x="337" y="82" width="8" height="26" fill="#4a90d9"/><rect x="347" y="86" width="16" height="22" fill="#b06ab3"/></g>' +
    '<g fill="#3a4048"><rect x="316" y="138" width="18" height="4" rx="1"/><rect x="320" y="118" width="4" height="20"/><path d="M322 120 q12 -2 12 8 l-4 1 q0 -6 -8 -5 z"/><circle cx="333" cy="130" r="3.5" fill="#7d8798"/></g>' +
    '<path d="M348 122 l-4 16 h12 l-4 -16 z" fill="#a7d8c8" opacity=".75" stroke="#7fb8a8"/><rect x="340" y="126" width="4" height="12" fill="#bcd8e8" opacity=".7"/>' +
    // plante en pot (devant, à droite)
    '<g><rect x="286" y="176" width="22" height="22" rx="2" fill="#c9723f"/><path d="M297 176 q-16 -22 -4 -38 M297 176 q16 -20 6 -38 M297 176 q-2 -26 3 -42" fill="none" stroke="#3f9e5a" stroke-width="5" stroke-linecap="round"/></g>' +
  '</svg>';
}

// Salle commune : TOUS les profs sont présents pour accueillir l'élève. Le prof
// choisi s'avance (mis en avant) ; cliquer sur un prof le sélectionne.
function construireHero() {
  const box = $('#salleProfs');
  if (!box) return;
  box.innerHTML =
    '<div class="sp-mur" aria-hidden="true">' +
      ecoleHallSVG() +
      '<span class="sp-fanion">L’École de Léa</span>' +
    '</div>' +
    '<div class="sp-rang">' +
    PERSONAS.map((p) =>
      `<button type="button" class="sp-prof${p.id === persona.id ? ' actif' : ''}" data-id="${p.id}" style="--accent:${p.accent}" aria-pressed="${p.id === persona.id}" title="${p.nom} — ${p.style}">` +
        `<span class="sp-av">${avatarSVG(p, 'salle-' + p.id, { entier: true })}</span>` +
        `<span class="sp-nom">${p.nom}</span>` +
      '</button>').join('') +
    '</div>';
  for (const b of box.querySelectorAll('.sp-prof')) {
    b.addEventListener('click', () => choisirProf(b.dataset.id));
  }
}

function construireProfChips() {
  const box = $('#profChips');
  box.replaceChildren();
  for (const p of PERSONAS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'prof-chip' + (p.id === persona.id ? ' actif' : '');
    chip.style.setProperty('--accent', p.accent);
    chip.setAttribute('aria-pressed', String(p.id === persona.id));
    chip.innerHTML =
      `<span class="pc-avatar">${avatarSVG(p, 'chip-' + p.id)}</span>` +
      `<span class="pc-nom">${p.nom}</span>` +
      `<span class="pc-style">${p.style}</span>`;
    chip.addEventListener('click', () => choisirProf(p.id));
    box.append(chip);
  }
}

function choisirProf(id) {
  persona = personaParId(id);
  localStorage.setItem(CLE_PROF, persona.id);
  construireHero();
  construireProfChips();
}

/* --- La cour : chaque cours = une porte de classe (décor selon la matière) - */

// Motif discret propre à chaque matière, dessiné dans le vitrail de la porte.
function decorMatiere(id) {
  const svg = (p) => `<svg class="porte-motif" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  switch (id) {
    case 'mouvement': return svg('<path d="M14 66 h58"/><path d="M22 46 h34 M22 54 h48 M22 62 h22" opacity=".65"/><circle cx="60" cy="74" r="7"/><path d="M53 74 h-6"/>');
    case 'poids': return svg('<path d="M50 22 V42"/><path d="M28 42 H72"/><path d="M28 42 l-9 15 h18 z"/><path d="M72 42 l-9 15 h18 z"/><path d="M40 80 h20"/><path d="M50 80 V60"/>');
    case 'electricite': return svg('<path d="M56 18 L34 54 H48 L44 84 L70 44 H54 Z"/>');
    case 'matiere': return svg('<path d="M42 22 V44 L27 74 a7 7 0 0 0 6 10 H67 a7 7 0 0 0 6 -10 L58 44 V22"/><path d="M38 22 h24"/><circle cx="45" cy="68" r="3"/><circle cx="57" cy="62" r="2.4"/>');
    case 'energie': return svg('<rect x="24" y="34" width="42" height="34" rx="5"/><path d="M66 44 h7 v14 h-7"/><path d="M47 40 l-9 15 h10 l-5 13 14 -18 h-10 z"/>');
    case 'signaux': return svg('<circle cx="30" cy="60" r="6"/><path d="M44 46 a20 20 0 0 1 0 28"/><path d="M53 39 a30 30 0 0 1 0 42"/><path d="M62 32 a40 40 0 0 1 0 56" opacity=".7"/>');
    default: return '';
  }
}

// Objets de « salle de classe » propres à chaque matière (déco autour du tableau).
const DECOR_SALLE = {
  mouvement: ['⏱️', '🏁', '🚦'],
  poids: ['⚖️', '🪐', '🍎'],
  electricite: ['💡', '🔌', '🔋'],
  matiere: ['⚗️', '🧊', '💧'],
  energie: ['🔥', '💡', '🔌'],
  signaux: ['🔊', '🌈', '📡'],
};
// Meuble + comptoir (base commune de la paillasse), viewBox 320x96, comptoir ≈ y48.
// Rendu soigné : dégradés (relief), tiroirs biseautés, poignées chromées, plan
// de travail brillant à arête.
function meubleSVG() {
  // Un tiroir de bureau en bois, avec poignée métal.
  const tiroir = (x, y, w, h) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="url(#deskDrw)" stroke="#6e4322" stroke-width="1"/>` +
    `<rect x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="1.6" rx="1" fill="#ffffff" opacity=".22"/>` +
    `<rect x="${x + w / 2 - 10}" y="${y + h / 2 - 2}" width="20" height="4" rx="2" fill="url(#metal)"/>`;
  return `
    <defs>
      <linearGradient id="deskTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a4f"/><stop offset="1" stop-color="#a1652f"/></linearGradient>
      <linearGradient id="deskWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a5652f"/><stop offset="1" stop-color="#7d4a24"/></linearGradient>
      <linearGradient id="deskDrw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bd7a44"/><stop offset="1" stop-color="#9a5c2c"/></linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity=".06"/><stop offset=".3" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".55" stop-color="#ffffff" stop-opacity=".12"/><stop offset="1" stop-color="#bcd6ea" stop-opacity=".24"/></linearGradient>
      <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaeff5"/><stop offset=".5" stop-color="#aab4c2"/><stop offset="1" stop-color="#7d8798"/></linearGradient>
      <radialGradient id="glow" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#fff6c8"/><stop offset="55%" stop-color="#ffd54a"/><stop offset="100%" stop-color="#f0a800"/></radialGradient>
    </defs>
    <!-- ombre au sol -->
    <ellipse cx="160" cy="126" rx="150" ry="3.5" fill="#00000026"/>
    <!-- caissons à tiroirs (gauche + droite) descendant jusqu'au sol -->
    <rect x="8" y="53" width="96" height="62" rx="2" fill="url(#deskWood)"/>
    <rect x="216" y="53" width="96" height="62" rx="2" fill="url(#deskWood)"/>
    <!-- espace pour les jambes au centre (renfoncement sombre) -->
    <rect x="104" y="54" width="112" height="56" fill="#6e4322"/>
    <rect x="110" y="56" width="100" height="52" rx="1" fill="#8a5228"/>
    <!-- pieds -->
    <rect x="16" y="113" width="15" height="13" rx="1" fill="url(#deskWood)"/><rect x="289" y="113" width="15" height="13" rx="1" fill="url(#deskWood)"/>
    <!-- 3 tiroirs par caisson -->
    ${tiroir(16, 58, 80, 15)}${tiroir(16, 76, 80, 15)}${tiroir(16, 94, 80, 15)}
    ${tiroir(224, 58, 80, 15)}${tiroir(224, 76, 80, 15)}${tiroir(224, 94, 80, 15)}
    <!-- plateau du bureau (déborde légèrement) + chant sombre. Surface ≈ y47 :
         c'est LÀ que les objets sont posés (bas des objets ≈ y48). -->
    <rect x="0" y="45" width="320" height="11" rx="2.5" fill="url(#deskTop)"/>
    <rect x="0" y="45.5" width="320" height="1.8" rx="1" fill="#f2d2a4" opacity=".85"/>
    <rect x="0" y="53.4" width="320" height="2.6" fill="#5f3a1c"/>`;
}
// Matériel posé sur le comptoir, PROPRE À CHAQUE MATIÈRE (bas des objets ≈ y48).
// Même finition que l'établi : verre brillant (url(#glass) + reflets), ampoules
// qui rayonnent (url(#glow) + halo), métal chromé (url(#metal)), méniscus.
function objetsMatiere(id) {
  // Halo lumineux réutilisable derrière une source de lumière.
  const halo = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#glow)" opacity=".28"/>`;
  switch (id) {
    case 'electricite':
    case 'energie': return `
      <rect x="26" y="30" width="46" height="18" rx="3" fill="#f2c14e" stroke="#b8912f" stroke-width="1.4"/><rect x="28" y="31.5" width="42" height="3" rx="1.5" fill="#fff" opacity=".55"/><rect x="72" y="35" width="5" height="8" rx="1" fill="url(#metal)"/>
      <text x="33" y="43" font-size="12" fill="#7a5a12" font-weight="700">+</text><text x="56" y="43" font-size="12" fill="#7a5a12">−</text>
      ${halo(112, 30, 15)}<circle cx="112" cy="30" r="10" fill="url(#glow)" stroke="#e6b800" stroke-width="1.4"/><path d="M107 30 h10 M108 25 l8 10" stroke="#c98f00" stroke-width="1" fill="none"/><circle cx="109" cy="27" r="2.4" fill="#fff" opacity=".8"/><rect x="107" y="39" width="10" height="8" rx="1" fill="url(#metal)"/>
      <g stroke="#ffe27a" stroke-width="1.4" opacity=".9"><path d="M112 12 v-4"/><path d="M128 18 l4 -3"/><path d="M96 18 l-4 -3"/></g>
      ${id === 'energie'
        ? `<rect x="158" y="28" width="36" height="20" rx="2" fill="#ff6b3d" stroke="#c1491f" stroke-width="1.4"/><rect x="160" y="29.5" width="32" height="2.4" rx="1.2" fill="#fff" opacity=".4"/><g stroke="#ffcbb0" stroke-width="1.6"><path d="M164 30v16M172 30v16M180 30v16M188 30v16"/></g>`
        : `<g stroke="url(#metal)" stroke-width="2.4"><circle cx="162" cy="46" r="2.5" fill="url(#metal)"/><circle cx="188" cy="46" r="2.5" fill="url(#metal)"/><line x1="162" y1="46" x2="184" y2="33"/></g>`}
      <rect x="214" y="24" width="46" height="24" rx="3" fill="#2e8b74" stroke="#1c5a4a" stroke-width="1.4"/><rect x="216" y="25.5" width="42" height="2.6" rx="1.3" fill="#fff" opacity=".3"/><rect x="219" y="28" width="36" height="9" rx="1" fill="#0e2b1f"/><text x="237" y="35" font-size="7" fill="#8effc0" text-anchor="middle">${id === 'energie' ? '36 W' : '0.3A'}</text><circle cx="237" cy="43" r="3.5" fill="url(#metal)" stroke="#1c5a4a"/>
      <path d="M77 40 q18 7 30 0" fill="none" stroke="#e05050" stroke-width="1.6"/>`;
    case 'mouvement':
    case 'signaux': return id === 'mouvement' ? `
      <path d="M28 48 L112 48 L28 24 Z" fill="url(#metal)" fill-opacity=".85" stroke="#7d8798" stroke-width="1.4"/><path d="M32 46 L104 46 L34 30 Z" fill="#fff" opacity=".12"/>
      <circle cx="72" cy="34" r="7" fill="#f5b400" stroke="#c8902c" stroke-width="1.4"/><circle cx="69.5" cy="31.5" r="2.4" fill="#fff" opacity=".7"/>
      <circle cx="154" cy="34" r="12" fill="#0d2740" stroke="url(#metal)" stroke-width="2"/><rect x="150" y="18" width="8" height="4" rx="1" fill="url(#metal)"/><line x1="154" y1="34" x2="154" y2="26" stroke="#a855f7" stroke-width="2"/><circle cx="154" cy="34" r="1.6" fill="#a855f7"/>
      <rect x="196" y="40" width="100" height="8" rx="1" fill="#ffd24a" stroke="#c9a52f" stroke-width="1"/><rect x="196" y="40.6" width="100" height="1.6" fill="#fff" opacity=".5"/><g stroke="#c9a52f" stroke-width="1">${Array.from({ length: 10 }, (_, i) => `<line x1="${202 + i * 10}" y1="40" x2="${202 + i * 10}" y2="44"/>`).join('')}</g>` : `
      <rect x="30" y="30" width="12" height="18" rx="2" fill="url(#metal)"/><path d="M42 32 L54 25 V48 L42 46 Z" fill="url(#metal)"/><path d="M31 31 v16" stroke="#fff" stroke-width="1.4" opacity=".5"/><g stroke="#ffd54a" stroke-width="1.4" fill="none" opacity=".9"><path d="M60 34 q6 6 0 12"/><path d="M65 30 q10 10 0 20"/></g>
      <path d="M110 48 V34 M110 34 q0 -14 -8 -14 M110 34 q0 -14 8 -14" fill="none" stroke="url(#metal)" stroke-width="2.6"/>
      <path d="M168 48 L182 24 L196 48 Z" fill="url(#glass)" stroke="#bcd4e6"/><path d="M172 46 L182 30 L184 44 Z" fill="#fff" opacity=".18"/><path d="M150 40 l22 -5" stroke="#fff" stroke-width="1.4" opacity=".7"/><g stroke-width="1.5" fill="none"><path d="M198 34 l16 -6" stroke="#ff5d7d"/><path d="M198 39 l18 0" stroke="#ffd24a"/><path d="M198 44 l16 6" stroke="#43c463"/></g>
      <rect x="242" y="24" width="44" height="24" rx="3" fill="#0d2740" stroke="url(#metal)" stroke-width="1.4"/><path d="M247 37 q5 -7 10 0 t10 0 t10 0" fill="none" stroke="#37e0ff" stroke-width="1.4"/>`;
    case 'poids': return `
      <line x1="72" y1="20" x2="72" y2="48" stroke="url(#metal)" stroke-width="3.2"/><line x1="42" y1="22" x2="102" y2="22" stroke="url(#metal)" stroke-width="2.6"/>
      <path d="M42 22 l-9 13 h18 z" fill="url(#glass)" stroke="#8a939f" stroke-width="1.4"/><path d="M102 22 l-9 13 h18 z" fill="url(#glass)" stroke="#8a939f" stroke-width="1.4"/><rect x="60" y="44" width="24" height="4" rx="1" fill="url(#metal)"/>
      <path d="M150 34 h22 l3 14 h-28 z" fill="url(#metal)" stroke="#5f6772" stroke-width="1.2"/><path d="M155 24 h12 l2 10 h-16 z" fill="url(#metal)" stroke="#5f6772" stroke-width="1.2"/><path d="M152 35 h18" stroke="#fff" stroke-width="1" opacity=".5"/>
      <rect x="212" y="18" width="13" height="30" rx="3" fill="url(#glass)" stroke="#bcd4e6" stroke-width="1"/><rect x="213.4" y="20" width="2.4" height="26" rx="1.2" fill="#fff" opacity=".55"/><path d="M212 44 h13" stroke="#7fb5df" stroke-width="1.2" opacity=".6"/><path d="M218 18 v-4" stroke="url(#metal)" stroke-width="1.4"/><g stroke="#c9a52f" stroke-width="1"><path d="M215 26 h7"/><path d="M215 31 h7"/><path d="M215 36 h7"/></g>`;
    default: return `
      <g transform="translate(0,-4)" stroke="#bcd4e6" stroke-width="1">
        <path d="M34 26 L48 26 L50 50 L32 50 Z" fill="url(#glass)"/><path d="M33 38 L49 38 L50 49 L32 49 Z" fill="#58d38b" stroke="none"/><path d="M33.5 38 L48.5 38" stroke="#eafff2" stroke-width="1" opacity=".7"/><rect x="35" y="28" width="2.4" height="20" rx="1.2" fill="#fff" stroke="none" opacity=".5"/>
        <path d="M74 26 L80 26 L80 32 L91 50 L63 50 L74 32 Z" fill="url(#glass)"/><path d="M75 40 L79 40 L87 49 L67 49 Z" fill="#ff6fae" stroke="none"/><path d="M67 49 L87 49" stroke="#ffdcec" stroke-width="1" opacity=".7"/><rect x="76" y="28" width="2" height="16" rx="1" fill="#fff" stroke="none" opacity=".5"/>
        <line x1="120" y1="14" x2="120" y2="50" stroke="url(#metal)" stroke-width="2"/><rect x="110" y="49" width="36" height="3" fill="url(#metal)" stroke="none"/>
        <rect x="130" y="12" width="5" height="13" fill="url(#glass)"/><circle cx="132.5" cy="38" r="11" fill="url(#glass)"/><circle cx="128.5" cy="34.5" r="2.6" fill="#fff" stroke="none" opacity=".65"/>
        <path d="M123 40 a11 11 0 0 0 19 0 z" fill="#a06cff" stroke="none"/><path d="M122.5 40 L142 40" stroke="#e6d8ff" stroke-width="1" opacity=".7"/><path d="M120 19 q16 -7 16 9" fill="none" stroke="url(#metal)" stroke-width="1.6"/>
        <rect x="182" y="22" width="10" height="28" rx="2" fill="url(#glass)"/><rect x="182.7" y="35" width="8.6" height="14.5" rx="1" fill="#ffd24a" stroke="none"/><rect x="183.6" y="24" width="1.8" height="24" rx="1" fill="#fff" stroke="none" opacity=".5"/>
        <rect x="232" y="42" width="56" height="8" rx="2" fill="#8a5a34" stroke="none"/><rect x="232" y="42.6" width="56" height="1.6" fill="#c99368" stroke="none"/>
        <rect x="238" y="26" width="6" height="22" rx="3" fill="url(#glass)"/><rect x="238.6" y="35" width="5" height="12" fill="#4ab8ff" stroke="none"/>
        <rect x="255" y="26" width="6" height="22" rx="3" fill="url(#glass)"/><rect x="255.6" y="32" width="5" height="15" fill="#ff8f5a" stroke="none"/>
        <rect x="272" y="26" width="6" height="22" rx="3" fill="url(#glass)"/><rect x="272.6" y="37" width="5" height="10" fill="#58d38b" stroke="none"/>
      </g>`;
  }
}
function paillasseSVG(id) {
  return `<svg class="paillasse" viewBox="0 0 320 128" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${meubleSVG()}${objetsMatiere(id)}</svg>`;
}
// Décor de la salle de cours, dans l'esprit de la salle commune (classe de
// sciences chaleureuse) : néons au plafond, portraits de savants, poster de la
// matière, horloge — autour du tableau — puis la paillasse sous le tableau.
// Poster mural PROPRE À LA MATIÈRE (pour que chaque salle soit différente).
function posterMatiere(id) {
  const w = (inner) => `<svg class="poster-svg" viewBox="0 0 40 30" aria-hidden="true">${inner}</svg>`;
  switch (id) {
    case 'mouvement': return w('<path d="M5 4 V26 H37" fill="none" stroke="#9aa2ad" stroke-width="1.4"/><polyline points="6,24 15,18 24,13 36,6" fill="none" stroke="#4a90d9" stroke-width="2.4"/><circle cx="36" cy="6" r="2.2" fill="#e0533a"/>');
    case 'poids': return w('<line x1="20" y1="5" x2="20" y2="12" stroke="#8a939f" stroke-width="2"/><line x1="8" y1="9" x2="32" y2="9" stroke="#8a939f" stroke-width="2"/><path d="M8 9 l-3.5 6 h7 z" fill="#cdd3db"/><path d="M32 9 l-3.5 6 h7 z" fill="#cdd3db"/><rect x="16" y="22" width="8" height="3" fill="#8a939f"/><rect x="18.5" y="12" width="3" height="10" fill="#b0b7c0"/>');
    case 'electricite': return w('<circle cx="14" cy="14" r="6" fill="#ffd54a" stroke="#e0a800" stroke-width="1.4"/><rect x="11" y="20" width="6" height="4" fill="#9aa2ad"/><path d="M29 5 l-5 9 h5 l-5 10" fill="none" stroke="#e0a83e" stroke-width="2.4"/>');
    case 'matiere': return w('<circle cx="13" cy="12" r="4" fill="#4a90d9"/><circle cx="26" cy="9" r="4" fill="#e0533a"/><circle cx="24" cy="22" r="4" fill="#3fae8f"/><g stroke="#8a939f" stroke-width="1.6"><line x1="16" y1="13" x2="23" y2="10"/><line x1="15" y1="15" x2="22" y2="20"/></g>');
    case 'energie': return w('<rect x="6" y="10" width="20" height="12" rx="2" fill="#3fae8f"/><rect x="26" y="13" width="3" height="6" fill="#3fae8f"/><path d="M17 6 l-5 9 h5 l-5 10" fill="none" stroke="#ffd54a" stroke-width="2.4"/>');
    case 'signaux': return w('<g fill="none" stroke-width="2.2"><path d="M5 16 h6" stroke="#e0533a"/><path d="M13 16 q3 -8 6 0 t6 0" stroke="#4a90d9"/></g><g fill="none" stroke-width="1.6"><path d="M28 9 a11 11 0 0 1 0 14" stroke="#e0a83e"/><path d="M32 6 a15 15 0 0 1 0 20" stroke="#3fae8f"/></g>');
    default: return w('<rect x="4" y="16" width="5" height="10" fill="#e0a83e"/><rect x="11" y="9" width="5" height="17" fill="#4a90d9"/><rect x="18" y="18" width="5" height="8" fill="#d0553f"/><rect x="25" y="12" width="5" height="14" fill="#3fae8f"/><rect x="32" y="6" width="5" height="20" fill="#b06ab3"/></svg>');
  }
}

function decorSalle(id) {
  const objs = DECOR_SALLE[id] ?? [];
  return `<span class="mur-neon n1"></span><span class="mur-neon n2"></span>` +
    `<span class="obj portrait p1"></span><span class="obj portrait p2"></span>` +
    `<span class="obj poster">${posterMatiere(id)}</span>` +
    (objs[0] ? `<span class="obj mur-obj o1">${objs[0]}</span>` : '') +
    (objs[1] ? `<span class="obj mur-obj o2">${objs[1]}</span>` : '') +
    `<span class="obj horloge">🕐</span>` +
    paillasseSVG(id);
}

function construireModules() {
  const grille = $('#modulesGrille');
  const prog = chargerProgress();
  grille.replaceChildren();
  const actifs = MODULES.filter((m) => !m.verrouille).length;
  $('#modCount').textContent = `${actifs} portes ouvertes · ${MODULES.length - actifs} à venir`;

  // Le prof attend devant la prochaine classe à faire (1er cours non fini).
  const cibleId = (MODULES.find((m) => !m.verrouille && progressModule(m, prog) < 100) || {}).id;
  const prenom = lireProfil()?.prenom;

  MODULES.forEach((m, i) => {
    const pct = progressModule(m, prog);
    const num = String(i + 1).padStart(2, '0');
    const et = m.verrouille ? 0 : etoiles(pct);
    const carte = document.createElement('button');
    carte.type = 'button';
    carte.className = 'porte' + (m.verrouille ? ' verrouille' : '') + (pct > 0 ? ' allumee' : '');
    carte.style.setProperty('--c', m.couleur);
    carte.disabled = !!m.verrouille;
    carte.setAttribute('aria-label', `${m.titre}${m.verrouille ? ' (à venir)' : ` — ${pct}% fait`}`);
    const battant = m.verrouille
      ? `<div class="porte-battant"><span class="porte-lock">🔒</span></div>`
      : `<div class="porte-battant">
           <span class="porte-rai"></span>
           <div class="porte-vitre">${decorMatiere(m.id)}<span class="porte-ico">${m.icone}</span></div>
           <span class="porte-poignee"></span>
         </div>`;
    // Flammes de maîtrise : une allumée par étoile gagnée (0 à 3).
    const flammes = m.verrouille ? '' :
      `<div class="porte-flammes">${[0, 1, 2].map((k) => `<span${k < et ? ' class="on"' : ''}>🔥</span>`).join('')}</div>`;
    // Le guide qui t'accueille devant SA porte.
    const profHtml = m.id === cibleId
      ? `<div class="porte-prof"><span class="porte-bulle">${prenom ? `Par ici, ${prenom} !` : 'On y va ?'}</span><span class="porte-prof-av">${avatarSVG(persona, 'cour-' + m.id)}</span></div>`
      : '';
    carte.innerHTML =
      `<div class="porte-cadre">
         <span class="torche g"></span><span class="torche d"></span>
         <span class="porte-num">${num}</span>
         ${flammes}
         ${battant}
         ${profHtml}
         <span class="porte-base"></span>
       </div>
       <div class="porte-plaque">
         <div class="porte-nom">${m.titre}</div>` +
      (m.verrouille
        ? `<div class="porte-etat">Bientôt</div>`
        : `<div class="porte-bar"><span style="width:${pct}%"></span></div>
           <div class="porte-pied"><span class="porte-pct">${pct}%</span><span class="porte-go">${pct >= 100 ? 'Revoir' : pct > 0 ? 'Reprendre' : 'Entrer'} →</span></div>`) +
      `</div>`;
    if (!m.verrouille) carte.addEventListener('click', () => entrerParPorte(carte, m));
    grille.append(carte);
  });
  majContinuer(prog);
}

function majContinuer(prog = chargerProgress()) {
  const cible = MODULES.find((m) => !m.verrouille && progressModule(m, prog) < 100);
  const btn = $('#continuer');
  if (!cible) { btn.hidden = true; return; }
  const pct = progressModule(cible, prog);
  btn.hidden = false;
  btn.textContent = `${pct > 0 ? 'Reprendre' : 'Lancer'} · ${cible.titre} →`;
  btn.onclick = () => ouvrirModule(cible);
}

function construireAccueil() {
  theme(NEON_DEFAUT); // accent néon signature sur l'accueil
  appliquerVibe();
  construireStats();
  construireNiveauSeg();
  construireHero();
  construireProfChips();
  construireModules();
  afficherAccueilPerso();
}

// Accueil personnalisé : Léa reconnaît l'élève, le salue (voix + texte), varié.
let salutSession = null; // figé pour la session (ne rejoue pas à chaque rendu)
let repriseSession = null;
let salutDit = false;
function afficherAccueilPerso() {
  const p = lireProfil();
  const salut = $('#accueilSalut');
  const h = $('#heroH');
  if (!p) { if (salut) salut.hidden = true; return; }
  if (salutSession === null) {
    salutSession = salutRetour(p.prenom);
    repriseSession = reprise(p.dernierModuleTitre);
  }
  const heure = new Date().getHours();
  const bonjour = heure < 6 ? 'Bonne nuit' : heure < 18 ? 'Bonjour' : 'Bonsoir';
  if (h) h.innerHTML = genrer(`${bonjour} ${p.prenom}, prêt·e à continuer&nbsp;?`, p.sexe);
  const s = serie?.() ?? 0;
  const flamme = s >= 2 ? ` · 🔥 ${s} jours de suite` : '';
  if (salut) {
    salut.hidden = false;
    salut.innerHTML = `<span class="salut-hi">${genrer(salutSession, p.sexe)}${flamme}</span><span class="salut-suite">${genrer(repriseSession, p.sexe)}</span>`;
  }
}

// La voix ne peut démarrer qu'après un geste : au 1er clic, Léa te salue.
// Mais si ce tout premier geste ouvre DÉJÀ un cours (porte, « continuer »…),
// on renonce au salut : le cours parle tout seul, on évite les deux voix
// superposées.
function direSalutRetour(e) {
  if (salutDit || !profilExiste()) return;
  const ouvreCours = e?.target?.closest?.('#modulesGrille, #continuer');
  if (ouvreCours) { salutDit = true; return; } // pas de salut → pas de double voix
  if (!voix.tts || !salutSession) return;
  salutDit = true;
  voixActive = true; majVoixUI();
  voix.parler(pourLaVoix(genrer(`${salutSession} ${repriseSession}`, lireProfil()?.sexe)), { params: paramsVoix() });
}
window.addEventListener('pointerdown', direSalutRetour);

/* --- Accueil interactif « l'École de Léa » (tout premier passage) --------- */

const INTERETS = ['⚽ Sport', '🎮 Jeux vidéo', '🎵 Musique', '🚀 Espace', '🐾 Animaux', '🎨 Dessin', '🔬 Sciences', '🎬 Ciné'];
const onb = { prenom: '', classe: '', interets: [], sexe: '' };
let onbStep = 0;

function onbDire(texte) {
  const t = genrer(texte, onb.sexe);
  $('#onbMsg').textContent = t;
  if (voix.tts) { voixActive = true; voix.parler(pourLaVoix(t), { params: paramsVoix() }); }
}

function onbEtapes() {
  const prof = persona?.nom || 'Léa';
  const profF = persona?.sexe !== 'h';
  return [
    { msg: `Bienvenue dans l’École de Léa ! Moi c’est ${prof}, ${profF ? 'ta prof' : 'ton prof'} de physique. On va faire une super équipe. Prêt·e à faire connaissance ?`, next: 'Commencer →', zone: () => '' },
    { msg: 'Pour commencer… comment tu t’appelles ?', next: 'Suivant', zone: () => `<input id="onbPrenom" class="onb-input" type="text" maxlength="24" placeholder="Ton prénom" aria-label="Ton prénom" value="${onb.prenom}">`, valide: () => (onb.prenom = ($('#onbPrenom')?.value || '').trim()).length > 0 },
    { msg: `Enchanté${profF ? 'e' : ''}, ${onb.prenom || ''} ! Dis-moi, tu es plutôt… ?`, next: 'Suivant', zone: () => `<div class="onb-chips" id="onbSexe">${[['h', 'Un garçon'], ['f', 'Une fille']].map(([v, l]) => `<button type="button" class="onb-chip${onb.sexe === v ? ' on' : ''}" data-s="${v}">${l}</button>`).join('')}</div>`, valide: () => onb.sexe === 'h' || onb.sexe === 'f', sexe: true },
    { msg: `Et tu es en quelle classe, ${onb.prenom || ''} ?`, next: 'Suivant', zone: () => `<div class="onb-chips" id="onbClasses">${NIVEAUX.map((n) => `<button type="button" class="onb-chip${onb.classe === n.id ? ' on' : ''}" data-c="${n.id}" style="--cn:${n.couleur}">${n.label}</button>`).join('')}</div>`, valide: () => !!onb.classe },
    { msg: 'Génial ! Et quand tu n’es pas en cours, qu’est-ce que tu aimes ? (choisis-en autant que tu veux)', next: 'Suivant', zone: () => `<div class="onb-chips" id="onbInterets">${INTERETS.map((it) => `<button type="button" class="onb-chip${onb.interets.includes(it) ? ' on' : ''}" data-i="${it}">${it}</button>`).join('')}</div>`, valide: () => true },
    { msg: `Parfait, ${onb.prenom || ''} ! Une dernière chose : ici, on a le DROIT de se tromper, autant de fois qu’on veut — c’est comme ça qu’on apprend. Allez… bienvenue dans ton école ! 🚀`, next: 'Entrer dans l’école ✨', zone: () => '', fin: true },
  ];
}

function onbRender() {
  const e = onbEtapes()[onbStep];
  $('#onbAvatar').innerHTML = avatarSVG(persona);
  onbDire(e.msg);
  $('#onbZone').innerHTML = e.zone();
  $('#onbNext').textContent = e.next;
  $('#onbDots').innerHTML = onbEtapes().map((_, i) => `<span class="onb-dot${i === onbStep ? ' on' : ''}"></span>`).join('');
  const cl = $('#onbClasses');
  if (cl) cl.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-c]'); if (!b) return;
    onb.classe = b.dataset.c;
    cl.querySelectorAll('.onb-chip').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
  });
  const sx = $('#onbSexe');
  if (sx) sx.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-s]'); if (!b) return;
    onb.sexe = b.dataset.s;
    sx.querySelectorAll('.onb-chip').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
  });
  const it = $('#onbInterets');
  if (it) it.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-i]'); if (!b) return;
    const v = b.dataset.i;
    onb.interets = onb.interets.includes(v) ? onb.interets.filter((x) => x !== v) : [...onb.interets, v];
    b.classList.toggle('on');
  });
  const inp = $('#onbPrenom');
  if (inp) { inp.focus(); inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') $('#onbNext').click(); }); }
}

function onbSuivant() {
  const e = onbEtapes()[onbStep];
  if (e.valide && !e.valide()) {
    $('#onbMsg').classList.add('onb-secoue');
    setTimeout(() => $('#onbMsg').classList.remove('onb-secoue'), 400);
    $('#onbPrenom')?.focus();
    return;
  }
  if (e.fin) { finirOnboarding(); return; }
  onbStep += 1;
  onbRender();
}

function demarrerOnboarding() {
  onbStep = 0;
  $('#onboarding').hidden = false;
  onbRender();
}

function finirOnboarding() {
  voix.interrompre();
  creerProfil({ prenom: onb.prenom, classe: onb.classe, interets: onb.interets, sexe: onb.sexe });
  if (onb.classe) definirNiveau(onb.classe);
  $('#onboarding').hidden = true;
  construireAccueil();
  confettis();
}

$('#onbNext').addEventListener('click', onbSuivant);

/* --- Navigation accueil ↔ leçon ------------------------------------------ */

// La porte s'ouvre en grand sur une lumière chaude, puis on entre dans le cours.
function entrerParPorte(carte, m) {
  if (reduireMouvement) { ouvrirModule(m); return; }
  carte.classList.add('ouvre');
  const flash = document.createElement('div');
  flash.className = 'porte-flash';
  flash.style.setProperty('--c', m.couleur);
  document.body.append(flash);
  requestAnimationFrame(() => flash.classList.add('on'));
  setTimeout(() => ouvrirModule(m), 430);
  setTimeout(() => flash.classList.remove('on'), 640);
  setTimeout(() => { flash.remove(); carte.classList.remove('ouvre'); }, 1000);
}

function ouvrirModule(m) {
  moduleActuel = m;
  salutDit = true;        // on entre en cours : plus de salut d'accueil
  voix.interrompre();     // coupe un éventuel salut en cours → pas de double voix
  memoriserModule(m.id, m.titre); // pour « tu es prêt à reprendre … ? »
  // La salle prend les couleurs et la déco de la matière du cours.
  $('#scene').style.setProperty('--c', m.couleur);
  $('#salleDeco').innerHTML = decorSalle(m.id);
  theme(m.couleur);
  $('#avatarHost').innerHTML = avatarSVG(persona, '', { entier: true }); // prof en pied
  $('#hudTitre').textContent = `${persona.nom} · ${m.titre}`;
  $('#accueil').hidden = true;
  $('#lecon').hidden = false;
  expression = 'happy';
  // « Un prof devant toi » : la voix s'active d'office (le clic = geste qui
  // débloque la synthèse). L'élève peut couper via 🔊.
  if (voix.tts) { voixActive = true; majVoixUI(); }
  // Chaque module commence par son COURS animé (s'il existe), puis la série.
  if (COURS[m.id]) { cpFaits.clear(); ouvrirCours(m); }
  else { lancerExosVaries(m); }
}

function retourAccueil() {
  voix.interrompre();
  mode = 'exos';
  $('#lecon').hidden = true;
  $('#accueil').hidden = false;
  construireAccueil(); // rafraîchit les % de progression
}

/* --- Cours : lecteur de scènes animées ------------------------------------ */

// Pastilles d'unités adaptées à l'unité correcte d'un mini-exo.
const CHIPS_PAR_UNITE = {
  'm/s': ['m/s', 'km/h', 'm', 's'], 'km/h': ['km/h', 'm/s', 'km', 'h'],
  'N': ['N', 'kg', 'g', 'N/kg'], 'V': ['V', 'Ω', 'A', 'W'],
  'g/cm³': ['g/cm³', 'cm³', 'g', 'kg/L'], 'W': ['W', 'V', 'A', 'J'],
};

function ouvrirCours(m) {
  mode = 'cours';
  const c = COURS[m.id];
  const scenes = c?.scenes ?? [];
  const prenom = lireProfil()?.prenom;
  // On encadre le cours de moments HUMAINS : un accueil parlé au début, une
  // clôture chaleureuse à la fin — comme un vrai prof, pas un enchaînement sec.
  const fig0 = scenes[0]?.figure ?? c?.figure;
  const figN = scenes[scenes.length - 1]?.figure ?? c?.figure;
  const intro = {
    titre: 'On se retrouve !', focus: '', stage: 0, figure: fig0, humain: true,
    points: ['Content de te voir 😊', 'Prends ton temps, on est ensemble.'],
    narration: introCours(prenom, m.titre),
  };
  const cloture = {
    titre: 'Bravo, c’est bouclé !', focus: '', stage: 99, figure: figN, humain: true,
    points: ['Tu as tout suivi 👏', 'On peut s’entraîner, ou revoir un point.'],
    narration: clotureCours(prenom, m.titre),
  };
  coursScenes = scenes.length ? [intro, ...scenes, cloture] : scenes;
  coursFigureId = c?.figure ?? '';
  sceneIdx = 0;
  figureRendue = ''; // forcer un tableau vierge qui se (re)construira
  etapeMax = 0;
  appliquerMode();
  rendreScene();
}

function appliquerMode() {
  const cours = mode === 'cours';
  $('#figLabel').textContent = cours ? '◦ Cours — le prof explique' : '◦ Salle d’expérience — en direct';
  $('#coursTitre').hidden = !cours;
  $('#figureHost').hidden = !cours;
  $('#coursPoints').hidden = !cours;
  $('#tableauTexte').hidden = cours;
  $('#tableauFormule').hidden = cours;
  $('#coursNav').hidden = !cours;
  $('#perdu').hidden = cours;
  $('#perdu').textContent = genrer('Je suis perdu·e', lireProfil()?.sexe); // accord élève
  $('#leverMain').hidden = false; // « lever la main » : cours ET exercices
  // Micro « toujours prêt » : présent pendant le COURS si la voix est dispo
  // (et masqué tant que le panneau de saisie est ouvert, pour ne pas se chevaucher).
  syncParleLea();
  $('#revoirCours').hidden = cours || !COURS[moduleActuel?.id];
  $('#pave').style.display = ''; // réaffiche le pavé (masqué par les exos ouverts/QCM)
  if (cours) $('#rejouer').hidden = true;
  else { $('#form').hidden = false; $('#qcmZone').hidden = true; }
}

// Met à jour le tableau : la figure PERSISTE (les animations ne redémarrent
// pas) et se construit étape par étape. Le prof ne réécrit pas tout à chaque
// scène — il ajoute ce qu'il vient d'expliquer et pointe la notion du moment.
function majTableau(sc) {
  const figId = sc.figure ?? coursFigureId;
  const host = $('#figureHost');
  // On ne redessine que si on change de schéma (ex. états → masse volumique).
  if (figId !== figureRendue) {
    host.innerHTML = figure(figId, sc.focus);
    const svg = host.querySelector('svg');
    if (svg) {
      const ns = 'http://www.w3.org/2000/svg';
      const g = document.createElementNS(ns, 'g');
      g.setAttribute('class', 'croquis'); // couche des annotations à la volée
      svg.appendChild(g);
    }
    figureRendue = figId;
    etapeMax = 0;
  }
  const svg = host.querySelector('svg');
  if (!svg) return;
  svg.setAttribute('data-foc', sc.focus ?? ''); // halo sur la notion courante
  // Étape visée par cette scène ; le tableau n'efface pas (cumulatif).
  const cible = sc.stage ?? ETAPE_PAR_FOCUS[figId]?.[sc.focus] ?? etapeMax;
  etapeMax = Math.max(etapeMax, cible);
  for (const el of svg.querySelectorAll('[data-etape]')) {
    el.classList.toggle('revele', Number(el.getAttribute('data-etape')) <= etapeMax);
  }
  effacerCroquis(); // les annotations ad hoc ne survivent pas au changement de scène
}

// --- Couche « croquis » : dessiner au tableau des explications non prévues ---
// Aujourd'hui appelée par le code (ex. réponse à une question type) ; demain
// pilotée par le LLM quand l'élève pose une question imprévisible.
function coucheCroquis() {
  return $('#figureHost')?.querySelector('svg .croquis') ?? null;
}
function effacerCroquis() {
  const c = coucheCroquis();
  if (c) c.innerHTML = '';
}
// prims : liste de primitives SVG { type:'fleche'|'texte'|'trait'|'cercle', ... }
function dessinerCroquis(prims) {
  const c = coucheCroquis();
  if (!c) return;
  const ns = 'http://www.w3.org/2000/svg';
  for (const p of prims ?? []) {
    let el;
    if (p.type === 'texte') {
      el = document.createElementNS(ns, 'text');
      el.setAttribute('x', p.x); el.setAttribute('y', p.y);
      if (p.ancre) el.setAttribute('text-anchor', p.ancre);
      el.setAttribute('class', 'aq');
      el.textContent = p.t ?? '';
    } else if (p.type === 'cercle') {
      el = document.createElementNS(ns, 'circle');
      el.setAttribute('cx', p.x); el.setAttribute('cy', p.y); el.setAttribute('r', p.r ?? 10);
      el.setAttribute('class', 'trace');
      el.style.setProperty('--len', String(2 * Math.PI * (p.r ?? 10)));
    } else if (p.type === 'ellipse') {
      el = document.createElementNS(ns, 'ellipse');
      el.setAttribute('cx', p.x); el.setAttribute('cy', p.y);
      el.setAttribute('rx', p.rx ?? 10); el.setAttribute('ry', p.ry ?? 10);
      el.setAttribute('class', 'trace');
      const rx = p.rx ?? 10, ry = p.ry ?? 10;
      el.style.setProperty('--len', String(Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)))));
    } else { // 'trait' ou 'fleche' → un path
      el = document.createElementNS(ns, 'path');
      el.setAttribute('d', p.d);
      el.setAttribute('class', 'trace');
      el.style.setProperty('--len', String(p.len ?? 300));
    }
    c.appendChild(el);
    // Longueur réelle du tracé (une fois dans le DOM) : évite les traits en
    // pointillés quand le schéma a plusieurs segments (ex. un bonhomme).
    if (el.tagName === 'path') {
      try { const L = el.getTotalLength(); if (L) el.style.setProperty('--len', String(L)); } catch { /* pas mesurable */ }
    }
  }
}

// API du tableau : surface de dessin exposée pour la phase LLM (le prof répond
// à une question imprévisible en dessinant) et pour les tests.
window.LeaTableau = { dessiner: dessinerCroquis, effacer: effacerCroquis, croquis: coucheCroquis };

// Réaction déterministe : sur une mauvaise réponse, le « prof » entoure au
// tableau la relation à utiliser (même geste que le LLM pilotera plus tard).
function entourerRelation(mot = 'utilise cette relation') {
  const svg = $('#figureHost')?.querySelector('svg');
  const loi = svg?.querySelector('.loi.revele') ?? svg?.querySelector('.loi');
  if (!loi) return;
  let b;
  try { b = loi.getBBox(); } catch { return; }
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  effacerCroquis();
  dessinerCroquis([
    { type: 'ellipse', x: cx, y: cy, rx: b.width / 2 + 12, ry: b.height / 2 + 9 },
    { type: 'texte', x: cx, y: b.y + b.height + 20, t: mot, ancre: 'middle' },
  ]);
}

// « Ardoise propre » : le prof EFFACE la figure du cours (ex. la voiture) pour
// ré-expliquer un principe sur un tableau vierge quand l'élève lève la main.
// Même repère que les schémas du cours (viewBox 320×200) → les dessins du LLM
// tombent au bon endroit. On repart au prochain changement de scène.
const ARDOISE = '__ardoise__';
function ardoisePropre() {
  const host = $('#figureHost');
  if (!host) return null;
  const ns = 'http://www.w3.org/2000/svg';
  host.innerHTML = '';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 320 200');
  svg.setAttribute('class', 'figure figure-ardoise');
  svg.setAttribute('data-foc', '');
  const g = document.createElementNS(ns, 'g');
  g.setAttribute('class', 'croquis');
  svg.appendChild(g);
  host.appendChild(svg);
  figureRendue = ARDOISE; // plus la figure du cours → sera reconstruite au besoin
  etapeMax = 0;
  return g;
}
// Remet la figure du cours (celle de la scène courante) après une explication
// sur ardoise — sans re-narrer la scène.
function restaurerFigureCours() {
  if (mode !== 'cours' || figureRendue !== ARDOISE) return;
  const sc = coursScenes[sceneIdx];
  if (sc) majTableau(sc);
}

function rendreScene() {
  const sc = coursScenes[sceneIdx];
  if (!sc) return;
  const cp = sc.checkpoint;
  const q = sc.qcm;
  checkpointOk = (!cp && !q) || cpFaits.has(sceneIdx);

  majTableau(sc);
  $('#coursTitre').textContent = sc.titre;
  const pts = [...sc.points];
  if (cp) pts.push(`<b class="cp-q">${cp.enonce}</b>`);
  if (q) pts.push(`<b class="cp-q">${q.question}</b>`);
  $('#coursPoints').innerHTML = pts.map((p) => `<li>${p}</li>`).join('');

  expression = 'happy';
  $('#qcmZone').hidden = true;
  if (cp) {
    $('#form').hidden = false;
    $('#reponse').value = '';
    construireUnites({ bonne: cp.unite, choix: CHIPS_PAR_UNITE[cp.unite] ?? [cp.unite] });
    uniteObjectifId = null; // la série reconstruira ses propres pastilles
    parler(`${sc.narration} ${cp.enonce}`);
  } else if (q) {
    $('#form').hidden = true;
    $('#unites').hidden = true;
    construireQcm(q);
    parler(`${sc.narration} ${q.question}`);
  } else {
    $('#form').hidden = true;
    $('#unites').hidden = true;
    parler(sc.narration);
  }
  majNavCours();
  majDots();
}

// Rend les options d'un QCM de cours ; si déjà réussi, montre la bonne réponse.
function construireQcm(q) {
  const fait = cpFaits.has(sceneIdx);
  $('#qcmZone').innerHTML = q.options
    .map(
      (o, i) =>
        `<button type="button" class="qcm-opt${fait && o.ok ? ' juste' : ''}" data-idx="${i}"${fait ? ' disabled' : ''}>${o.txt}</button>`,
    )
    .join('');
  $('#qcmZone').hidden = false;
}

function repondreQcm(idx) {
  const q = coursScenes[sceneIdx]?.qcm;
  if (!q || cpFaits.has(sceneIdx)) return;
  const opt = q.options[idx];
  if (!opt) return;
  voix.interrompre();
  const btn = $(`#qcmZone .qcm-opt[data-idx="${idx}"]`);
  if (opt.ok) {
    cpFaits.add(sceneIdx);
    checkpointOk = true;
    expression = 'celebrate';
    celebreJusqua = performance.now() + 1800;
    for (const b of document.querySelectorAll('#qcmZone .qcm-opt')) b.disabled = true;
    btn?.classList.add('juste');
    effacerCroquis();
    majNavCours();
    parler(`${felicite(lireProfil()?.prenom)} ${opt.retour ?? ''}`);
  } else {
    expression = 'encouraging';
    btn?.classList.add('faux');
    entourerRelation('regarde le schéma');
    parler(`${courage(lireProfil()?.prenom)} ${opt.retour ?? ''}`);
  }
}

function repondreCheckpoint(texte) {
  const cp = coursScenes[sceneIdx]?.checkpoint;
  if (!cp || texte.trim() === '') return;
  voix.interrompre();
  const r = verifierCheckpoint(cp, texte);
  if (r.correct) {
    cpFaits.add(sceneIdx);
    checkpointOk = true;
    expression = 'celebrate';
    celebreJusqua = performance.now() + 1800;
    revelerUnite();
    effacerCroquis();
    majNavCours();
  } else {
    expression = 'encouraging';
    entourerRelation();
  }
  const n = lireProfil()?.prenom;
  parler(`${r.correct ? felicite(n) : courage(n)} ${r.message}`);
}

function majNavCours() {
  const dernier = sceneIdx >= coursScenes.length - 1;
  $('#coursPrec').disabled = sceneIdx === 0;
  const suiv = $('#coursSuivant');
  suiv.disabled = !checkpointOk;
  suiv.textContent = dernier ? 'Commencer les exercices →' : 'Suivant →';
}

function majDots() {
  $('#coursDots').innerHTML = coursScenes
    .map((_, i) => `<span class="cdot${i === sceneIdx ? ' actif' : i < sceneIdx ? ' fait' : ''}"></span>`)
    .join('');
}

function passerAuxExos() {
  lancerExosVaries(moduleActuel);
}

/* --- Exercices VARIÉS (QCM conceptuels, comparaisons, « trouve l'erreur »,
   questions ouvertes analysées par le LLM). Remplacent la série purement
   numérique quand le module a une banque (web/exos.js). ---------------------- */
let xv = null; // { m, items, i, reussis, total, repondu, done }

function lancerExosVaries(m) {
  const items = m && exosDuModule(m.id);
  if (!items) { // pas de banque → repli sur la série numérique du moteur
    xv = null; mode = 'exos'; appliquerMode(); demarrer(m.objectifPrincipal); return;
  }
  xv = { m, items, i: 0, reussis: 0, total: items.length, repondu: false, done: false };
  mode = 'exos';
  $('#bilan').hidden = true;
  $('#rejouer').hidden = true;
  appliquerMode();
  rendreExoVarie();
}

function rendreExoVarie() {
  if (!xv) return;
  const it = xv.items[xv.i];
  if (!it) { finExosVaries(); return; }
  xv.repondu = false;
  etatExo = null; // le contexte « lever la main » passera par xv
  expression = 'happy';
  const pct = Math.round((xv.i / xv.total) * 100);
  $('#barre').style.width = pct + '%';
  $('#pct').innerHTML = pct + '&nbsp;%';
  $('#figLabel').textContent = `◦ Exercices · ${xv.i + 1}/${xv.total}`;
  $('#tableauTexte').textContent = it.enonce;
  $('#tableauFormule').textContent = FORMULES[xv.m.objectifPrincipal] ?? '';
  $('#reponse').disabled = false; $('#envoyer').disabled = false; $('#reponse').value = '';
  $('#qcmZone').hidden = it.t !== 'qcm';
  $('#form').hidden = it.t === 'qcm';
  $('#pave').style.display = it.t === 'num' ? '' : 'none';
  if (it.t === 'qcm') {
    construireUnites(null);
    $('#qcmZone').innerHTML = it.options
      .map((o, i) => `<button type="button" class="qcm-opt" data-idx="${i}">${o.txt}</button>`).join('');
  } else if (it.t === 'num') {
    $('#reponse').placeholder = 'Ta réponse…';
    $('#reponse').setAttribute('inputmode', 'decimal');
    construireUnites(it.choixUnite ? { bonne: it.unite, choix: it.choixUnite } : null);
    uniteObjectifId = null;
  } else { // ouvert
    $('#reponse').placeholder = 'Réponds avec tes mots…';
    $('#reponse').setAttribute('inputmode', 'text');
    construireUnites(null);
  }
  parler(it.enonce);
  attente = true;
}

function repondreExoVarieQcm(idx) {
  if (!xv || xv.repondu) return;
  const it = xv.items[xv.i];
  if (it?.t !== 'qcm') return;
  const opt = it.options[idx];
  if (!opt) return;
  voix.interrompre();
  const n = lireProfil()?.prenom;
  const btn = $(`#qcmZone .qcm-opt[data-idx="${idx}"]`);
  if (opt.ok) {
    xv.repondu = true; xv.reussis += 1;
    expression = 'celebrate'; celebreJusqua = performance.now() + 1800;
    for (const b of document.querySelectorAll('#qcmZone .qcm-opt')) b.disabled = true;
    btn?.classList.add('juste');
    parler(`${felicite(n)} ${opt.retour ?? ''}`);
    setTimeout(avancerExoVarie, 1600);
  } else {
    expression = 'encouraging';
    if (btn) { btn.classList.add('faux'); btn.disabled = true; }
    parler(`${courage(n)} ${opt.retour ?? ''}`);
  }
}

async function repondreExoVarieSaisie(texte) {
  if (!xv || xv.repondu) return;
  const it = xv.items[xv.i];
  texte = String(texte ?? '').trim();
  if (!texte) return;
  voix.interrompre();
  const n = lireProfil()?.prenom;
  if (it.t === 'num') {
    const val = parseFloat(texte.replace(',', '.').replace(/\s/g, ''));
    const okUnite = !it.choixUnite || !it.unite || uniteChoisie === it.unite;
    const okVal = Number.isFinite(val) && Math.abs(val - it.valeur) <= (it.tol ?? 0);
    if (okVal && okUnite) {
      xv.repondu = true; xv.reussis += 1;
      expression = 'celebrate'; celebreJusqua = performance.now() + 1800; revelerUnite();
      parler(felicite(n));
      setTimeout(avancerExoVarie, 1400);
    } else {
      expression = 'encouraging';
      parler(`${courage(n)} ${!okVal ? (it.aide ?? 'Refais le calcul, doucement.') : 'Le nombre est bon — vérifie l’unité choisie.'}`);
    }
    return;
  }
  // Question ouverte : le LLM analyse la réponse (formatif → on avance après).
  xv.repondu = true;
  $('#reponse').disabled = true; $('#envoyer').disabled = true;
  $('#soustitre').textContent = 'Laisse-moi lire ta réponse…';
  let retour = '';
  try {
    if (tuteurConfigure()) {
      const prompt = `Exercice : « ${it.enonce} » Réponse de l'élève : « ${texte} ». Dis-lui en 2 phrases maximum si c'est juste, corrige gentiment si besoin, et rappelle l'idée clé. N'attribue aucune note.`;
      const rep = await poserQuestion(prompt, { ...identiteTuteur(), module: xv.m.titre, moduleId: xv.m.id, notion: 'Exercice ouvert', en_exercice: false });
      retour = rep?.reponse || '';
    }
  } catch { /* on retombe sur le corrigé type */ }
  if (!retour) retour = `Bonne réflexion ${n || ''} ! L'essentiel : ${it.attendu}`;
  xv.reussis += 1; // question ouverte = participation (formative)
  expression = 'happy';
  parler(retour);
  setTimeout(avancerExoVarie, 2400);
}

function avancerExoVarie() {
  if (!xv) return;
  xv.i += 1;
  rendreExoVarie();
}

function finExosVaries() {
  if (!xv) return;
  const pct = xv.total ? Math.round((xv.reussis / xv.total) * 100) : 0;
  $('#barre').style.width = '100%'; $('#pct').innerHTML = '100&nbsp;%';
  $('#qcmZone').hidden = true; $('#form').hidden = true; $('#unites').hidden = true;
  $('#pave').style.display = '';
  $('#tableauTexte').textContent = '★ Exercices terminés !';
  $('#tableauFormule').textContent = '';
  if (xv.m) { const gain = majProgress(xv.m.objectifPrincipal, pct); if (gain > 0) ajouterXp(gain); }
  const n = lireProfil()?.prenom;
  $('#bilan').innerHTML =
    `<div class="bilan-score">${xv.reussis} / ${xv.total} réussis</div>` +
    `<div class="bilan-note">${pct >= 80 ? 'Excellent travail 🎉' : pct >= 50 ? 'Bien joué, on progresse 👍' : 'On révise un point et on y revient 💪'}</div>`;
  $('#bilan').hidden = false;
  confettis();
  $('#rejouer').hidden = false;
  attente = false; xv.done = true;
  parler(`${felicite(n)} ${auRevoir(n)}`);
}

/* --- Boucle de leçon ------------------------------------------------------ */

async function demarrer(objectifId) {
  $('#soustitre').textContent = '';
  bilan = { total: 0, reussis: 0, erreurs: {} };
  $('#bilan').hidden = true;
  try {
    const d = await moteurCreer(objectifId);
    sessionId = d.session_id;
    rendre(d.etat);
  } catch (e) {
    $('#soustitre').textContent = 'Connexion au tuteur impossible : ' + e.message;
  }
}

async function repondre(texte) {
  if (!sessionId || texte.trim() === '') return;
  voix.interrompre(); // barge-in : l'élève prend la parole → le prof se tait
  try {
    const d = await moteurRepondre(texte);
    rendre(d.etat);
  } catch (e) {
    $('#soustitre').textContent = 'Oups : ' + e.message;
  }
}

const FORMULES = {
  'obj-vitesse': 'v = d / t', 'obj-vitesse-relation': 'v = d / t',
  'obj-poids': 'P = m × g', 'obj-ohm': 'U = R × I',
  'obj-masse-volumique': 'ρ = m / V', 'obj-puissance': 'P = U × I',
  'obj-signaux': 'v = d / t',
};

// Unités par objectif : la « bonne » (précisée dans l'énoncé) + des pastilles
// proposées avec des pièges classiques (km vs km/h, N vs kg…). La valeur
// envoyée au moteur reste un NOMBRE pur ; l'unité est un auto-contrôle.
const UNITES = {
  'obj-vitesse':          { bonne: 'km/h', choix: ['km/h', 'm/s', 'km', 'h'] },
  'obj-vitesse-relation': { bonne: 'm/s',  choix: ['m/s', 'km/h', 'm', 's'] },
  'obj-poids':            { bonne: 'N',    choix: ['N', 'kg', 'g', 'N/kg'] },
  'obj-ohm':              { bonne: 'V',    choix: ['V', 'Ω', 'A', 'W'] },
  'obj-masse-volumique':  { bonne: 'g/cm³', choix: ['g/cm³', 'cm³', 'g', 'kg/L'] },
  'obj-puissance':        { bonne: 'W',    choix: ['W', 'V', 'A', 'J'] },
  'obj-signaux':          { bonne: 'm/s',  choix: ['m/s', 'km/h', 'm', 's'] },
};
let uniteObjectif = null;   // { bonne, choix } de l'objectif courant
let uniteObjectifId = null; // pour ne reconstruire les pastilles qu'au changement
let uniteChoisie = '';

function construireUnites(spec) {
  const box = $('#unites');
  uniteObjectif = spec ?? null;
  uniteChoisie = '';
  majUniteBadge();
  box.innerHTML = '';
  if (!uniteObjectif) { box.hidden = true; return; }
  box.hidden = false;
  const lib = document.createElement('span');
  lib.className = 'unites-lib';
  lib.textContent = 'Unité';
  box.append(lib);
  for (const u of uniteObjectif.choix) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip-unite';
    b.textContent = u;
    b.dataset.u = u;
    b.addEventListener('click', () => {
      uniteChoisie = uniteChoisie === u ? '' : u;
      for (const el of box.querySelectorAll('.chip-unite')) {
        el.classList.toggle('actif', el.dataset.u === uniteChoisie);
      }
      majUniteBadge();
      $('#reponse').focus();
    });
    box.append(b);
  }
}
function majUniteBadge() {
  const badge = $('#uniteBadge');
  if (uniteChoisie) { badge.textContent = uniteChoisie; badge.hidden = false; }
  else badge.hidden = true;
}
// Après une bonne réponse : révèle la bonne unité (auto-contrôle pédagogique).
function revelerUnite() {
  if (!uniteObjectif) return;
  for (const el of $('#unites').querySelectorAll('.chip-unite')) {
    el.classList.toggle('juste', el.dataset.u === uniteObjectif.bonne);
  }
}

// Petite pluie de confettis (maîtrise d'un module).
function confettis() {
  if (reduireMouvement) return;
  const zone = document.createElement('div');
  zone.className = 'confetti-zone';
  const couleurs = ['#14c8d4', '#43c463', '#f5b400', '#a855f7', '#ff5d7d', '#ffffff'];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    c.style.left = ((i * 97) % 100) + '%';
    c.style.background = couleurs[i % couleurs.length];
    c.style.animationDelay = ((i % 8) * 0.06).toFixed(2) + 's';
    c.style.animationDuration = (2 + (i % 5) * 0.25).toFixed(2) + 's';
    zone.append(c);
  }
  document.body.append(zone);
  setTimeout(() => zone.remove(), 3200);
}

// Bilan de fin de séance : « vu / réussi / à revoir » (honnête, non moralisateur).
function afficherBilan() {
  const b = bilan;
  const pct = b.total ? Math.round((b.reussis / b.total) * 100) : 0;
  const top = Object.entries(b.erreurs).sort((a, c) => c[1] - a[1])[0];
  const errLigne = top
    ? `<div class="bilan-err">À revoir : <b>${ERREUR_LIB[top[0]] ?? top[0]}</b> (${top[1]}×)</div>`
    : `<div class="bilan-err bilan-clean">Aucune erreur — parcours net ✨</div>`;
  $('#bilan').innerHTML =
    `<div class="bilan-titre">Bilan de la séance</div>` +
    `<div class="bilan-stat"><span class="bilan-num">${b.reussis}/${b.total}</span> exercices réussis · ${pct}%</div>` +
    errLigne +
    `<div class="bilan-note">Objectif atteint 🎯 — on le reverra un peu plus tard pour bien l’ancrer.</div>`;
  $('#bilan').hidden = false;
  $('#form').hidden = true;
  $('#unites').hidden = true;
  parler(auRevoir(lireProfil()?.prenom)); // Léa te dit au revoir, comme un humain
}

function rendre(etat) {
  etatExo = etat; // mémorisé pour le contexte du tuteur (« lever la main »)
  const enonce = etat.question_courante?.enonce ?? '';
  const fini = !!etat.termine;

  // Bilan de séance + suivi persistant : on cumule chaque correction.
  if (etat.correction) {
    bilan.total += 1;
    if (etat.correction.correct) bilan.reussis += 1;
    else if (etat.correction.erreur_type_id) {
      const t = etat.correction.erreur_type_id;
      bilan.erreurs[t] = (bilan.erreurs[t] ?? 0) + 1;
    }
    // Trace pour le tableau de bord éducateur (localStorage).
    enregistrerReponse(
      etat.objectif_courant,
      etat.correction.correct,
      etat.correction.erreur_type_id,
    );
  }

  // TABLEAU = la consigne (ce que le prof « écrit ») + la relation en coin.
  if (fini) {
    $('#tableauTexte').textContent = '★ Module réussi !';
    $('#tableauFormule').textContent = '';
    confettis();
    afficherBilan();
  } else {
    $('#tableauTexte').textContent = enonce || FORMULES[etat.objectif_courant] || '';
    $('#tableauFormule').textContent = FORMULES[etat.objectif_courant] ?? '';
  }

  // Le prof DIT texte_tuteur → affiché en SOUS-TITRES (synchronisés à la voix).
  parler(etat.texte_tuteur);

  expression = etat.expression ?? 'idle';
  if (expression === 'celebrate') celebreJusqua = performance.now() + 1800;

  // Mode « pas-à-pas » (décomposition guidée) : bandeau + pastilles adaptées
  // à l'unité de la sous-étape courante.
  const g = etat.guidage;
  $('#figLabel').textContent = g
    ? `◦ Pas à pas · étape ${g.etape}/${g.total}`
    : '◦ Salle d’expérience — en direct';

  // Pastilles d'unités contextuelles (reconstruites au changement d'objectif
  // pour préserver le choix entre deux questions du même objectif).
  if (fini) {
    $('#unites').hidden = true;
  } else if (g) {
    construireUnites(g.unite ? { bonne: g.unite, choix: CHIPS_PAR_UNITE[g.unite] ?? [g.unite] } : null);
    uniteObjectifId = null; // force la reconstruction en sortie de guidage
  } else if (etat.objectif_courant !== uniteObjectifId) {
    uniteObjectifId = etat.objectif_courant;
    construireUnites(UNITES[etat.objectif_courant]);
  }
  if (expression === 'celebrate') revelerUnite();

  const pct = Math.round((etat.maitrise_cible?.probabilite_effective ?? 0) * 100);
  $('#barre').style.width = pct + '%';
  $('#pct').innerHTML = pct + '&nbsp;%';
  // Progression persistée → gain d'XP (1 point de maîtrise = 1 XP).
  if (moduleActuel) {
    const gain = majProgress(moduleActuel.objectifPrincipal, pct);
    if (gain > 0) ajouterXp(gain);
  }

  attente = !fini;
  $('#reponse').disabled = fini;
  $('#envoyer').disabled = fini;
  $('#perdu').disabled = fini;
  $('#rejouer').hidden = !fini;
  if (!fini) $('#reponse').focus();
}

/* --- Parole + sous-titres (A2/A3) ----------------------------------------- */

function majSousTitre(texte, n) {
  const el = $('#soustitre');
  if (el) el.textContent = texte.slice(0, n);
}

// Paramètres de voix du prof courant : sexe (voix navigateur) + timbre neural
// (lecture = décalage de hauteur, voixNeurale = voix serveur si OpenAI).
function paramsVoix() {
  const base = persona?.voix ?? {};
  // Débit réglable : multiplie le débit navigateur (rate) ET la vitesse de
  // lecture neurale (playbackRate). Borné pour rester intelligible.
  const v = Math.min(1.6, Math.max(0.8, Number(lireA11y().vitesseVoix) || 1));
  let lecture = (persona?.voixN?.lecture ?? 1) * v;
  // Sur la voix gratuite, le timbre (grave/aigu) vient de playbackRate. Pour un
  // homme il DOIT rester < 1 : on plafonne pour que le réglage de vitesse ne
  // remonte jamais la voix dans l'aigu (sinon un prof homme sonne « femme »).
  if (persona?.sexe === 'h') lecture = Math.min(lecture, 0.9);
  else if (persona?.sexe === 'f') lecture = Math.max(lecture, 1.02);
  return {
    ...base,
    rate: (base.rate ?? 1) * v,
    sexe: persona?.sexe,
    lecture,
    voixNeurale: persona?.voixN?.openai,
  };
}

// Unités & symboles → mots, POUR LA VOIX seulement (le sous-titre garde « m/s »).
// Évite que la synthèse épelle « M S » au lieu de « mètres par seconde ».
const UNITES_VOIX = {
  km: 'kilomètres', hm: 'hectomètres', dam: 'décamètres', dm: 'décimètres', cm: 'centimètres', mm: 'millimètres', µm: 'micromètres', m: 'mètres',
  kg: 'kilogrammes', mg: 'milligrammes', µg: 'microgrammes', g: 'grammes', t: 'tonnes',
  kL: 'kilolitres', dL: 'décilitres', cL: 'centilitres', mL: 'millilitres', ml: 'millilitres', L: 'litres', l: 'litres',
  min: 'minutes', ms: 'millisecondes', h: 'heures', s: 'secondes',
  kN: 'kilonewtons', N: 'newtons', kW: 'kilowatts', mW: 'milliwatts', W: 'watts',
  kV: 'kilovolts', mV: 'millivolts', V: 'volts', mA: 'milliampères', A: 'ampères',
  kJ: 'kilojoules', J: 'joules', kHz: 'kilohertz', Hz: 'hertz', 'Ω': 'ohms',
};
function pourLaVoix(t) {
  if (!t) return t;
  let s = String(t);
  // 1) Unités composées (avant les simples) — toujours parlées pareil.
  const composes = [
    [/\bkm\s*\/\s*h(?![\p{L}])/giu, ' kilomètres par heure'],
    [/\bm\s*\/\s*s\s*(?:²|2)(?![\p{L}])/giu, ' mètres par seconde carré'],
    [/\bm\s*\/\s*s(?![\p{L}])/giu, ' mètres par seconde'],
    [/\bg\s*\/\s*cm\s*(?:³|3)(?![\p{L}])/giu, ' grammes par centimètre cube'],
    [/\bkg\s*\/\s*m\s*(?:³|3)(?![\p{L}])/giu, ' kilogrammes par mètre cube'],
    [/\bkg\s*\/\s*L(?![\p{L}])/giu, ' kilogrammes par litre'],
    [/\bN\s*\/\s*kg(?![\p{L}])/giu, ' newtons par kilogramme'],
    [/\bkWh(?![\p{L}])/giu, ' kilowattheures'], [/\bWh(?![\p{L}])/giu, ' wattheures'],
  ];
  for (const [re, rep] of composes) s = s.replace(re, rep);
  // 2) Unité juste après un nombre (ex. « 5 m », « 230 V ») — sensible à la casse
  //    pour ne pas confondre avec une lettre de mot. Clés longues d'abord.
  const keys = Object.keys(UNITES_VOIX).sort((a, b) => b.length - a.length).join('|');
  const reNum = new RegExp('(\\d(?:[.,]\\d+)?)\\s*(' + keys + ')(?![\\p{L}])', 'gu');
  s = s.replace(reNum, (_, n, u) => `${n} ${UNITES_VOIX[u] ?? u}`);
  // 3) Symboles isolés.
  s = s.replace(/°C\b/g, ' degrés Celsius').replace(/°/g, ' degrés')
    .replace(/(\d)\s*²/g, '$1 au carré').replace(/(\d)\s*³/g, '$1 au cube')
    .replace(/²/g, ' carré').replace(/³/g, ' cube')
    .replace(/\s*×\s*/g, ' fois ').replace(/\s*÷\s*/g, ' divisé par ')
    .replace(/≈/g, ' environ ').replace(/Ω/g, ' ohms');
  return s.replace(/\s{2,}/g, ' ').trim();
}

function parler(texte) {
  // La voix du prof s'accorde au genre de l'élève (prêt·e → prêt / prête).
  texte = genrer(String(texte ?? ''), lireProfil()?.sexe);
  const texteVoix = pourLaVoix(texte); // « m/s » → « mètres par seconde » (voix)
  const memeTexte = texteVoix === texte; // si inchangé, on garde le sous-titrage mot à mot
  const duree = Math.min(4000, 400 + texte.length * 32);
  parleJusqua = performance.now() + duree;

  if (voixActive && voix.tts) {
    // Sous-titre révélé au fil de la parole (word-boundary), avec filet.
    majSousTitre(texte, 0);
    const est = Math.min(15000, 500 + texte.length * 80);
    voix.parler(texteVoix, {
      params: paramsVoix(),
      onStart: () => { parleJusqua = performance.now() + est; },
      // La révélation mot à mot n'est fiable que si le texte lu = le sous-titre.
      // Quand on a développé des unités, on affiche le sous-titre en entier.
      onBoundary: memeTexte ? (e) => {
        clearTimeout(stFallback);
        majSousTitre(texte, (e.charIndex ?? 0) + (e.charLength ?? 1));
      } : undefined,
      onEnd: () => { parleJusqua = performance.now(); majSousTitre(texte, texte.length); },
    });
    if (!memeTexte) majSousTitre(texte, texte.length);
    clearTimeout(stFallback);
    stFallback = setTimeout(() => {
      if ($('#soustitre')?.textContent === '') majSousTitre(texte, texte.length);
    }, 500);
  } else {
    // Sans voix : le texte reste le sous-titrage (affiché en entier).
    majSousTitre(texte, texte.length);
  }
}

/* --- Voix : boutons ------------------------------------------------------- */

function majVoixUI() {
  const b = $('#voix');
  if (!b) return;
  b.classList.toggle('actif', voixActive);
  b.setAttribute('aria-pressed', String(voixActive));
  b.textContent = voixActive ? '🔊' : '🔇';
  b.title = voixActive ? 'Couper la voix' : 'Activer la voix';
}
function basculerVoix() {
  voixActive = !voixActive;
  majVoixUI();
  if (voixActive) {
    const s = $('#soustitre')?.textContent;
    if (s) parler(s);
  } else {
    voix.interrompre();
  }
}
function majMicUI() {
  const b = $('#micro');
  if (!b) return;
  b.classList.toggle('actif', micActif);
  b.textContent = micActif ? '●' : '🎤';
}
function ecouterMic() {
  if (!voix.stt) return;
  if (micActif) { micHandle?.stop(); return; }
  voix.interrompre();
  micActif = true;
  majMicUI();
  micHandle = voix.ecouter({
    onPartial: (txt) => { $('#reponse').value = txt; },
    onFinal: (txt) => { $('#reponse').value = txt; },
    onEnd: () => {
      micActif = false; majMicUI();
      const v = $('#reponse').value.trim();
      if (v) { $('#reponse').value = ''; repondre(v); }
    },
    onErreur: () => { micActif = false; majMicUI(); },
  });
  if (!micHandle) { micActif = false; majMicUI(); }
}

/* --- Animation de l'avatar ------------------------------------------------ */

let prochainClignement = 1500;
let debutClignement = 0;

function animer(t) {
  const parle = t < parleJusqua && !reduireMouvement;
  if (attente && !parle && t > celebreJusqua && expression !== 'listening') {
    expression = 'listening';
  }
  const cfg = EXPR[expression] ?? EXPR.idle;

  const corps = $('#corps');
  if (corps && !reduireMouvement) {
    corps.setAttribute('transform', `translate(0 ${(Math.sin(t / 1400) * 1.4).toFixed(2)})`);
  }

  const bouche = $('#bouche');
  if (bouche) {
    bouche.setAttribute('ry', (parle ? 2 + 6 * Math.abs(Math.sin(t / 85)) : 2.5).toFixed(2));
  }

  const ig = $('#irisG');
  const idr = $('#irisD');
  if (ig && idr && !reduireMouvement) {
    const dx = Math.sin(t / 1900) * 2.4;
    const dy = Math.cos(t / 2500) * 1.6;
    ig.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
    idr.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
  }

  const oeilG = $('#oeilG');
  const oeilD = $('#oeilD');
  if (oeilG && oeilD) {
    let sy = cfg.eye;
    if (!reduireMouvement) {
      if (t > prochainClignement && debutClignement === 0) debutClignement = t;
      if (debutClignement > 0) {
        const dt = t - debutClignement;
        const k = dt < 60 ? 1 - dt / 60 : dt < 120 ? (dt - 60) / 60 : 1;
        sy = cfg.eye * k;
        if (dt >= 120) { debutClignement = 0; prochainClignement = t + 2400 + Math.abs(Math.sin(t)) * 1600; }
      }
    }
    for (const oeil of [oeilG, oeilD]) {
      oeil.setAttribute('transform', `translate(0 ${(112 * (1 - sy)).toFixed(2)}) scale(1 ${sy.toFixed(3)})`);
    }
  }

  appliquerExpression(t, parle, cfg);
  requestAnimationFrame(animer);
}

function poser(id, attr, val) {
  const el = $('#' + id);
  if (el) el.setAttribute(attr, val);
}

function appliquerExpression(t, parle, cfg) {
  const ang = cfg.smile < 0 ? 10 : 0;
  poser('sourcilG', 'transform', `translate(0 ${cfg.browY}) rotate(${ang} 74 88)`);
  poser('sourcilD', 'transform', `translate(0 ${cfg.browY}) rotate(${-ang} 126 88)`);
  poser('joueG', 'opacity', String(cfg.cheeks));
  poser('joueD', 'opacity', String(cfg.cheeks));

  const montrerSourire = !parle && cfg.smile !== 0;
  poser('sourire', 'opacity', montrerSourire ? '1' : '0');
  poser('sourire', 'd', cfg.smile > 0 ? 'M84 140 Q100 154 116 140' : 'M84 148 Q100 138 116 148');
  poser('bouche', 'opacity', montrerSourire ? '0' : '1');

  poser('goutte', 'opacity', String(cfg.sweat));
  poser('bulle', 'opacity', String(cfg.bulle));
  const et = $('#etincelles');
  if (et) {
    et.setAttribute('opacity', String(cfg.sparkle && !reduireMouvement ? 0.4 + 0.6 * Math.abs(Math.sin(t / 180)) : cfg.sparkle));
  }

  const vg = $('#visageG');
  if (vg) {
    let ty = 0;
    if (expression === 'celebrate' && t < celebreJusqua && !reduireMouvement) {
      ty = -Math.abs(Math.sin(t / 110)) * 5;
    }
    const tilt = reduireMouvement ? 0 : cfg.tilt;
    vg.setAttribute('transform', `translate(0 ${ty.toFixed(2)}) rotate(${tilt} 100 110)`);
  }
}

/* --- Événements ----------------------------------------------------------- */

$('#form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#reponse').value;
  $('#reponse').value = '';
  if (mode === 'cours') repondreCheckpoint(v);
  else if (xv && !xv.done) repondreExoVarieSaisie(v);
  else repondre(v);
});
$('#coursSuivant').addEventListener('click', () => {
  if (!checkpointOk) return;
  if (sceneIdx >= coursScenes.length - 1) passerAuxExos();
  else { sceneIdx++; rendreScene(); }
});
$('#coursPrec').addEventListener('click', () => {
  if (sceneIdx === 0) return;
  sceneIdx--;
  rendreScene();
});
$('#revoirCours').addEventListener('click', () => { if (moduleActuel) ouvrirCours(moduleActuel); });
$('#qcmZone').addEventListener('click', (e) => {
  const b = e.target.closest('.qcm-opt');
  if (!b || b.disabled) return;
  if (xv && mode === 'exos' && !xv.done) repondreExoVarieQcm(Number(b.dataset.idx));
  else repondreQcm(Number(b.dataset.idx));
});
// Pavé numérique tactile (alimente #reponse ; le clavier physique marche aussi).
$('#pave').addEventListener('click', (e) => {
  const b = e.target.closest('.pk');
  if (!b) return;
  const inp = $('#reponse');
  if (inp.disabled) return;
  if (b.dataset.k != null) {
    if (b.dataset.k === ',' && inp.value.includes(',')) return; // une seule virgule
    inp.value += b.dataset.k;
  } else if (b.dataset.act === 'back') {
    inp.value = inp.value.slice(0, -1);
  } else if (b.dataset.act === 'clear') {
    inp.value = '';
  } else if (b.dataset.act === 'sign') {
    inp.value = inp.value.startsWith('-') ? inp.value.slice(1) : '-' + inp.value;
  }
  inp.focus();
});
$('#perdu').addEventListener('click', () => {
  if (xv && !xv.done) { const it = xv.items[xv.i]; parler(`${courage(lireProfil()?.prenom)} ${it?.aide ?? 'Relis bien l’énoncé, et repère la grandeur cherchée.'}`); }
  else repondre('je suis perdu');
});
$('#rejouer').addEventListener('click', () => {
  if (moduleActuel && exosDuModule(moduleActuel.id)) lancerExosVaries(moduleActuel);
  else demarrer(moduleActuel?.objectifPrincipal);
});
$('#retour').addEventListener('click', retourAccueil);
$('#ouvrirProfs').addEventListener('click', () => {
  const pp = $('#profPicker');
  pp.hidden = !pp.hidden;
});

if (voix.tts) {
  $('#voix').hidden = false;
  $('#voix').addEventListener('click', basculerVoix);
  majVoixUI();
}
if (voix.stt) {
  $('#micro').hidden = false;
  $('#micro').addEventListener('click', ecouterMic);
}

/* --- Accessibilité & avis ------------------------------------------------- */

const CLE_AVIS = 'lea.feedback.v1';
function majA11yUI() {
  const s = lireA11y();
  for (const b of document.querySelectorAll('#segTaille button')) {
    b.classList.toggle('actif', b.dataset.taille === s.taille);
  }
  const vv = Number(s.vitesseVoix) || 1;
  for (const b of document.querySelectorAll('#segVitesse button')) {
    b.classList.toggle('actif', Math.abs(Number(b.dataset.vitesse) - vv) < 0.001);
  }
  for (const t of [['tgLecture', 'lecture'], ['tgContraste', 'contraste']]) {
    const el = $('#' + t[0]);
    const on = s[t[1]] === 'on';
    el.classList.toggle('on', on);
    el.querySelector('.etat').textContent = on ? 'Oui' : 'Non';
  }
}
// Config du tuteur IA (« lever la main ») : coller l'URL de la fonction Edge
// sans passer par la console. Stocké sur l'appareil (localStorage).
function majTuteurUI() {
  let url = '', key = '';
  try { url = localStorage.getItem('lea.tuteur.url') || ''; key = localStorage.getItem('lea.tuteur.key') || ''; } catch { /* indispo */ }
  // À défaut de réglage local, on montre la config PARTAGÉE (config.js).
  const partage = !url && !!window.LEA_TUTEUR_URL;
  $('#tuteurUrl').value = url || window.LEA_TUTEUR_URL || '';
  $('#tuteurKey').value = key || window.LEA_TUTEUR_KEY || '';
  $('#tuteurEtat').textContent = tuteurConfigure()
    ? (partage ? '✅ Tuteur connecté pour tout le monde (config partagée).' : '✅ Tuteur connecté — « lever la main » répond en direct.')
    : 'Non connecté : « lever la main » fonctionne en mode hors-ligne.';
}
$('#tuteurSave').addEventListener('click', () => {
  const u = $('#tuteurUrl').value.trim();
  const k = $('#tuteurKey').value.trim();
  try {
    if (u) localStorage.setItem('lea.tuteur.url', u); else localStorage.removeItem('lea.tuteur.url');
    if (k) localStorage.setItem('lea.tuteur.key', k); else localStorage.removeItem('lea.tuteur.key');
  } catch { /* indispo */ }
  majTuteurUI();
});
// « Tester » : appelle vraiment la fonction et affiche le diagnostic exact.
$('#tuteurTest').addEventListener('click', async () => {
  // On enregistre d'abord ce qui est saisi, puis on teste.
  $('#tuteurSave').click();
  $('#tuteurEtat').textContent = '⏳ Test en cours…';
  const r = await testerTuteur();
  $('#tuteurEtat').textContent = r.ok ? r.detail : '❌ ' + r.detail;
});

$('#a11yBtn').addEventListener('click', () => { majA11yUI(); majTuteurUI(); $('#a11yModale').hidden = false; });
$('#segTaille').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  definirA11y({ taille: b.dataset.taille });
  majA11yUI();
});
$('#segVitesse').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  definirA11y({ vitesseVoix: Number(b.dataset.vitesse) });
  majA11yUI();
  // Aperçu audio immédiat : on entend tout de suite la nouvelle vitesse.
  if (voix.tts) { voix.interrompre(); voix.parler('Voilà, je parle à cette vitesse.', { params: paramsVoix() }); }
});
for (const id of ['tgLecture', 'tgContraste']) {
  $('#' + id).addEventListener('click', () => {
    const cle = $('#' + id).dataset.cle;
    const s = lireA11y();
    definirA11y({ [cle]: s[cle] === 'on' ? 'off' : 'on' });
    majA11yUI();
  });
}
$('#ouvrirAvis').addEventListener('click', () => {
  $('#a11yModale').hidden = true;
  $('#avisModale').hidden = false;
});
$('#avisEnregistrer').addEventListener('click', () => {
  const t = $('#avisTexte').value.trim();
  if (!t) return;
  let liste = [];
  try { liste = JSON.parse(localStorage.getItem(CLE_AVIS) ?? '[]') || []; } catch { liste = []; }
  liste.push({ date: new Date().toISOString().slice(0, 16).replace('T', ' '), texte: t });
  try { localStorage.setItem(CLE_AVIS, JSON.stringify(liste)); } catch { /* ignore */ }
  $('#avisTexte').value = '';
  $('#avisEnregistrer').textContent = 'Enregistré ✓';
  setTimeout(() => { $('#avisEnregistrer').textContent = 'Enregistrer'; }, 1500);
});
$('#avisCopier').addEventListener('click', async () => {
  let liste = [];
  try { liste = JSON.parse(localStorage.getItem(CLE_AVIS) ?? '[]') || []; } catch { liste = []; }
  const txt = liste.map((a) => `• [${a.date}] ${a.texte}`).join('\n') || '(aucun avis enregistré)';
  try { await navigator.clipboard.writeText(txt); $('#avisCopier').textContent = 'Copié ✓'; }
  catch { $('#avisTexte').value = txt; $('#avisCopier').textContent = 'Sélectionné'; }
  setTimeout(() => { $('#avisCopier').textContent = 'Copier tout'; }, 1500);
});
for (const el of document.querySelectorAll('[data-fermer]')) {
  el.addEventListener('click', () => {
    $('#' + el.dataset.fermer).hidden = true;
    if (el.dataset.fermer === 'mainModale') restaurerFigureCours();
  });
}
for (const id of ['a11yModale', 'avisModale', 'mainModale']) {
  $('#' + id).addEventListener('click', (e) => {
    if (e.target.id === id) { $('#' + id).hidden = true; if (id === 'mainModale') restaurerFigureCours(); }
  });
}

/* --- « Lever la main » : question libre à Léa (phase LLM) ------------------ */

// Contexte transmis au tuteur : le module, la notion courante, la relation et
// les points déjà vus (ancrage au programme). en_exercice pilote l'anti-spoiler.
// Identité partagée envoyée au tuteur : qui est l'élève (prénom + genre, pour
// un accord et une adresse justes) et QUEL prof répond (nom + personnalité, pour
// que le ton du LLM change selon le prof choisi).
function identiteTuteur() {
  const p = lireProfil();
  return {
    prenom: p?.prenom && p.prenom !== 'toi' ? p.prenom : '',
    sexe: p?.sexe || '',
    prof: persona ? { nom: persona.nom, style: persona.style, tagline: persona.tagline, sexe: persona.sexe, soul: soulEffectif(persona.id) } : undefined,
    charte: charteEffective(), // valeurs/éthique communes à tous les profs (admin)
  };
}

function contexteTuteur() {
  // Exercices VARIÉS : on ancre sur l'énoncé courant. Anti-spoiler pour les QCM
  // et les calculs ; une question ouverte peut être discutée librement.
  if (xv && !xv.done && mode === 'exos') {
    const it = xv.items[xv.i] ?? {};
    return {
      module: xv.m.titre, moduleId: xv.m.id, notion: 'Exercices',
      relation: FORMULES[xv.m.objectifPrincipal], enonce: it.enonce,
      points_vus: [], en_exercice: it.t !== 'ouvert',
      ...identiteTuteur(),
    };
  }
  // En EXERCICE (série moteur) : on ancre sur tout le cours du module + l'énoncé.
  // en_exercice=true → le tuteur explique la méthode SANS donner le résultat.
  if (mode === 'exos') {
    const c = COURS[moduleActuel?.id];
    const vus = [];
    for (const sc of c?.scenes ?? []) {
      for (const p of sc.points ?? []) vus.push(String(p).replace(/<[^>]+>/g, ''));
    }
    return {
      module: moduleActuel?.titre,
      moduleId: moduleActuel?.id,
      notion: 'Exercices',
      relation: FORMULES[etatExo?.objectif_courant] ?? FORMULES[moduleActuel?.objectifPrincipal],
      enonce: etatExo?.question_courante?.enonce,
      points_vus: vus.slice(0, 10),
      en_exercice: true,
      ...identiteTuteur(),
    };
  }
  const sc = coursScenes[sceneIdx];
  const vus = [];
  for (let i = 0; i <= sceneIdx && i < coursScenes.length; i++) {
    for (const p of coursScenes[i]?.points ?? []) vus.push(String(p).replace(/<[^>]+>/g, ''));
  }
  return {
    module: moduleActuel?.titre,
    moduleId: moduleActuel?.id,
    notion: sc?.titre,
    relation: FORMULES[moduleActuel?.objectifPrincipal],
    points_vus: vus.slice(-8),
    en_exercice: false,
    ...identiteTuteur(),
  };
}

function ajouterFil(role, texte, opts = {}) {
  const div = document.createElement('div');
  div.className = 'main-msg main-' + role +
    (opts.alerte ? ' main-alerte' : '') + (opts.horsprog ? ' main-horsprog' : '');
  div.textContent = texte;
  const fil = $('#mainFil');
  fil.append(div);
  fil.scrollTop = fil.scrollHeight;
  return div;
}

$('#leverMain').addEventListener('click', () => {
  voix.interrompre();
  const enExo = mode === 'exos';
  $('#mainInfo').textContent = !tuteurConfigure()
    ? 'Mode hors-ligne : je te renvoie au cours. (Connecte le tuteur pour les questions libres.)'
    : enExo
      ? 'Sur cet exercice : je t’explique la méthode, sans te donner la réponse.'
      : 'Sur le cours en physique. Léa peut aussi dessiner au tableau.';
  $('#mainModale').hidden = false;
  syncParleLea();
  $('#mainQuestion').focus();
});

let mainOccupe = false;
// Mémoire courte de la conversation « lever la main » : les derniers échanges
// sont renvoyés au tuteur pour qu'il se souvienne (« et la réponse d'avant ? »).
let histTuteur = [];
// L'IA répond par le MÊME canal que le cours : la voix de Léa + les sous-titres
// + son visage + le tableau. Aucune « bulle de chatbot » : on ne doit pas
// sentir la frontière script / IA. Le fil ne sert qu'aux alertes de sécurité.
async function envoyerQuestion(q) {
  q = String(q ?? '').trim();
  if (!q || mainOccupe) return;
  $('#mainQuestion').value = '';
  $('#mainFil').innerHTML = '';
  voix.interrompre(); // barge-in : Léa se tait pour écouter/répondre
  mainOccupe = true;
  $('#mainEnvoyer').disabled = true;
  expression = 'happy';
  $('#soustitre').textContent = 'Hmm, bonne question… laisse-moi réfléchir.';
  let rep;
  try {
    rep = await poserQuestion(q, contexteTuteur(), histTuteur);
  } catch {
    rep = { reponse: 'Je n’ai pas pu répondre là. On reprend le cours ensemble ?', tableau: [], dans_programme: true };
  } finally {
    mainOccupe = false;
    $('#mainEnvoyer').disabled = false;
  }
  // On garde une fenêtre glissante des derniers tours (l'élève puis le prof).
  histTuteur = [...histTuteur, { role: 'eleve', texte: q }, { role: 'lea', texte: String(rep.reponse ?? '') }].slice(-8);
  // Le tableau réagit en direct : le prof EFFACE la figure du cours (la voiture,
  // le circuit…) et ré-explique sur une ardoise vierge. S'il a un schéma, il le
  // trace dessus ; sinon l'ardoise reste nette pendant qu'il explique à la voix.
  if (mode === 'cours' && !rep.alerte) {
    ardoisePropre();
    if (Array.isArray(rep.tableau) && rep.tableau.length) {
      try { dessinerCroquis(rep.tableau); } catch { /* schéma absent */ }
    }
  }
  // Sécurité : message persistant et visible (on ouvre le panneau au besoin).
  if (rep.alerte) {
    $('#mainModale').hidden = false;
    ajouterFil('lea', rep.reponse, { alerte: true });
    if (rep.alerte.escalade_requise) ajouterFil('lea', '⚠️ Parles-en à un adulte de confiance dès que possible.', { alerte: true });
    expression = 'encouraging';
  }
  // Reprise naturelle : petite passerelle vers le cours (sauf alerte).
  const bridge = mode === 'cours' && !rep.alerte ? ' On reprend le cours quand tu veux.' : '';
  parler(rep.reponse + bridge); // → sous-titres + voix + visage, comme le cours
  if (!$('#mainModale').hidden) $('#mainQuestion').focus();
}

$('#mainForm').addEventListener('submit', (e) => { e.preventDefault(); envoyerQuestion($('#mainQuestion').value); });

// Poser sa question À LA VOIX : dictée dans le champ puis envoi automatique.
let mainMicActif = false;
let mainMicHandle = null;
function majMainMicUI() {
  const b = $('#mainMic');
  if (!b) return;
  b.classList.toggle('actif', mainMicActif);
  b.textContent = mainMicActif ? '●' : '🎤';
}
function ecouterMainMic() {
  if (!voix.stt) return;
  if (mainMicActif) { mainMicHandle?.stop(); return; }
  voix.interrompre();
  mainMicActif = true;
  majMainMicUI();
  mainMicHandle = voix.ecouter({
    onPartial: (txt) => { $('#mainQuestion').value = txt; },
    onFinal: (txt) => { $('#mainQuestion').value = txt; },
    onEnd: () => {
      mainMicActif = false; majMainMicUI();
      const v = $('#mainQuestion').value.trim();
      if (v) envoyerQuestion(v);
    },
    onErreur: () => { mainMicActif = false; majMainMicUI(); },
  });
  if (!mainMicHandle) { mainMicActif = false; majMainMicUI(); }
}
if (voix.stt) {
  $('#mainMic').hidden = false;
  $('#mainMic').addEventListener('click', ecouterMainMic);
  // Fermer la fenêtre coupe la dictée en cours et rend le micro flottant.
  $('#mainModale').addEventListener('click', (e) => {
    if (e.target.id === 'mainModale' || e.target.dataset.fermer === 'mainModale') {
      mainMicHandle?.stop();
      setTimeout(syncParleLea, 0);
    }
  });
}

// Micro « toujours prêt » : l'élève parle à Léa pendant le cours, sans fenêtre.
// La réponse arrive par le canal de Léa (voix + sous-titres + tableau).
let parleActif = false;
let parleHandle = null;
let texteParle = '';
// Le micro flottant n'apparaît qu'en cours, voix dispo, et panneau fermé.
function syncParleLea() {
  const b = $('#parleLea');
  if (b) b.hidden = !(mode === 'cours' && voix.stt && $('#mainModale').hidden);
}
function majParleUI() { $('#parleLea')?.classList.toggle('ecoute', parleActif); }
function ecouterParle() {
  if (!voix.stt) return;
  if (parleActif) { parleHandle?.stop(); return; }
  voix.interrompre(); // barge-in : Léa se tait pour écouter
  parleActif = true;
  texteParle = '';
  majParleUI();
  expression = 'happy';
  parleHandle = voix.ecouter({
    onPartial: (txt) => { texteParle = txt; },
    onFinal: (txt) => { texteParle = txt; },
    onEnd: () => {
      parleActif = false; majParleUI();
      const v = texteParle.trim();
      texteParle = '';
      if (v) envoyerQuestion(v);
    },
    onErreur: () => { parleActif = false; majParleUI(); },
  });
  if (!parleHandle) { parleActif = false; majParleUI(); }
}
if (voix.stt) $('#parleLea').addEventListener('click', ecouterParle);

// Démarrage : accessibilité + série du jour + interface adaptée à la classe.
appliquerA11y();
majSerie();
appliquerVibe();
// Profil élève : premier passage → accueil interactif ; sinon on le retrouve.
if (profilExiste()) {
  enregistrerVisite();
  const pr = lireProfil();
  if (pr?.classe) definirNiveau(pr.classe);
}
construireAccueil();
if (!profilExiste()) demarrerOnboarding();
requestAnimationFrame(animer);
