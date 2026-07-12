// Léa — LABO GRAVITÉ : « Odyssée gravité ».
// Écran 1 : le système solaire (on clique une planète). Écran 2 : on se pose
// sur l'astre choisi, on JETTE des objets du quotidien qui S'ACCUMULENT au sol,
// et un ROBOT vient tout nettoyer. On comprend que le poids change d'un astre à
// l'autre… mais pas la masse. 100 % ADDITIF, s'appuie sur labo-kit.js.

import { creerLabo, porteLabo, niveau } from './labo-kit.js';

// Système solaire complet. g = valeurs scolaires (N/kg). type = style de rendu.
const ASTRES = [
  { id: 'soleil',  nom: 'Soleil',  g: 274,  r: 42, coul: '#ffcf3a', type: 'sun',   ciel: ['#5a2e00', '#ff9a1e'], sol: '#ff7a1e', fait: 'Écrasant : 274 N/kg. Le pèse-personne explose 💥.' },
  { id: 'mercure', nom: 'Mercure', g: 3.7,  r: 6,  coul: '#9a8f86', type: 'rocky', ciel: ['#15110e', '#6a5a4a'], sol: '#7a6a58', fait: 'Minuscule et grise : g ≈ 3,7.' },
  { id: 'venus',   nom: 'Vénus',   g: 8.9,  r: 10, coul: '#e6c27a', type: 'rocky', ciel: ['#3a2a05', '#c79a3a'], sol: '#c79b3a', fait: 'Presque comme la Terre (8,9).' },
  { id: 'terre',   nom: 'Terre',   g: 9.8,  r: 11, coul: '#3f8fd0', type: 'earth', ciel: ['#1a2a55', '#3f6db0'], sol: '#3a7a4a', fait: 'Ta référence : g ≈ 9,8 N/kg.' },
  { id: 'lune',    nom: 'Lune',    g: 1.6,  r: 5,  coul: '#c8c8cf', type: 'moon',  ciel: ['#05060f', '#171a2b'], sol: '#8a8a90', fait: '6× plus léger que sur Terre !' },
  { id: 'mars',    nom: 'Mars',    g: 3.7,  r: 8,  coul: '#c6552f', type: 'rocky', ciel: ['#2a0f0a', '#7a3a22'], sol: '#a3502f', fait: 'La planète rouge : g ≈ 3,7 (comme Mercure !).' },
  { id: 'jupiter', nom: 'Jupiter', g: 24.8, r: 22, coul: '#d8a86a', type: 'gas',   ciel: ['#2a1a0a', '#8a5a2a'], sol: '#b07840', fait: 'La géante : tu y pèses très lourd !' },
  { id: 'saturne', nom: 'Saturne', g: 10.4, r: 17, coul: '#e3cf9a', type: 'ring',  ciel: ['#2a2410', '#8a7a3a'], sol: '#b0a060', fait: 'Ses anneaux ! g ≈ 10,4.' },
  { id: 'uranus',  nom: 'Uranus',  g: 8.7,  r: 13, coul: '#a8e0e6', type: 'ice',   ciel: ['#0a2a2e', '#3a8a92'], sol: '#5aa0a6', fait: 'Glacée, bleu-vert : g ≈ 8,7.' },
  { id: 'neptune', nom: 'Neptune', g: 11.2, r: 13, coul: '#3a6ad0', type: 'ice',   ciel: ['#0a1230', '#2a4a9a'], sol: '#3a5aa0', fait: 'La plus lointaine : g ≈ 11,2.' },
  { id: 'espace',  nom: 'Espace',  g: 0,    r: 13, coul: '#20204a', type: 'space', ciel: ['#000008', '#0a0a1c'], sol: '#0a0a1c', fait: 'Apesanteur : g = 0 → poids nul. Mais la masse reste !' },
];
const parAstre = (id) => ASTRES.find((a) => a.id === id) || ASTRES[2];

