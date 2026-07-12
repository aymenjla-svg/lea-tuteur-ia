// Léa — LABO DENSITÉ : « flotte ou coule ? » (ρ = m ÷ V) par l'expérience.
// L'élève jette des objets du quotidien dans l'eau ; ils S'ACCUMULENT (les
// flotteurs surnagent, les autres coulent au fond), puis un PLONGEUR vient tout
// ramasser. Objets dessinés proprement. 100 % ADDITIF, s'appuie sur labo-kit.js.

import { creerLabo, porteLabo, niveau } from './labo-kit.js';

// ρ en kg/L (= g/cm³) ; eau = 1. m en kg, V en L. kind = dessin.
const OBJETS = [
  { kind: 'glace', nom: 'Glaçon', m: 0.9, V: 1 },
  { kind: 'bois', nom: 'Bois', m: 0.6, V: 1 },
  { kind: 'pomme', nom: 'Pomme', m: 0.85, V: 1 },
  { kind: 'huile', nom: 'Goutte d’huile', m: 0.92, V: 1 },
  { kind: 'pierre', nom: 'Pierre', m: 2.6, V: 1 },
  { kind: 'fer', nom: 'Trombone (fer)', m: 7.8, V: 1 },
  { kind: 'balle', nom: 'Balle légère', m: 0.1, V: 1 },
];
const EMOJI = { glace: '🧊', bois: '🪵', pomme: '🍎', huile: '🛢️', pierre: '🪨', fer: '📎', balle: '🎈', flask: '🧪' };
const st = { m: 1, V: 1, kind: 'flask', items: [], diver: null, nDrop: 0 };
const rho = () => st.m / Math.max(st.V, 0.001);
const flotte = () => rho() < 1;

const $ = (s, r = document) => r.querySelector(s);
let cv, ctx, W, H, raf = 0, api, waterTop = 62, bulles = [];

function initCanvas(canvas) {
  cv = canvas;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  W = r.width || 520; H = 220;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bulles = Array.from({ length: 16 }, (_, i) => ({ x: ((i * 61) % 100) / 100 * W, y: waterTop + ((i * 37) % 100) / 100 * (H - waterTop), sp: 0.3 + (i % 4) * 0.18, r: 1 + (i % 3) * 0.7, w: i }));
}
const surfaceY = (x) => waterTop + Math.sin(x * 0.05 + (st.tick || 0) * 0.06) * 2.6;

