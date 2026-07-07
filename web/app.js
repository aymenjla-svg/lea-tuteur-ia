// Léa — client web (palier 2D manga expressif + texte), sans build.
// Consomme le moteur, soit embarqué (window.LeaEngine, build statique), soit via
// l'API HTTP (déploiement backend). L'avatar n'affiche que des signaux
// SYNTHÉTIQUES (visèmes/regard) — jamais de caméra (§1.4). Même moteur à tous
// les paliers (R6). L'expression est imposée par le déterministe (A1).

import { PERSONAS, MATIERE, personaParId, avatarSVG } from './personas.js';

const $ = (sel) => document.querySelector(sel);
const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const EMBARQUE = typeof window !== 'undefined' && window.LeaEngine;

const COUPS = {
  proposer: 'nouvel exercice', reformuler: 'reformulation', simplifier: 'on simplifie',
  changer_de_modalite: 'autre approche', encourager: 'encouragement', reviser: 'révision',
  clore: 'séance terminée',
};

// Config visuelle par expression (A1). browY : décalage sourcils ; smile :
// 1 sourire / -1 moue douce / 0 neutre ; cheeks : blush [0,1] ; extras manga.
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

let sessionId = null;
let persona = null;
let parleJusqua = 0;     // fin d'animation « parle »
let expression = 'idle';
let celebreJusqua = 0;   // rebond one-shot
let attente = false;     // true tant qu'on attend la réponse de l'élève

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

async function moteurCreer() {
  return EMBARQUE ? window.LeaEngine.creerSession() : api('/sessions', 'POST', {});
}
async function moteurRepondre(texte) {
  return EMBARQUE
    ? window.LeaEngine.repondre(sessionId, texte)
    : api(`/sessions/${sessionId}/repondre`, 'POST', { texte });
}

/* --- Rendu ---------------------------------------------------------------- */

function ajouterTour(qui, texte) {
  const li = document.createElement('li');
  li.className = qui;
  li.textContent = texte;
  $('#transcript').append(li);
  $('#transcript').scrollTop = $('#transcript').scrollHeight;
}

function parler(texte) {
  const duree = Math.min(4000, 400 + texte.length * 32);
  parleJusqua = performance.now() + duree;
}

// Relation de physique à afficher à la craie, selon l'objectif courant.
const FORMULES = {
  'obj-vitesse': 'v = d / t',
  'obj-vitesse-relation': 'v = d / t',
  'obj-poids': 'P = m × g',
  'obj-ohm': 'U = R × I',
};

// Écrit au tableau la relation travaillée ; à défaut, une opération de l'énoncé.
function pourLeTableau(etat) {
  const f = FORMULES[etat.objectif_courant];
  if (f) return f;
  const enonce = etat.question_courante?.enonce ?? '';
  const m = enonce.match(/(\d+\s*[+\-×x*/]\s*\d+)/);
  return m ? `${m[1].replace(/\s+/g, ' ')} = ?` : '';
}

function rendre(etat) {
  $('#parole').textContent = etat.texte_tuteur;
  ajouterTour('tuteur', etat.texte_tuteur);
  parler(etat.texte_tuteur);

  expression = etat.expression ?? 'idle';
  if (expression === 'celebrate') celebreJusqua = performance.now() + 1800;

  if (!etat.termine) $('#tableauTexte').textContent = pourLeTableau(etat);

  const p = Math.round((etat.maitrise_cible?.probabilite_effective ?? 0) * 100);
  $('#barre').style.width = p + '%';
  $('#pct').innerHTML = p + '&nbsp;%';
  $('#coup').textContent = COUPS[etat.dernier_coup?.type] ?? '';

  const fini = !!etat.termine;
  attente = !fini;
  $('#reponse').disabled = fini;
  $('#envoyer').disabled = fini;
  $('#perdu').disabled = fini;
  $('#rejouer').hidden = !fini;
  if (fini) $('#tableauTexte').textContent = '★';
  if (!fini) $('#reponse').focus();
}

/* --- Boucle de session ---------------------------------------------------- */

async function demarrer() {
  $('#transcript').replaceChildren();
  try {
    const d = await moteurCreer();
    sessionId = d.session_id;
    rendre(d.etat);
  } catch (e) {
    $('#parole').textContent = 'Connexion au tuteur impossible : ' + e.message;
  }
}

async function repondre(texte) {
  if (!sessionId || texte.trim() === '') return;
  ajouterTour('eleve', texte);
  try {
    const d = await moteurRepondre(texte);
    rendre(d.etat);
  } catch (e) {
    $('#parole').textContent = 'Oups : ' + e.message;
  }
}

/* --- Choix du prof (§7) --------------------------------------------------- */