const OBJETS = [
  { emoji: '💧', nom: 'Bouteille', m: 1 },
  { emoji: '🍎', nom: 'Pomme', m: 1 },
  { emoji: '🐱', nom: 'Chat', m: 4 },
  { emoji: '🎒', nom: 'Cartable', m: 6 },
  { emoji: '🐶', nom: 'Gros chien', m: 20 },
  { emoji: '🚲', nom: 'Vélo', m: 12 },
  { emoji: '🧑', nom: 'Toi', m: 45 },
];

function ressenti(p) {
  if (p <= 0) return 'ça flotte, poids nul 🎈';
  if (p < 3) return 'léger comme une plume 🪶';
  if (p < 12) return 'tu le soulèves d’un doigt';
  if (p < 40) return 'léger, comme un petit sac';
  if (p < 90) return 'comme porter un cartable bien rempli';
  if (p < 200) return 'lourd, il faut les deux bras';
  if (p < 600) return 'très lourd, difficile à décoller du sol';
  return 'impossible à soulever 😵';
}

const st = { vue: 'systeme', astreId: 'terre', masse: 6, objet: OBJETS[3], objets: [], falling: null, robot: null, needle: 0 };
const poids = () => st.masse * parAstre(st.astreId).g;

const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let cv, ctx, W, H, raf = 0, api, bodyXY = [], etoiles = [];

