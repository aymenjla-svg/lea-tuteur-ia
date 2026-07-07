// Léa — client web (palier 2D/SVG + texte), sans build ni dépendance.
// Consomme l'API du moteur (/sessions, /sessions/:id/repondre).
// L'avatar n'affiche que des signaux SYNTHÉTIQUES (visèmes/regard) — jamais de
// caméra (§1.4). Le moteur pédagogique est identique à tous les paliers (R6).

const $ = (sel) => document.querySelector(sel);
const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const COUPS = {
  proposer: 'nouvel exercice',
  reformuler: 'reformulation',
  simplifier: 'on simplifie',
  changer_de_modalite: 'autre approche',
  encourager: 'encouragement',
  reviser: 'révision',
  clore: 'séance terminée',
};

let sessionId = null;
let parleJusqua = 0; // timestamp de fin d'animation « parle »

// Expression de l'avatar (ADDENDUM v1/A1). Imposée par l'ÉTAT du moteur : sur
// une correction, elle vient du verdict (correct → celebrate, erreur →
// encouraging/concerned) — l'avatar ne peut donc pas féliciter une réponse
// fausse. Chaque entrée encode : décalage vertical des sourcils, sourire
// (1 = sourire, -1 = moue douce, 0 = neutre), blush des joues [0,1], inquiétude.
const EXPR = {
  idle:        { browY: 0,  smile: 0,  cheeks: 0,   worry: false },
  listening:   { browY: -1, smile: 0,  cheeks: 0,   worry: false },
  speaking:    { browY: 0,  smile: 0,  cheeks: 0,   worry: false },
  thinking:    { browY: -2, smile: 0,  cheeks: 0,   worry: false },
  happy:       { browY: -1, smile: 1,  cheeks: 0.3, worry: false },
  encouraging: { browY: -1, smile: 1,  cheeks: 0.2, worry: false },
  surprised:   { browY: -3, smile: 0,  cheeks: 0,   worry: false },
  concerned:   { browY: 1,  smile: -1, cheeks: 0,   worry: true },
  celebrate:   { browY: -2, smile: 1,  cheeks: 0.8, worry: false },
};
let expression = 'idle';
let celebreJusqua = 0; // rebond one-shot sur celebrate

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

function ajouterTour(qui, texte) {
  const li = document.createElement('li');
  li.className = qui;
  li.textContent = texte;
  $('#transcript').append(li);
  $('#transcript').scrollTop = $('#transcript').scrollHeight;
}

function parler(texte) {
  // Durée d'animation ~ proportionnelle à la longueur (≈ débit de parole).
  const duree = Math.min(4000, 400 + texte.length * 35);
  parleJusqua = performance.now() + duree;
}

function rendre(etat) {
  $('#parole').textContent = etat.texte_tuteur;
  ajouterTour('tuteur', etat.texte_tuteur);
  parler(etat.texte_tuteur);

  // Expression imposée par le moteur (A1). Le rebond de célébration est one-shot.
  expression = etat.expression ?? 'idle';
  if (expression === 'celebrate') celebreJusqua = performance.now() + 1600;

  const p = Math.round((etat.maitrise_cible?.probabilite_effective ?? 0) * 100);
  $('#barre').style.width = p + '%';
  $('#pct').innerHTML = p + '&nbsp;%';
  $('#coup').textContent = COUPS[etat.dernier_coup?.type] ?? '';

  const fini = !!etat.termine;
  $('#reponse').disabled = fini;
  $('#envoyer').disabled = fini;
  $('#perdu').disabled = fini;
  $('#rejouer').hidden = !fini;
  if (!fini) $('#reponse').focus();
}

// Le moteur peut tourner soit dans l'onglet (build statique GitHub Pages, où
// window.LeaEngine est présent), soit derrière l'API HTTP (déploiement backend).
// Même moteur déterministe dans les deux cas (R6) : seul le transport change.
const EMBARQUE = typeof window !== 'undefined' && window.LeaEngine;

async function demarrer() {
  $('#transcript').replaceChildren();
  try {
    const d = EMBARQUE
      ? await window.LeaEngine.creerSession()
      : await api('/sessions', 'POST', {});
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
    const d = EMBARQUE
      ? await window.LeaEngine.repondre(sessionId, texte)
      : await api(`/sessions/${sessionId}/repondre`, 'POST', { texte });
    rendre(d.etat);
  } catch (e) {
    $('#parole').textContent = 'Oups : ' + e.message;
  }
}