/* --------------------------- Dessins des objets --------------------------- */
function dessineObjet(kind, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.lineWidth = 2; ctx.lineJoin = 'round';
  const h = s / 2;
  if (kind === 'glace') {
    ctx.fillStyle = '#bfe9ff'; ctx.strokeStyle = '#7fc4e6';
    ctx.beginPath(); ctx.roundRect(-h, -h, s, s, 5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ffffffaa'; ctx.beginPath(); ctx.moveTo(-h + 4, -h + 5); ctx.lineTo(-h + 4, h - 4); ctx.moveTo(-h + 4, -h + 5); ctx.lineTo(h - 5, -h + 5); ctx.stroke();
  } else if (kind === 'bois') {
    ctx.fillStyle = '#a9713f'; ctx.strokeStyle = '#7a5230'; ctx.beginPath(); ctx.roundRect(-h, -h * 0.55, s, s * 0.55, 4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#8a5a30'; ctx.beginPath(); ctx.moveTo(-h + 3, -2); ctx.lineTo(h - 3, -2); ctx.moveTo(-h + 3, 3); ctx.lineTo(h - 3, 3); ctx.stroke();
  } else if (kind === 'pomme') {
    ctx.fillStyle = '#e0402f'; ctx.beginPath(); ctx.arc(-3, 2, h - 1, 0, 7); ctx.arc(3, 2, h - 1, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -h + 2); ctx.lineTo(0, -h - 3); ctx.stroke();
    ctx.fillStyle = '#4fae4f'; ctx.beginPath(); ctx.ellipse(4, -h - 2, 4, 2.4, -0.5, 0, 7); ctx.fill();
  } else if (kind === 'huile') {
    ctx.fillStyle = '#e6c15a'; ctx.strokeStyle = '#b58a2a';
    ctx.beginPath(); ctx.moveTo(0, -h); ctx.bezierCurveTo(h, -h * 0.2, h, h, 0, h); ctx.bezierCurveTo(-h, h, -h, -h * 0.2, 0, -h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff6cc'; ctx.beginPath(); ctx.ellipse(-3, 0, 2, 4, 0, 0, 7); ctx.fill();
  } else if (kind === 'pierre') {
    ctx.fillStyle = '#8a8f98'; ctx.strokeStyle = '#5f636b';
    ctx.beginPath(); ctx.moveTo(-h, 2); ctx.lineTo(-h * 0.5, -h); ctx.lineTo(h * 0.6, -h * 0.7); ctx.lineTo(h, h * 0.2); ctx.lineTo(h * 0.3, h); ctx.lineTo(-h * 0.7, h * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#6f747d'; ctx.beginPath(); ctx.moveTo(-h * 0.3, -h * 0.3); ctx.lineTo(h * 0.3, 0); ctx.stroke();
  } else if (kind === 'fer') {
    ctx.strokeStyle = '#c7ccd6'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-h * 0.5, -h, s * 0.5, s, h * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-h * 0.2, -h * 0.7, s * 0.28, s * 0.7, 3); ctx.stroke();
  } else if (kind === 'balle') {
    ctx.fillStyle = '#ff7aa8'; ctx.strokeStyle = '#d84f80'; ctx.beginPath(); ctx.arc(0, 0, h, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ffffffcc'; ctx.beginPath(); ctx.arc(0, 0, h, -0.6, 0.6); ctx.stroke();
    ctx.fillStyle = '#ffffff99'; ctx.beginPath(); ctx.arc(-h * 0.35, -h * 0.35, h * 0.22, 0, 7); ctx.fill();
  } else { // flask générique
    ctx.fillStyle = '#14c8d4'; ctx.strokeStyle = '#0e9aa4';
    ctx.beginPath(); ctx.moveTo(-3, -h); ctx.lineTo(3, -h); ctx.lineTo(3, -2); ctx.lineTo(h, h); ctx.lineTo(-h, h); ctx.lineTo(-3, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function dessineDiver(x, y) {
  ctx.save(); ctx.translate(x, y);
  // palmes
  ctx.fillStyle = '#1e6a4a'; ctx.beginPath(); ctx.ellipse(-16, 8, 7, 3, -0.4, 0, 7); ctx.ellipse(-16, 15, 7, 3, 0.4, 0, 7); ctx.fill();
  // corps
  ctx.fillStyle = '#16324f'; ctx.strokeStyle = '#0c2036'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-14, 0, 22, 12, 6); ctx.fill(); ctx.stroke();
  // bouteille d'air
  ctx.fillStyle = '#c7ccd6'; ctx.beginPath(); ctx.roundRect(-18, -2, 6, 12, 3); ctx.fill();
  // tête + masque
  ctx.fillStyle = '#f0c9a0'; ctx.beginPath(); ctx.arc(10, 5, 7, 0, 7); ctx.fill();
  ctx.fillStyle = '#7fd8ff'; ctx.beginPath(); ctx.arc(12, 4, 3.4, 0, 7); ctx.fill();
  // bras qui ramasse
  ctx.strokeStyle = '#16324f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(6, 4); ctx.lineTo(18, 12); ctx.stroke();
  // bulles
  ctx.fillStyle = '#ffffff88'; ctx.beginPath(); ctx.arc(16, -4, 2, 0, 7); ctx.arc(20, -10, 1.4, 0, 7); ctx.fill();
  ctx.restore();
}

function dessiner() {
  if (!ctx) return;
  const ph = (st.tick || 0) * 0.06;
  ctx.fillStyle = '#081020'; ctx.fillRect(0, 0, W, H);
  // ciel léger au-dessus de l'eau
  ctx.fillStyle = '#12314f'; ctx.fillRect(0, 34, W, waterTop - 34);
  // eau à surface ondulée
  const g = ctx.createLinearGradient(0, waterTop, 0, H); g.addColorStop(0, '#2a8fc8cc'); g.addColorStop(1, '#0a355f');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, surfaceY(x)); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  // caustiques (reflets ondulants)
  ctx.strokeStyle = '#bfeaff1c'; ctx.lineWidth = 5;
  for (let j = 0; j < 3; j++) { ctx.beginPath(); const yy = waterTop + 22 + j * 34; for (let x = 0; x <= W; x += 10) { const o = Math.sin(x * 0.045 + ph * (1 + j * 0.3)) * 4; x === 0 ? ctx.moveTo(x, yy + o) : ctx.lineTo(x, yy + o); } ctx.stroke(); }
  // bulles ambiantes
  ctx.fillStyle = '#ffffff33'; for (const bu of bulles) { ctx.beginPath(); ctx.arc(bu.x + Math.sin(ph + bu.w) * 2, bu.y, bu.r, 0, 7); ctx.fill(); }
  // ligne de surface
  ctx.strokeStyle = '#9be6ff'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = 0; x <= W; x += 8) { const yy = surfaceY(x); x === 0 ? ctx.moveTo(0, yy) : ctx.lineTo(x, yy); } ctx.stroke();
  ctx.fillStyle = '#9be6ff'; ctx.font = '700 11px Lexend, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('surface (ρ = 1)', 8, waterTop - 7);
  ctx.strokeStyle = '#ffffff2e'; ctx.lineWidth = 3; ctx.strokeRect(4, 34, W - 8, H - 40);

  for (const it of st.items) dessineObjet(it.kind, it.x, it.y, it.size);
  // éclaboussure
  if (st.splash) { const e = (performance.now() - st.splash.start) / 380; if (e < 1) { ctx.fillStyle = `rgba(180,235,255,${1 - e})`; for (let k = 0; k < 7; k++) { const a = -Math.PI + k / 6 * Math.PI, r = e * 22; ctx.beginPath(); ctx.arc(st.splash.x + Math.cos(a) * r, surfaceY(st.splash.x) - Math.abs(Math.sin(a)) * r * 1.2 + e * e * 20, 2 - e * 1.4, 0, 7); ctx.fill(); } } else st.splash = null; }
  if (st.diver) dessineDiver(st.diver.x, st.diver.y);
}

function tankBottom() { return H - 16; }

function jeter() {
  const size = 30 + Math.min(46, st.V * 12);
  const x = 34 + (st.nDrop * 47) % Math.max(90, W - 80);
  st.nDrop++;
  st.items.push({ kind: st.kind, rho: rho(), x, y: waterTop - 40, vy: 0, size, settled: false });
}

function majItems(t) {
  const sunk = st.items.filter((i) => i.rho >= 1 && i.settled).length;
  let sunkIdx = 0;
  for (const it of st.items) {
    const half = it.size / 2;
    let target;
    if (it.rho < 1) { const frac = Math.max(0.12, Math.min(0.95, it.rho)); target = waterTop - half + frac * it.size; }
    else { const row = sunkIdx % 6; target = tankBottom() - half - Math.floor(sunkIdx / 6) * (it.size * 0.5); it._rowx = 34 + row * ((W - 90) / 6); sunkIdx++; }
    if (!it.settled) {
      const prev = it.y; it.vy += 0.55; it.y += it.vy;
      if (prev < waterTop && it.y >= waterTop) st.splash = { x: it.x, start: performance.now() };
      if (it.y >= target) { it.y = target; it.settled = true; it.vy = 0; }
    } else if (it.rho < 1) { it.y = target + Math.sin(t / 500 + it.x) * 1.6; } // flotteurs : houle légère
    else { it.y = target; }
  }
}

function boucle(now) {
  if (!api._open) { raf = 0; return; }
  st.tick = (st.tick || 0) + 1;
  for (const bu of bulles) { bu.y -= bu.sp; if (bu.y < waterTop + 2) { bu.y = H - 6; bu.x = (bu.x * 7 + 53) % Math.max(1, W); } }
  majItems(now || 0);
  if (st.diver) {
    st.diver.x += 3.4;
    st.items = st.items.filter((it) => it.x > st.diver.x - 6);
    if (st.diver.x > W + 40) st.diver = null;
  }
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
      <div class="lk-line">Choisis un objet, puis jette-le dans l’eau :</div>
      <div class="lk-chips" id="ld-obj"></div>
      <div class="lk-slide"><label>Masse</label><input id="ld-sm" type="range" min="0.1" max="10" step="0.1" value="1"><span class="val" id="ld-sml">1.0 kg</span></div>
      <div class="lk-slide"><label>Volume</label><input id="ld-sv" type="range" min="0.1" max="6" step="0.1" value="1"><span class="val" id="ld-svl">1.0 L</span></div>
      <div class="lk-act">
        <button class="lk-btn gold" id="ld-drop">💦 Jeter dans l’eau</button>
        <button class="lk-btn" id="ld-clean">🤿 Le plongeur nettoie</button>
      </div>
      <div class="lk-note" id="ld-note"></div>
    </div>`;
  const oz = $('#ld-obj', stage);
  oz.innerHTML = OBJETS.map((o, i) => `<button class="lk-chip" data-o="${i}">${EMOJI[o.kind]} ${o.nom}</button>`).join('');
  oz.querySelectorAll('[data-o]').forEach((b) => b.addEventListener('click', () => api.setObjet(+b.dataset.o)));
  const sm = $('#ld-sm', stage), sv = $('#ld-sv', stage);
  const maj = () => { $('#ld-sml', stage).textContent = st.m.toFixed(1) + ' kg'; $('#ld-svl', stage).textContent = st.V.toFixed(1) + ' L'; };
  const libre = () => { st.kind = 'flask'; oz.querySelectorAll('.lk-chip').forEach((x) => x.classList.remove('on')); };
  sm.addEventListener('input', () => { st.m = +sm.value; libre(); maj(); });
  sv.addEventListener('input', () => { st.V = +sv.value; libre(); maj(); });
  $('#ld-drop', stage).addEventListener('click', jeter);
  $('#ld-clean', stage).addEventListener('click', () => { if (!st.diver && st.items.length) st.diver = { x: -30, y: (waterTop + H) / 2 }; });

  api.rho = () => rho(); api.flotte = () => flotte();
  api.setObjet = (i) => { const o = OBJETS[i]; st.m = o.m; st.V = o.V; st.kind = o.kind; sm.value = o.m; sv.value = o.V; maj(); oz.querySelectorAll('.lk-chip').forEach((x, k) => x.classList.toggle('on', k === i)); };
  api.onOpen = () => { api._open = true; initCanvas($('#ld-cv', stage)); st.items = []; st.diver = null; st.nDrop = 0; if (!raf) raf = requestAnimationFrame(boucle); };
  api.onClose = () => { api._open = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  maj();
}

const MISSIONS = [
  { id: 'd1', xp: 20, titre: 'La pierre', ui: 'choix',
    q: 'Tu jettes une <b>pierre</b> (ρ = 2,6 kg/L) dans l’eau. Elle…',
    choix: ['flotte', 'coule'], check: (i) => i === 1, prep: (a) => a.setObjet(4),
    sol: 'ρ = 2,6 > 1 : plus dense que l’eau → elle coule.' },
  { id: 'd2', xp: 20, titre: 'Le glaçon (et l’iceberg)', ui: 'choix',
    q: 'Et un <b>glaçon</b> (ρ = 0,9 kg/L)&nbsp;? Il…',
    choix: ['flotte', 'coule'], check: (i) => i === 0, prep: (a) => a.setObjet(0),
    sol: 'ρ = 0,9 < 1 → il flotte à peine émergé : comme un iceberg, presque tout est sous l’eau.' },
  { id: 'd3', xp: 25, titre: 'Le vrai secret', ui: 'choix',
    q: 'Deux objets de la <b>même taille</b> : l’un flotte, l’autre coule. Ce qui décide, c’est…',
    choix: ['leur couleur', 'leur masse volumique ρ', 'leur forme'], check: (i) => i === 1,
    sol: 'À volume égal, c’est la masse (donc ρ = m/V) qui fait la différence.' },
  { id: 'd4', xp: 30, titre: 'Fabrique un flotteur', ui: 'live',
    q: 'Avec les curseurs, fabrique un objet qui <b>FLOTTE</b> (donc ρ &lt; 1 kg/L), puis jette-le pour vérifier.',
    hint: 'Baisse la masse ou augmente le volume jusqu’à ρ &lt; 1.',
    check: (_r, a) => a.rho() < 1, sol: 'Dès que m ÷ V passe sous 1, l’objet est moins dense que l’eau : il remonte.' },
  { id: 'd5', xp: 30, titre: 'Tronc vs clou', ui: 'choix',
    q: 'Un <b>énorme tronc</b> flotte, un <b>petit clou</b> coule. Pourquoi&nbsp;?',
    choix: ['C’est la taille qui compte', 'C’est la densité (ρ), pas la taille'], check: (i) => i === 1,
    sol: 'Le bois a ρ ≈ 0,6 (flotte, même énorme) ; le fer ρ ≈ 7,8 (coule, même minuscule).' },
];

const labo = creerLabo({
  key: 'lea.labo.densite.v1', titre: '🌊 Labo densité — flotte ou coule ?', couleur: '#2aa6e0',
  badges: { premier: '🛟 Premier plongeon', final: '🌊 Maître de la flottaison' },
  scene, missions: MISSIONS,
});

function injecterCarte() {
  const d = labo.etat(); const faites = MISSIONS.filter((m) => d.missions[m.id]).length;
  porteLabo({
    id: 'porte-densite', ordre: 3, icone: '🌊', couleur: '#2aa6e0',
    titre: 'Labo densité', sousTitre: 'Flotte ou coule ? Jette des objets, un plongeur nettoie.',
    faites, total: MISSIONS.length, niv: niveau(d.xp), ouvrir: labo.ouvrir,
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injecterCarte);
else injecterCarte();
