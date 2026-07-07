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

  if (bouche) {
    const parle = t < parleJusqua && !reduireMouvement;
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

  requestAnimationFrame(animer);
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