/* --- Animation de l'avatar (visèmes + regard + clignements) --------------- */

let prochainClignement = 1500;
let debutClignement = 0;

function animer(t) {
  const bouche = $('#bouche');
  const pg = $('#pupilleG');
  const pd = $('#pupilleD');
  const oeilG = $('#oeilG');
  const oeilD = $('#oeilD');

  const parle = t < parleJusqua && !reduireMouvement;
  if (bouche) {
    // Lip-sync approximatif (A3 MVP) : ouverture ∝ « débit » pendant la parole.
    const ouverture = parle ? 3 + 7 * Math.abs(Math.sin(t / 90)) : 3;
    bouche.setAttribute('ry', ouverture.toFixed(2));
  }

  // Regard : légère dérive ; pupilles synchronisées.
  if (pg && pd && !reduireMouvement) {
    const dx = Math.sin(t / 1700) * 2.2;
    const dy = Math.cos(t / 2300) * 1.4;
    pg.setAttribute('cx', (36 + dx).toFixed(2));
    pg.setAttribute('cy', (42 + dy).toFixed(2));
    pd.setAttribute('cx', (64 + dx).toFixed(2));
    pd.setAttribute('cy', (42 + dy).toFixed(2));
  }

  // Clignements occasionnels (compression verticale des yeux).
  if (!reduireMouvement && oeilG && oeilD) {
    if (t > prochainClignement && debutClignement === 0) debutClignement = t;
    let sy = 1;
    if (debutClignement > 0) {
      const dt = t - debutClignement;
      sy = dt < 60 ? 1 - dt / 60 : dt < 120 ? (dt - 60) / 60 : 1;
      if (dt >= 120) {
        debutClignement = 0;
        prochainClignement = t + 1800 + Math.sin(t) * 600 + 1200;
      }
    }
    oeilG.setAttribute('transform', `translate(0 ${42 * (1 - sy)}) scale(1 ${sy})`);
    oeilD.setAttribute('transform', `translate(0 ${42 * (1 - sy)}) scale(1 ${sy})`);
  }

  appliquerExpression(t, parle);
  requestAnimationFrame(animer);
}

/* Applique l'expression courante (sourcils, joues, sourire, rebond) — A1. */
function appliquerExpression(t, parle) {
  const cfg = EXPR[expression] ?? EXPR.idle;

  const sg = $('#sourcilG');
  const sd = $('#sourcilD');
  if (sg && sd) {
    // Décalage vertical + inclinaison interne montante pour l'inquiétude douce.
    const ang = cfg.worry ? 9 : 0;
    sg.setAttribute('transform', `translate(0 ${cfg.browY}) rotate(${ang} 36 34)`);
    sd.setAttribute('transform', `translate(0 ${cfg.browY}) rotate(${-ang} 64 34)`);
  }

  const jg = $('#joueG');
  const jd = $('#joueD');
  if (jg && jd) {
    jg.setAttribute('opacity', String(cfg.cheeks));
    jd.setAttribute('opacity', String(cfg.cheeks));
  }

  // Le sourire (ou la moue) ne s'affiche qu'HORS parole (la parole pilote la
  // bouche pour le lip-sync). Sourire vers le haut / moue douce vers le bas.
  const sourire = $('#sourire');
  const bouche = $('#bouche');
  const montrerSourire = !parle && cfg.smile !== 0;
  if (sourire) {
    sourire.setAttribute('opacity', montrerSourire ? '1' : '0');
    sourire.setAttribute(
      'd',
      cfg.smile > 0 ? 'M40 66 Q50 73 60 66' : 'M40 70 Q50 65 60 70',
    );
  }
  if (bouche) bouche.setAttribute('opacity', montrerSourire ? '0' : '1');

  // Rebond one-shot de célébration.
  const vg = $('#visageG');
  if (vg) {
    let ty = 0;
    if (expression === 'celebrate' && t < celebreJusqua && !reduireMouvement) {
      ty = -Math.abs(Math.sin(t / 120)) * 4;
    }
    vg.setAttribute('transform', `translate(0 ${ty.toFixed(2)})`);
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
$('#palier').addEventListener('change', (e) => {
  $('#scene').style.display = e.target.value === 'texte' ? 'none' : 'flex';
});

requestAnimationFrame(animer);
demarrer();
