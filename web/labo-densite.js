// Léa — LABO DENSITÉ : « flotte ou coule ? » (ρ = m ÷ V) par l'expérience.
// L'élève jette des objets du quotidien dans l'eau (glaçon, pierre, huile,
// trombone…) et DÉCOUVRE que c'est la masse volumique — pas la taille — qui
// décide. 100 % ADDITIF, s'appuie sur labo-kit.js.

import { creerLabo } from './labo-kit.js';

// ρ en kg/L (= g/cm³) ; eau = 1. m en kg, V en L.
const OBJETS = [
  { emoji: '🧊', nom: 'Glaçon', m: 0.9, V: 1, coul: '#bfe6ff' },
  { emoji: '🪵', nom: 'Bois', m: 0.6, V: 1, coul: '#a9713f' },
  { emoji: '🍎', nom: 'Pomme', m: 0.85, V: 1, coul: '#e0563f' },
  { emoji: '🛢️', nom: 'Huile', m: 0.92, V: 1, coul: '#e6c15a' },
  { emoji: '🪨', nom: 'Pierre', m: 2.6, V: 1, coul: '#8a8f98' },
  { emoji: '📎', nom: 'Trombone (fer)', m: 7.8, V: 1, coul: '#c7ccd6' },
  { emoji: '🎈', nom: 'Balle légère', m: 0.1, V: 1, coul: '#ff7aa8' },
];
const st = { m: 1, V: 1, coul: '#14c8d4', emoji: '🧪' };
const rho = () => st.m / Math.max(st.V, 0.001);
const flotte = () => rho() < 1;

const $ = (s, r = document) => r.querySelector(s);

let cv, ctx, W, H, raf = 0, api, oy = -40, vy = 0;

function initCanvas(canvas) {
  cv = canvas;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  W = r.width || 520; H = 220;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function relacher() { oy = -40; vy = 0; }

function dessiner() {
  if (!ctx) return;
  const waterTop = 70;
  ctx.fillStyle = '#0a1020'; ctx.fillRect(0, 0, W, H);
  // eau
  const g = ctx.createLinearGradient(0, waterTop, 0, H);
  g.addColorStop(0, '#1a6ea8cc'); g.addColorStop(1, '#0b3a66');
  ctx.fillStyle = g; ctx.fillRect(0, waterTop, W, H - waterTop);
  ctx.strokeStyle = '#7fd8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, waterTop); ctx.lineTo(W, waterTop); ctx.stroke();
  ctx.fillStyle = '#7fd8ff'; ctx.font = '700 11px Fredoka, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('surface de l’eau (ρ = 1)', 8, waterTop - 6);
  // bord bocal
  ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 3; ctx.strokeRect(4, 40, W - 8, H - 44);

  // objet : taille ∝ V, position selon flottaison
  const size = 34 + Math.min(60, st.V * 16);
  const half = size / 2;
  const bottom = H - 12 - half;
  let target;
  if (flotte()) {
    const frac = Math.max(0.12, Math.min(0.95, rho())); // fraction immergée = ρ (eau=1)
    target = waterTop - half + frac * size;
  } else target = bottom;
  // physique de chute + amortissement
  vy += 0.9; oy += vy;
  if (oy >= target) { oy = target; vy *= -0.35; if (Math.abs(vy) < 0.6) vy = 0; }
  const ox = W / 2;

  // objet
  ctx.save(); ctx.translate(ox, oy);
  ctx.fillStyle = st.coul; ctx.strokeStyle = '#00000055'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-half, -half, size, size, 10); ctx.fill(); ctx.stroke();
  ctx.font = (size * 0.6) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(st.emoji, 0, 2);
  ctx.restore(); ctx.textBaseline = 'alphabetic';

  // étiquette flotte/coule
  ctx.textAlign = 'center'; ctx.font = '700 15px Fredoka, sans-serif';
  ctx.fillStyle = flotte() ? '#7fe0a8' : '#ff9a7a';
  ctx.fillText(flotte() ? '⬆ ça flotte' : '⬇ ça coule', W / 2, 32);
  ctx.textAlign = 'left';
}

