// Léa — client web (front modulaire « prof devant toi »).
// Accueil = choix d'un MODULE (avec % d'avancement). Leçon = le prof écrit la
// consigne au tableau, la LIT (voix), et sa parole s'affiche en SOUS-TITRES.
// Le moteur tourne embarqué (window.LeaEngine) ou via l'API HTTP. L'avatar
// n'émet que des signaux synthétiques — jamais de caméra (§1.4). L'expression
// est imposée par le déterministe (A1).

import { PERSONAS, MATIERE, personaParId, avatarSVG } from './personas.js';
import { voix } from './voix.js';
import { MODULES, chargerProgress, majProgress, progressModule } from './modules.js';
import {
  NIVEAUX, niveauCourant, definirNiveau, appliquerVibe,
  xp, ajouterXp, niveauJeu, progNiveauJeu, majSerie, serie, etoiles,
} from './jeu.js';

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
async function moteurCreer(objectifId) {
  return EMBARQUE
    ? window.LeaEngine.creerSession(objectifId)
    : api('/sessions', 'POST', { objectif_id: objectifId });
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
  demarrer(m.objectifPrincipal);
}

function retourAccueil() {
  voix.interrompre();
  $('#lecon').hidden = true;
  $('#accueil').hidden = false;
  construireAccueil(); // rafraîchit les % de progression
}

/* --- Boucle de leçon ------------------------------------------------------ */

async function demarrer(objectifId) {
  $('#soustitre').textContent = '';
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
};

function rendre(etat) {
  const enonce = etat.question_courante?.enonce ?? '';
  const fini = !!etat.termine;

  // TABLEAU = la consigne (ce que le prof « écrit ») + la relation en coin.
  if (fini) {
    $('#tableauTexte').textContent = '★ Module réussi !';
    $('#tableauFormule').textContent = '';
  } else {
    $('#tableauTexte').textContent = enonce || FORMULES[etat.objectif_courant] || '';
    $('#tableauFormule').textContent = FORMULES[etat.objectif_courant] ?? '';
  }

  // Le prof DIT texte_tuteur → affiché en SOUS-TITRES (synchronisés à la voix).
  parler(etat.texte_tuteur);

  expression = etat.expression ?? 'idle';
  if (expression === 'celebrate') celebreJusqua = performance.now() + 1800;

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
  repondre(v);
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

// Démarrage : série du jour + interface adaptée à la classe + accueil.
majSerie();
appliquerVibe();
construireAccueil();
requestAnimationFrame(animer);
