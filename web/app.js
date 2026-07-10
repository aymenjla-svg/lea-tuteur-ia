// Léa — client web (front modulaire « prof devant toi »).
// Accueil = choix d'un MODULE (avec % d'avancement). Leçon = le prof écrit la
// consigne au tableau, la LIT (voix), et sa parole s'affiche en SOUS-TITRES.
// Le moteur tourne embarqué (window.LeaEngine) ou via l'API HTTP. L'avatar
// n'émet que des signaux synthétiques — jamais de caméra (§1.4). L'expression
// est imposée par le déterministe (A1).

import { PERSONAS, MATIERE, personaParId, avatarSVG } from './personas.js';
import { voix } from './voix.js';
import { MODULES, chargerProgress, majProgress, progressModule } from './modules.js';
import { COURS, verifierCheckpoint } from './cours.js';
import { figure } from './figures.js';
import { enregistrerReponse, ERREUR_LIB } from './suivi.js';
import { lireA11y, appliquerA11y, definirA11y } from './accessibilite.js';
import {
  NIVEAUX, niveauCourant, definirNiveau, appliquerVibe,
  xp, ajouterXp, niveauJeu, progNiveauJeu, majSerie, serie, etoiles,
} from './jeu.js';
import { poserQuestion, tuteurConfigure } from './tuteur-llm.js';

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