function boucle() {
  if (!api._open) { raf = 0; return; }
  dessiner(); majReadout();
  raf = requestAnimationFrame(boucle);
}
function majReadout() {
  $('#ld-m').textContent = st.m.toFixed(st.m < 10 ? 1 : 0);
  $('#ld-v').textContent = st.V.toFixed(1);
  $('#ld-rho').textContent = rho().toFixed(2);
  const note = $('#ld-note');
  if (note) note.innerHTML = `ρ = m ÷ V = <b>${rho().toFixed(2)}</b> kg/L. ${flotte() ? 'Plus <b>léger</b> que l’eau (1) → ça <b>flotte</b> 🛟' : 'Plus <b>lourd</b> que l’eau (1) → ça <b>coule</b> 🪨'}`;
}

function scene(stage, _api) {
  api = _api;
  stage.innerHTML = `
    <canvas class="lk-cv" id="ld-cv"></canvas>
    <div class="lk-read">
      <div><div class="k">Masse m</div><div class="v a"><span id="ld-m">1.0</span> kg</div></div>
      <div><div class="k">Volume V</div><div class="v b"><span id="ld-v">1.0</span> L</div></div>
      <div><div class="k">ρ = m ÷ V</div><div class="v c"><span id="ld-rho">1.00</span> kg/L</div></div>
    </div>
    <div class="lk-ctrl">
      <div class="lk-line">Jette un objet dans l’eau :</div>
      <div class="lk-chips" id="ld-obj"></div>
      <div class="lk-slide"><label>Masse</label><input id="ld-sm" type="range" min="0.1" max="10" step="0.1" value="1"><span class="val" id="ld-sml">1.0 kg</span></div>
      <div class="lk-slide"><label>Volume</label><input id="ld-sv" type="range" min="0.1" max="6" step="0.1" value="1"><span class="val" id="ld-svl">1.0 L</span></div>
      <div class="lk-act"><button class="lk-btn" id="ld-drop">💦 Rejeter dans l’eau</button></div>
      <div class="lk-note" id="ld-note"></div>
    </div>`;
  const oz = $('#ld-obj', stage);
  oz.innerHTML = OBJETS.map((o, i) => `<button class="lk-chip" data-o="${i}">${o.emoji} ${o.nom}</button>`).join('');
  oz.querySelectorAll('[data-o]').forEach((b) => b.addEventListener('click', () => api.setObjet(+b.dataset.o)));
  const sm = $('#ld-sm', stage), sv = $('#ld-sv', stage);
  const majSliders = () => { $('#ld-sml', stage).textContent = st.m.toFixed(1) + ' kg'; $('#ld-svl', stage).textContent = st.V.toFixed(1) + ' L'; };
  sm.addEventListener('input', () => { st.m = +sm.value; st.emoji = '🧪'; st.coul = '#14c8d4'; oz.querySelectorAll('.lk-chip').forEach((x) => x.classList.remove('on')); majSliders(); relacher(); });
  sv.addEventListener('input', () => { st.V = +sv.value; st.emoji = '🧪'; st.coul = '#14c8d4'; oz.querySelectorAll('.lk-chip').forEach((x) => x.classList.remove('on')); majSliders(); relacher(); });
  $('#ld-drop', stage).addEventListener('click', relacher);

  api.rho = () => rho(); api.flotte = () => flotte();
  api.setObjet = (i) => {
    const o = OBJETS[i]; st.m = o.m; st.V = o.V; st.coul = o.coul; st.emoji = o.emoji;
    sm.value = o.m; sv.value = o.V; majSliders();
    oz.querySelectorAll('.lk-chip').forEach((x, k) => x.classList.toggle('on', k === i)); relacher();
  };
  api.onOpen = () => { api._open = true; initCanvas($('#ld-cv', stage)); relacher(); if (!raf) raf = requestAnimationFrame(boucle); };
  api.onClose = () => { api._open = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  majSliders();
}

const MISSIONS = [
  { id: 'd1', xp: 20, titre: 'La pierre', ui: 'choix',
    q: 'Tu jettes une <b>pierre</b> (ρ = 2,6 kg/L) dans l’eau. Elle…',
    choix: ['flotte', 'coule'], check: (i) => i === 1, prep: (a) => a.setObjet(4),
    sol: 'ρ = 2,6 > 1 : plus dense que l’eau → elle coule.' },
  { id: 'd2', xp: 20, titre: 'Le glaçon (et l’iceberg)', ui: 'choix',
    q: 'Et un <b>glaçon</b> (ρ = 0,9 kg/L)&nbsp;? Il…',
    choix: ['flotte', 'coule'], check: (i) => i === 0, prep: (a) => a.setObjet(0),
    sol: 'ρ = 0,9 < 1 → il flotte, en dépassant à peine : comme un iceberg, presque tout est sous l’eau.' },
  { id: 'd3', xp: 25, titre: 'Le vrai secret', ui: 'choix',
    q: 'Deux objets de la <b>même taille</b> (même volume) : l’un flotte, l’autre coule. Ce qui décide, c’est…',
    choix: ['leur couleur', 'leur masse volumique ρ', 'leur forme'], check: (i) => i === 1,
    sol: 'À volume égal, c’est la masse (donc ρ = m/V) qui fait la différence.' },
  { id: 'd4', xp: 30, titre: 'Fabrique un flotteur', ui: 'live',
    q: 'Avec les curseurs, fabrique un objet qui <b>FLOTTE</b> (donc ρ &lt; 1 kg/L).',
    hint: 'Baisse la masse ou augmente le volume jusqu’à ρ &lt; 1.',
    check: (_r, a) => a.rho() < 1, sol: 'Dès que m ÷ V passe sous 1, l’objet est moins dense que l’eau : il remonte.' },
  { id: 'd5', xp: 30, titre: 'Tronc vs clou', ui: 'choix',
    q: 'Un <b>énorme tronc d’arbre</b> flotte, mais un <b>petit clou</b> coule. Pourquoi&nbsp;?',
    choix: ['C’est la taille qui compte', 'C’est la densité (ρ), pas la taille'], check: (i) => i === 1,
    sol: 'Le bois a ρ ≈ 0,6 (flotte, même énorme) ; le fer ρ ≈ 7,8 (coule, même minuscule). La taille ne décide pas.' },
];

const labo = creerLabo({
  key: 'lea.labo.densite.v1', titre: '🌊 Labo densité — flotte ou coule ?',
  badges: { premier: '🛟 Premier plongeon', final: '🌊 Maître de la flottaison' },
  scene, missions: MISSIONS,
});

function injecterCarte() {
  const accueil = $('#accueil'); if (!accueil || $('#ld-card')) return;
  const d = labo.etat(); const faites = MISSIONS.filter((m) => d.missions[m.id]).length;
  const card = document.createElement('div');
  card.className = 'lk-card'; card.id = 'ld-card';
  card.style.background = 'linear-gradient(135deg,#0b2a4a,#125a8a 60%,#0e7a9a)';
  card.innerHTML =
    '<h3>🌊 Labo densité — flotte ou coule&nbsp;?</h3>' +
    '<p>Jette une pierre, un glaçon, une balle… dans l’eau et découvre pourquoi un tronc géant flotte mais un petit clou coule. Le secret : ρ = m ÷ V.</p>' +
    `<button class="lk-cta" id="ld-open">🎮 Jouer${faites ? ' — continuer' : ''}</button>` +
    (faites ? `<span class="lk-mini">⭐ ${faites}/${MISSIONS.length}</span>` : '');
  const ancre = accueil.querySelector('#lc-card') || accueil.querySelector('#lab-card') || accueil.querySelector('p.note');
  if (ancre) accueil.insertBefore(card, ancre); else accueil.appendChild(card);
  $('#ld-open').addEventListener('click', labo.ouvrir);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injecterCarte);
else injecterCarte();