function initCanvas(canvas) {
  cv = canvas;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  W = r.width || 520; H = 250;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  etoiles = Array.from({ length: 90 }, (_, i) => ({ x: ((i * 97) % 100) / 100 * W, y: ((i * 53) % 100) / 100 * H, r: (i % 4 === 0) ? 1.5 : 0.8, a: 0.22 + (i % 6) / 14, tw: (i % 7) }));
  // Système solaire : Soleil à gauche, planètes en ceinture, Lune satellite.
  const cy = H / 2 - 4; bodyXY = [{ id: 'soleil', x: 2, y: cy, r: 42 }];
  let x = 82;
  for (const id of ['mercure', 'venus', 'terre', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune', 'espace']) {
    const a = parAstre(id); const pad = a.type === 'ring' ? a.r + 10 : a.r;
    x += 8 + pad; bodyXY.push({ id, x, y: cy, r: a.r }); x += pad + 8;
  }
  const terre = bodyXY.find((b) => b.id === 'terre'); bodyXY.push({ id: 'lune', x: terre.x + 15, y: cy - 22, r: 5 });
  cv.onclick = (e) => {
    if (st.vue !== 'systeme' || st.trans) return;
    const rect = cv.getBoundingClientRect(); const sx = W / rect.width;
    const mx = (e.clientX - rect.left) * sx, my = (e.clientY - rect.top) * (H / rect.height);
    let best = null, bd = 1e9;
    for (const p of bodyXY) { const d = Math.hypot(mx - p.x, my - p.y); if (d < p.r + 10 && d < bd) { bd = d; best = p; } }
    if (best) api.aller(best.id);
  };
}

function niceMax(p) { for (const m of [50, 100, 150, 250, 500, 1000, 2500, 5000, 10000, 30000, 100000]) if (p <= m) return m; return 200000; }

/* ------------------------------ Écran système ----------------------------- */
function dessineSysteme(sansHint) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04040c'); g.addColorStop(1, '#0c1030');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const s of etoiles) { const a = s.a * (0.55 + 0.45 * Math.sin(st.tick * 0.05 + s.tw)); ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  // orbites concentriques depuis le Soleil
  const sun = bodyXY[0]; ctx.strokeStyle = '#ffffff10'; ctx.lineWidth = 1;
  for (const p of bodyXY) { if (p.id === 'soleil' || p.id === 'lune') continue; ctx.beginPath(); ctx.arc(sun.x, sun.y, Math.hypot(p.x - sun.x, p.y - sun.y), -0.85, 0.85); ctx.stroke(); }
  for (const p of bodyXY) {
    const a = parAstre(p.id);
    if (a.id === 'soleil') dessineSoleil(p.x, p.y, p.r);
    else dessinePlanete(a, p.x, p.y, p.r, 1);
    if (p.id !== 'lune' && p.id !== 'soleil') { ctx.fillStyle = '#cbd8ee'; ctx.font = '700 10px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(a.nom, p.x, p.y + p.r + 13); }
  }
  const terre = bodyXY.find((b) => b.id === 'terre');
  if (terre) { ctx.strokeStyle = '#ffffff20'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(terre.x, terre.y, 17, 11, 0, 0, 7); ctx.stroke(); }
  if (!sansHint) { ctx.fillStyle = '#ffd98a'; ctx.font = '700 12px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('👆 Clique une planète pour t’y poser', W / 2, 17); }
  ctx.textAlign = 'left';
}

function dessineSoleil(x, y, r) {
  const puls = 1 + 0.05 * Math.sin(st.tick * 0.08);
  const halo = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.5 * puls);
  halo.addColorStop(0, 'rgba(255,205,70,.5)'); halo.addColorStop(0.5, 'rgba(255,150,30,.16)'); halo.addColorStop(1, 'rgba(255,150,30,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r * 2.5 * puls, 0, 7); ctx.fill();
  const core = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
  core.addColorStop(0, '#fff6c8'); core.addColorStop(0.5, '#ffd24a'); core.addColorStop(1, '#ff8a1e');
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}

function dessinePlanete(a, x, y, r, alpha) {
  ctx.save(); ctx.globalAlpha = alpha;
  if (a.type === 'ring') { ctx.strokeStyle = '#d8c890'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, r * 1.95, r * 0.62, -0.35, Math.PI * 0.12, Math.PI * 1.02); ctx.stroke(); }
  const rg = ctx.createRadialGradient(x - r * 0.34, y - r * 0.34, r * 0.15, x, y, r);
  rg.addColorStop(0, '#ffffffcc'); rg.addColorStop(0.35, a.coul); rg.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = a.type === 'space' ? '#0a0a1c' : rg;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
  if (a.type === 'earth') { ctx.fillStyle = '#3f9e5e'; ctx.beginPath(); ctx.ellipse(x - r * 0.2, y + r * 0.12, r * 0.5, r * 0.34, 0.4, 0, 7); ctx.ellipse(x + r * 0.36, y - r * 0.3, r * 0.3, r * 0.22, 0, 0, 7); ctx.fill(); }
  if (a.type === 'gas' || a.type === 'ring') {
    for (let i = -2; i <= 2; i++) { ctx.globalAlpha = alpha * 0.45; ctx.fillStyle = i % 2 ? '#00000030' : '#ffffff2a'; ctx.beginPath(); ctx.ellipse(x, y + i * r * 0.32, r, r * 0.15, 0, 0, 7); ctx.fill(); }
    if (a.type === 'gas') { ctx.globalAlpha = alpha * 0.7; ctx.fillStyle = '#c0432a'; ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.24, r * 0.22, r * 0.13, 0, 0, 7); ctx.fill(); }
    ctx.globalAlpha = alpha;
  }
  if (a.type === 'space') { ctx.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { ctx.globalAlpha = alpha * (0.4 + (i % 3) * 0.2); ctx.beginPath(); ctx.arc(x - r + (i * 71 % (2 * r)), y - r + (i * 43 % (2 * r)), 0.9, 0, 7); ctx.fill(); } ctx.globalAlpha = alpha; }
  ctx.restore();
  if (a.type === 'ring') { ctx.strokeStyle = '#f0e2b0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, r * 1.95, r * 0.62, -0.35, Math.PI * 1.02, Math.PI * 2.12); ctx.stroke(); }
  ctx.restore();
}

/* ------------------------------ Écran surface ----------------------------- */
function dessineSurface() {
  const a = parAstre(st.astreId); const solY = H - 34;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a.ciel[0]); g.addColorStop(1, a.ciel[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const nuit = ['espace', 'lune', 'mars', 'mercure'].includes(a.id);
  if (nuit) { for (const s of etoiles) { const al = s.a * (0.55 + 0.45 * Math.sin(st.tick * 0.05 + s.tw)); ctx.globalAlpha = Math.max(0, al); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y * 0.78, s.r, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  else if (a.id !== 'espace') { ctx.globalAlpha = 0.85; ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(44, 32, 11, 0, 7); ctx.fill(); ctx.globalAlpha = 0.16; ctx.beginPath(); ctx.arc(44, 32, 22, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  if (a.id !== 'espace') {
    ctx.fillStyle = a.sol; ctx.fillRect(0, solY, W, H - solY);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, solY, W, 3);
    ctx.fillStyle = 'rgba(0,0,0,.13)'; for (let i = 0; i < 7; i++) { const rx = (i * 89 + 30) % W; ctx.beginPath(); ctx.ellipse(rx, solY + 14 + (i % 2) * 9, 9 + (i % 3) * 4, 3, 0, 0, 7); ctx.fill(); }
  }

  // pèse-personne
  const gx = W - 74, gy = solY - 4, gr = 40, p = poids(), fs = niceMax(Math.max(p, st.needle, 20));
  ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(gx, gy, gr, Math.PI, 0); ctx.stroke();
  const frac = clamp(st.needle / fs, 0, 1), ang = Math.PI - frac * Math.PI;
  ctx.strokeStyle = p > fs * 1.02 ? '#ff6b6b' : '#ffd24a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(ang) * (gr - 4), gy - Math.sin(ang) * (gr - 4)); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx, gy, 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffe9a8'; ctx.font = '700 11px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`0–${fs} N`, gx, gy + 13);

  // objets posés (avec ombre au sol)
  for (const o of st.objets) {
    if (a.id !== 'espace') { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(o.x, solY - 1, o.size * 0.34, 3, 0, 0, 7); ctx.fill(); }
    ctx.font = o.size + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(o.emoji, o.x, solY - 2);
  }
  if (st.falling) { ctx.font = st.falling.size + 'px serif'; ctx.textAlign = 'center'; ctx.fillText(st.falling.emoji, st.falling.x, st.falling.y); }
  dessinePoufs();
  if (st.robot) dessineRobot(st.robot.x, solY);
  ctx.textAlign = 'left';
}

function dessinePoufs() {
  if (!st.poufs || !st.poufs.length) return;
  const now = performance.now();
  st.poufs = st.poufs.filter((pf) => now - pf.start < 420);
  for (const pf of st.poufs) { const e = (now - pf.start) / 420; ctx.globalAlpha = 1 - e; ctx.fillStyle = '#ffffffcc'; for (let k = 0; k < 6; k++) { const an = k / 6 * 6.28; const r = 6 + e * 16; ctx.beginPath(); ctx.arc(pf.x + Math.cos(an) * r, pf.y - Math.abs(Math.sin(an)) * r * 0.5 - e * 6, 2 - e * 1.5, 0, 7); ctx.fill(); } }
  ctx.globalAlpha = 1;
}

function dessineRobot(x, solY) {
  ctx.save(); ctx.translate(x, solY);
  // roues
  ctx.fillStyle = '#2a3550'; ctx.beginPath(); ctx.arc(-8, -4, 5, 0, 7); ctx.arc(8, -4, 5, 0, 7); ctx.fill();
  // corps
  ctx.fillStyle = '#9fb0cc'; ctx.strokeStyle = '#dfe6f5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-13, -34, 26, 26, 6); ctx.fill(); ctx.stroke();
  // tête
  ctx.beginPath(); ctx.roundRect(-9, -48, 18, 14, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#14c8d4'; ctx.beginPath(); ctx.arc(-3, -41, 2.4, 0, 7); ctx.arc(3, -41, 2.4, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(0, -54); ctx.stroke(); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(0, -55, 2, 0, 7); ctx.fill();
  // balai / aspirateur devant
  ctx.strokeStyle = '#c98a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(13, -20); ctx.lineTo(24, -2); ctx.stroke();
  ctx.fillStyle = '#e0c98a'; ctx.beginPath(); ctx.moveTo(20, -4); ctx.lineTo(30, -4); ctx.lineTo(27, 2); ctx.lineTo(19, 2); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function dessiner() {
  if (!ctx) return;
  if (st.trans) { dessineTransition(); return; }
  if (st.vue === 'systeme') dessineSysteme(); else dessineSurface();
}
function dessineTransition() {
  const t = st.trans.t, f = st.trans.from, a = parAstre(st.trans.id);
  const s = 1 + t * t * 9;
  ctx.save(); ctx.translate(f.x, f.y); ctx.scale(s, s); ctx.translate(-f.x, -f.y); dessineSysteme(true); ctx.restore();
  const cover = Math.min(1, Math.max(0, (t - 0.4) * 1.9));
  if (cover > 0) { ctx.globalAlpha = cover; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a.ciel[0]); g.addColorStop(1, a.ciel[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

function boucle() {
  if (!api._open) { raf = 0; return; }
  st.tick = (st.tick || 0) + 1;
  if (st.trans) { st.trans.t = Math.min(1, (performance.now() - st.trans.start) / 460); if (st.trans.t >= 1) { const id = st.trans.id; st.trans = null; doLand(id); } dessiner(); raf = requestAnimationFrame(boucle); return; }
  const solY = H - 34;
  // chute
  if (st.falling) {
    const gg = parAstre(st.astreId).g;
    if (gg <= 0) { st.falling.y += 0.6; }
    else { st.falling.v += gg * 0.012; st.falling.y += st.falling.v; }
    if (st.falling.y >= solY - 4) { const fx = st.falling.x; st.objets.push({ emoji: st.falling.emoji, x: fx, size: st.falling.size }); st.falling = null; if (parAstre(st.astreId).g > 0) (st.poufs ??= []).push({ x: fx, y: solY, start: performance.now() }); }
    if (st.falling && st.falling.y > H + 40) st.falling = null; // espace : sort de l'écran
  }
  // robot : balaie et fait « pouf » sur chaque objet ramassé
  if (st.robot) {
    st.robot.x += 3.2;
    const reste = [];
    for (const o of st.objets) { if (o.x > st.robot.x + 6) reste.push(o); else (st.poufs ??= []).push({ x: o.x, y: solY, start: performance.now() }); }
    st.objets = reste;
    if (st.robot.x > W + 40) st.robot = null;
  }
  // aiguille ressort
  const cible = poids(); st.needle += (cible - st.needle) * 0.16; if (Math.abs(cible - st.needle) < 0.3) st.needle = cible;
  dessiner();
  if (st.vue === 'surface') majReadout();
  raf = requestAnimationFrame(boucle);
}

function majReadout() {
  const p = poids(); const vP = $('#lg-P'); if (!vP) return;
  vP.textContent = p >= 1000 ? Math.round(p) : p.toFixed(p < 100 ? 1 : 0);
  $('#lg-M').textContent = st.masse; $('#lg-G').textContent = parAstre(st.astreId).g;
  const r = $('#lg-note'); const a = parAstre(st.astreId);
  const quoi = st.objet ? `${st.objet.emoji} ${st.objet.nom} (${st.objet.m} kg)` : `${st.masse} kg`;
  if (r) r.innerHTML = `Sur <b>${a.nom}</b>, ${quoi} pèse <b>${p < 100 ? p.toFixed(1) : Math.round(p)} N</b> → ${ressenti(p)}`;
}

function jeter() {
  st.falling = { emoji: st.objet ? st.objet.emoji : '📦', size: 24 + clamp(st.masse, 1, 60) / 3, x: 60 + (st.objets.length * 43) % Math.max(120, W - 170), y: 12, v: 0 };
}

/* --------------------------------- Scène ---------------------------------- */
function doLand(id) { st.astreId = id; st.vue = 'surface'; st.objets = []; st.falling = null; st.robot = null; st.needle = st.masse * parAstre(id).g; majVue(); }

function majVue() {
  const sys = st.vue === 'systeme';
  $('#lg-ctrl').style.display = sys ? 'none' : '';
  $('#lg-sysline').style.display = sys ? '' : 'none';
  if (!sys) { $('#lg-fait').textContent = parAstre(st.astreId).nom + ' — ' + parAstre(st.astreId).fait; majObjChips(); }
}
function majObjChips() {
  document.querySelectorAll('#lg-objets .lk-chip').forEach((b, i) => b.classList.toggle('on', st.objet && OBJETS[i] === st.objet));
}

function scene(stage, _api) {
  api = _api;
  stage.innerHTML = `
    <canvas class="lk-cv" id="lg-cv" style="height:250px"></canvas>
    <div id="lg-sysline" class="lk-note" style="margin:8px 12px">🪐 Choisis un astre là-haut : ta masse ne changera pas, mais ton poids, oui&nbsp;!</div>
    <div class="lk-read" id="lg-read">
      <div><div class="k">Masse</div><div class="v a"><span id="lg-M">6</span> kg</div></div>
      <div><div class="k">Gravité g</div><div class="v b"><span id="lg-G">9.8</span> N/kg</div></div>
      <div><div class="k">Poids P</div><div class="v c"><span id="lg-P">59</span> N</div></div>
    </div>
    <div class="lk-ctrl" id="lg-ctrl">
      <div class="lk-line">Prends un objet et jette-le sur le sol :</div>
      <div class="lk-chips" id="lg-objets"></div>
      <div class="lk-slide"><label>…ou règle la masse</label><input id="lg-masse" type="range" min="1" max="100" step="1" value="6"><span class="val" id="lg-masse-l">6 kg</span></div>
      <div class="lk-act">
        <button class="lk-btn gold" id="lg-jeter">🪂 Jeter l’objet</button>
        <button class="lk-btn" id="lg-clean">🤖 Nettoyer</button>
        <button class="lk-btn" id="lg-back">🪐 Système solaire</button>
      </div>
      <div class="lk-fait" id="lg-fait"></div>
    </div>`;
  const oz = $('#lg-objets', stage);
  oz.innerHTML = OBJETS.map((o, i) => `<button class="lk-chip" data-o="${i}">${o.emoji} ${o.nom}<span class="mk">${o.m} kg</span></button>`).join('');
  oz.querySelectorAll('[data-o]').forEach((b) => b.addEventListener('click', () => {
    st.objet = OBJETS[+b.dataset.o]; st.masse = st.objet.m; $('#lg-masse', stage).value = st.masse; $('#lg-masse-l', stage).textContent = st.masse + ' kg'; majObjChips();
  }));
  const sl = $('#lg-masse', stage);
  sl.addEventListener('input', () => { st.masse = +sl.value; st.objet = null; $('#lg-masse-l', stage).textContent = st.masse + ' kg'; majObjChips(); });
  $('#lg-jeter', stage).addEventListener('click', jeter);
  $('#lg-clean', stage).addEventListener('click', () => { if (!st.robot && st.objets.length) st.robot = { x: -30 }; });
  $('#lg-back', stage).addEventListener('click', () => { st.vue = 'systeme'; majVue(); });

  api.poids = () => poids(); api.gCourant = () => parAstre(st.astreId).g; api.masse = () => st.masse; api.astreId = () => st.astreId;
  api.aller = (id) => {
    if (st.trans) return;
    const from = bodyXY && bodyXY.find((b) => b.id === id);
    if (from && st.vue === 'systeme' && !document.hidden) { st.trans = { id, t: 0, from, start: performance.now() }; }
    else doLand(id);
  };
  api.voirSysteme = () => { st.trans = null; st.vue = 'systeme'; majVue(); };
  api.setMasse = (m) => { st.masse = m; st.objet = null; if ($('#lg-masse')) { $('#lg-masse').value = m; $('#lg-masse-l').textContent = m + ' kg'; } majObjChips(); };
  api.onOpen = () => { api._open = true; initCanvas($('#lg-cv', stage)); majVue(); if (!raf) raf = requestAnimationFrame(boucle); };
  api.onClose = () => { api._open = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } };
}

const MISSIONS = [
  { id: 'm1', xp: 20, titre: 'Premier pesage', ui: 'num', unite: 'N',
    q: 'Pose-toi sur la <b>Terre</b>, objet de <b>6 kg</b>. D’après <b>P = m × g</b> (g ≈ 9,8), combien pèse-t-il&nbsp;?',
    prep: (a) => { a.aller('terre'); a.setMasse(6); }, check: (v) => Math.abs(v - 6 * 9.8) <= 9,
    sol: 'P = 6 × 9,8 ≈ 59 N (≈ 60 avec g = 10).' },
  { id: 'm2', xp: 20, titre: 'Direction la Lune', ui: 'choix',
    q: 'Tu emmènes le même objet (6 kg) sur la <b>Lune</b>. Son <b>POIDS</b> va…',
    choix: ['augmenter', 'diminuer', 'rester identique'], check: (i) => i === 1, prep: (a) => a.aller('lune'),
    sol: 'Sur la Lune g ≈ 1,6 → P ≈ 9,6 N. Bien plus petit !' },
  { id: 'm3', xp: 20, titre: 'Le piège classique', ui: 'choix',
    q: 'Et sa <b>MASSE</b>, sur la Lune&nbsp;?',
    choix: ['augmente', 'diminue', 'reste 6 kg'], check: (i) => i === 2,
    sol: 'La masse ne change JAMAIS d’un astre à l’autre. Seul le poids varie.' },
  { id: 'm4', xp: 25, titre: 'Enquête gravité', ui: 'live',
    q: 'Un objet de 10 kg pèse environ <b>37 N</b> sur un astre. <b>Va sur un astre qui convient</b> (clique-le dans le système solaire).',
    hint: 'Reviens au système solaire et clique une planète où g ≈ 3,7 (37 ÷ 10 = 3,7 N/kg).',
    prep: (a) => { a.setMasse(10); a.voirSysteme(); }, check: (_r, a) => Math.abs(a.gCourant() - 3.7) < 0.6,
    sol: '37 ÷ 10 = 3,7 N/kg → Mars… ou Mercure ! Deux astres différents peuvent avoir le même g.' },
  { id: 'm5', xp: 30, titre: 'Mission mystère : 100 N', ui: 'live',
    q: 'Choisis un astre et une <b>masse</b> pour que ton objet pèse <b>exactement 100 N</b> (± 6).',
    hint: 'Ex. : 10 kg sur Terre. Change de planète et ajuste la masse.',
    check: (_r, a) => Math.abs(a.poids() - 100) <= 6, sol: '10 kg sur Terre ≈ 98 N. Ou ~62 kg sur la Lune, ou ~4 kg sur Jupiter…' },
  { id: 'm6', xp: 25, titre: 'Chute libre', ui: 'choix',
    q: 'On lâche le même objet d’en haut sur la <b>Terre</b> et sur la <b>Lune</b>. Où touche-t-il le sol en PREMIER&nbsp;?',
    choix: ['Terre', 'Lune'], check: (i) => i === 0, prep: (a) => a.aller('terre'),
    sol: 'Plus g est grand, plus la chute est rapide : la Terre gagne. (Jette un objet ici puis sur la Lune pour voir !)' },
];

const labo = creerLabo({
  key: 'lea.labo.v1', titre: '🚀 Labo gravité — Odyssée', couleur: '#a463e6',
  badges: { premier: '🛰️ Décollage', final: '🚀 Explorateur du système solaire' },
  scene, missions: MISSIONS,
});

function injecterCarte() {
  const d = labo.etat(); const faites = MISSIONS.filter((m) => d.missions[m.id]).length;
  porteLabo({
    id: 'porte-gravite', ordre: 1, icone: '🚀', couleur: '#a463e6',
    titre: 'Labo gravité', sousTitre: 'Voyage dans le système solaire : la masse ne change pas, le poids si.',
    faites, total: MISSIONS.length, niv: niveau(d.xp), ouvrir: labo.ouvrir,
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injecterCarte);
else injecterCarte();