function construireHero() {
  $('#heroAvatar').innerHTML = avatarSVG(persona);
  $('#ouvrirProfs').textContent = `Prof : ${persona.nom} ${persona.emoji} · changer`;
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

/* --- Missions (modules) + « continuer » ---------------------------------- */

function construireModules() {
  const grille = $('#modulesGrille');
  const prog = chargerProgress();
  grille.replaceChildren();
  const actifs = MODULES.filter((m) => !m.verrouille).length;
  $('#modCount').textContent = `${actifs} débloquées · ${MODULES.length - actifs} à venir`;

  MODULES.forEach((m, i) => {
    const pct = progressModule(m, prog);
    const num = String(i + 1).padStart(2, '0');
    const carte = document.createElement('button');
    carte.type = 'button';
    carte.className = 'mission' + (m.verrouille ? ' verrouille' : '');
    carte.style.setProperty('--c', m.couleur);
    carte.disabled = !!m.verrouille;
    carte.innerHTML =
      `<span class="reticle tl"></span><span class="reticle tr"></span>` +
      `<span class="reticle bl"></span><span class="reticle br"></span>` +
      `<div class="mission-top"><span class="mission-ico">${m.icone}</span><span class="mission-num">${num}</span></div>` +
      `<div class="mission-titre">${m.titre}</div>` +
      `<div class="mission-sub">${m.resume}</div>` +
      (m.verrouille ? '' : `<div class="mission-bar"><span style="width:${pct}%"></span></div>`) +
      `<div class="mission-pied">` +
      (m.verrouille
        ? `<span class="mission-verr">🔒 Verrouillée</span>`
        : `<span class="mission-pct">${pct}% ${etoilesMission(pct)}</span>` +
          `<span class="mission-go">${pct >= 100 ? 'REJOUER' : pct > 0 ? 'REPRENDRE' : 'LANCER'} →</span>`) +
      `</div>`;
    if (!m.verrouille) carte.addEventListener('click', () => ouvrirModule(m));
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
}

/* --- Navigation accueil ↔ leçon ------------------------------------------ */

function ouvrirModule(m) {
  moduleActuel = m;
  theme(m.couleur);
  $('#avatarHost').innerHTML = avatarSVG(persona);
  $('#hudTitre').textContent = `${persona.nom} · ${m.titre}`;
  $('#accueil').hidden = true;
  $('#lecon').hidden = false;
  expression = 'happy';
  // « Un prof devant toi » : la voix s'active d'office (le clic = geste qui
  // débloque la synthèse). L'élève peut couper via 🔊.
  if (voix.tts) { voixActive = true; majVoixUI(); }
  // Chaque module commence par son COURS animé (s'il existe), puis la série.
  if (COURS[m.id]) { cpFaits.clear(); ouvrirCours(m); }
  else { mode = 'exos'; appliquerMode(); demarrer(m.objectifPrincipal); }
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
  coursScenes = c?.scenes ?? [];
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
  $('#leverMain').hidden = false; // « lever la main » : cours ET exercices
  // Micro « toujours prêt » : présent pendant le COURS si la voix est dispo
  // (et masqué tant que le panneau de saisie est ouvert, pour ne pas se chevaucher).
  syncParleLea();
  $('#revoirCours').hidden = cours || !COURS[moduleActuel?.id];
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
    parler(`Exact ! ${opt.retour ?? ''}`);
  } else {
    expression = 'encouraging';
    btn?.classList.add('faux');
    entourerRelation('regarde le schéma');
    parler(opt.retour ?? 'Pas tout à fait, réessaie.');
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
  parler(r.message);
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
  mode = 'exos';
  appliquerMode();
  demarrer(moduleActuel.objectifPrincipal);
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

function parler(texte) {
  const duree = Math.min(4000, 400 + texte.length * 32);
  parleJusqua = performance.now() + duree;

  if (voixActive && voix.tts) {
    // Sous-titre révélé au fil de la parole (word-boundary), avec filet.
    majSousTitre(texte, 0);
    const est = Math.min(15000, 500 + texte.length * 80);
    voix.parler(texte, {
      params: { ...persona?.voix, sexe: persona?.sexe },
      onStart: () => { parleJusqua = performance.now() + est; },
      onBoundary: (e) => {
        clearTimeout(stFallback);
        majSousTitre(texte, (e.charIndex ?? 0) + (e.charLength ?? 1));
      },
      onEnd: () => { parleJusqua = performance.now(); majSousTitre(texte, texte.length); },
    });
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
  if (b && !b.disabled) repondreQcm(Number(b.dataset.idx));
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
$('#perdu').addEventListener('click', () => repondre('je suis perdu'));
$('#rejouer').addEventListener('click', () => demarrer(moduleActuel?.objectifPrincipal));
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
  $('#tuteurUrl').value = url;
  $('#tuteurKey').value = key;
  $('#tuteurEtat').textContent = tuteurConfigure()
    ? '✅ Tuteur connecté — « lever la main » répond en direct.'
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

$('#a11yBtn').addEventListener('click', () => { majA11yUI(); majTuteurUI(); $('#a11yModale').hidden = false; });
$('#segTaille').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  definirA11y({ taille: b.dataset.taille });
  majA11yUI();
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
  el.addEventListener('click', () => { $('#' + el.dataset.fermer).hidden = true; });
}
for (const id of ['a11yModale', 'avisModale', 'mainModale']) {
  $('#' + id).addEventListener('click', (e) => { if (e.target.id === id) $('#' + id).hidden = true; });
}

/* --- « Lever la main » : question libre à Léa (phase LLM) ------------------ */

// Contexte transmis au tuteur : le module, la notion courante, la relation et
// les points déjà vus (ancrage au programme). en_exercice pilote l'anti-spoiler.
function contexteTuteur() {
  // En EXERCICE : on ancre sur tout le cours du module + l'énoncé courant.
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
    rep = await poserQuestion(q, contexteTuteur());
  } catch {
    rep = { reponse: 'Je n’ai pas pu répondre là. On reprend le cours ensemble ?', tableau: [], dans_programme: true };
  } finally {
    mainOccupe = false;
    $('#mainEnvoyer').disabled = false;
  }
  // Le tableau réagit en direct : Léa dessine et POINTE la notion dont elle parle.
  if (mode === 'cours') {
    if (Array.isArray(rep.tableau) && rep.tableau.length) {
      try { dessinerCroquis(rep.tableau); } catch { /* schéma absent */ }
    }
    souligneConcept(figureRendue, rep.reponse);
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
construireAccueil();
requestAnimationFrame(animer);