function construireChoix() {
  const grille = $('#choixGrille');
  grille.replaceChildren();
  for (const p of PERSONAS) {
    const carte = document.createElement('button');
    carte.type = 'button';
    carte.className = 'choix-carte';
    carte.style.setProperty('--accent', p.accent);
    carte.innerHTML =
      `<div class="choix-avatar">${avatarSVG(p, p.id)}</div>` +
      `<div class="choix-nom">${p.nom} <span class="choix-emoji">${p.emoji}</span></div>` +
      `<div class="choix-matiere">${p.style}</div>` +
      `<div class="choix-tag">${p.tagline}</div>`;
    carte.addEventListener('click', () => choisirProf(p.id));
    grille.append(carte);
  }
}

function choisirProf(id) {
  persona = personaParId(id);
  document.documentElement.style.setProperty('--accent', persona.accent);
  $('#avatarHost').innerHTML = avatarSVG(persona);
  $('#titre').textContent = persona.nom;
  $('#sousTitre').textContent = `prof de ${MATIERE.toLowerCase()} · ${persona.style.toLowerCase()}`;
  $('#changerProf').hidden = false;
  $('#choix').classList.add('cache');
  expression = 'happy';
  demarrer();
}

function ouvrirChoix() {
  $('#choix').classList.remove('cache');
}

/* --- Animation de l'avatar ------------------------------------------------ */

let prochainClignement = 1500;
let debutClignement = 0;

function animer(t) {
  const parle = t < parleJusqua && !reduireMouvement;
  // Après avoir réagi (parole finie + rebond de célébration passé), l'avatar
  // se met en écoute attentive tant qu'on attend la réponse de l'élève — effet
  // « vivant » (A1). Les expressions restent pilotées par le moteur au tour
  // suivant (rendre les réassigne).
  if (attente && !parle && t > celebreJusqua && expression !== 'listening') {
    expression = 'listening';
  }
  const cfg = EXPR[expression] ?? EXPR.idle;

  // Respiration du corps.
  const corps = $('#corps');
  if (corps && !reduireMouvement) {
    const dy = Math.sin(t / 1400) * 1.4;
    corps.setAttribute('transform', `translate(0 ${dy.toFixed(2)})`);
  }

  // Lip-sync approximatif (A3 MVP) : ouverture ∝ « débit » pendant la parole.
  const bouche = $('#bouche');
  if (bouche) {
    const ouverture = parle ? 2 + 6 * Math.abs(Math.sin(t / 85)) : 2.5;
    bouche.setAttribute('ry', ouverture.toFixed(2));
  }

  // Regard : légère dérive ; les deux iris synchronisés.
  const ig = $('#irisG');
  const id = $('#irisD');
  if (ig && id && !reduireMouvement) {
    const dx = Math.sin(t / 1900) * 2.4;
    const dy = Math.cos(t / 2500) * 1.6;
    ig.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
    id.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
  }

  // Clignement (compression verticale des yeux) + ouverture par l'expression.
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
    // Centre des yeux ≈ y 112 (viewBox 200×240).
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
  // Sourcils : décalage vertical + inclinaison interne pour l'inquiétude douce.
  const ang = cfg.smile < 0 ? 10 : 0;
  poser('sourcilG', 'transform', `translate(0 ${cfg.browY}) rotate(${ang} 74 88)`);
  poser('sourcilD', 'transform', `translate(0 ${cfg.browY}) rotate(${-ang} 126 88)`);

  // Joues (blush).
  poser('joueG', 'opacity', String(cfg.cheeks));
  poser('joueD', 'opacity', String(cfg.cheeks));

  // Sourire (hors parole) vs bouche animée (parole).
  const montrerSourire = !parle && cfg.smile !== 0;
  poser('sourire', 'opacity', montrerSourire ? '1' : '0');
  poser('sourire', 'd', cfg.smile > 0 ? 'M84 140 Q100 154 116 140' : 'M84 148 Q100 138 116 148');
  poser('bouche', 'opacity', montrerSourire ? '0' : '1');

  // Extras manga.
  poser('goutte', 'opacity', String(cfg.sweat));
  poser('bulle', 'opacity', String(cfg.bulle));
  const et = $('#etincelles');
  if (et) {
    const brille = cfg.sparkle && !reduireMouvement
      ? 0.4 + 0.6 * Math.abs(Math.sin(t / 180))
      : cfg.sparkle;
    et.setAttribute('opacity', String(brille));
  }

  // Inclinaison de tête + rebond de célébration.
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
$('#rejouer').addEventListener('click', demarrer);
$('#changerProf').addEventListener('click', ouvrirChoix);
$('#palier').addEventListener('change', (e) => {
  $('#scene').style.display = e.target.value === 'texte' ? 'none' : 'flex';
});

construireChoix();
requestAnimationFrame(animer);
