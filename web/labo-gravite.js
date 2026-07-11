// Léa — LABO GRAVITÉ : « Odyssée gravité ».
// Écran 1 : le système solaire (on clique une planète). Écran 2 : on se pose
// sur l'astre choisi, on JETTE des objets du quotidien qui S'ACCUMULENT au sol,
// et un ROBOT vient tout nettoyer. On comprend que le poids change d'un astre à
// l'autre… mais pas la masse. 100 % ADDITIF, s'appuie sur labo-kit.js.

import { creerLabo, porteLabo, niveau } from './labo-kit.js';

const ASTRES = [
  { id: 'soleil',  nom: 'Soleil',  emoji: '☀️', g: 274,  r: 44, coul: '#ffd24a', ciel: ['#4a2a00', '#ff9a1e'], sol: '#ff7a1e', fait: 'Écrasant : 274 N/kg. Le pèse-personne explose 💥.' },
  { id: 'venus',   nom: 'Vénus',   emoji: '🟠', g: 8.9,  r: 20, coul: '#e6c15a', ciel: ['#3a2a05', '#b58a2a'], sol: '#c79b3a', fait: 'Presque comme la Terre (8,9).' },
  { id: 'terre',   nom: 'Terre',   emoji: '🌍', g: 9.8,  r: 21, coul: '#4f9e5e', ciel: ['#1a2a55', '#3f6db0'], sol: '#3a7a4a', fait: 'Ta référence : g ≈ 9,8 N/kg.' },
  { id: 'lune',    nom: 'Lune',    emoji: '🌙', g: 1.6,  r: 13, coul: '#c8c8cf', ciel: ['#05060f', '#171a2b'], sol: '#8a8a90', fait: '6× plus léger que sur Terre !' },
  { id: 'mars',    nom: 'Mars',    emoji: '🔴', g: 3.7,  r: 16, coul: '#c96a3c', ciel: ['#2a0f0a', '#7a3a22'], sol: '#a3502f', fait: 'La planète rouge : g ≈ 3,7.' },
  { id: 'jupiter', nom: 'Jupiter', emoji: '🟤', g: 24.8, r: 34, coul: '#d8a86a', ciel: ['#2a1a0a', '#8a5a2a'], sol: '#b07840', fait: 'La géante : tu y pèses très lourd !' },
  { id: 'espace',  nom: 'Espace',  emoji: '🌌', g: 0,    r: 16, coul: '#20204a', ciel: ['#000008', '#0a0a1c'], sol: '#0a0a1c', fait: 'Apesanteur : g = 0 → poids nul. Mais la masse reste !' },
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
  W = r.width || 520; H = 220;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  etoiles = Array.from({ length: 70 }, (_, i) => ({ x: ((i * 97) % 100) / 100 * W, y: ((i * 53) % 100) / 100 * H, r: (i % 3 === 0) ? 1.4 : 0.8, a: 0.25 + (i % 5) / 12 }));
  // positions des astres pour l'écran système solaire
  const midY = H / 2; bodyXY = [];
  let x = 40;
  for (const a of ASTRES) { x += a.r + 14; bodyXY.push({ id: a.id, x, y: midY + (a.id === 'lune' ? -30 : 0), r: a.r }); x += a.r + 14; }
  cv.onclick = (e) => {
    const rect = cv.getBoundingClientRect(); const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (st.vue !== 'systeme') return;
    for (const p of bodyXY) if (Math.hypot(mx - p.x, my - p.y) < p.r + 8) { api.aller(p.id); return; }
  };
}

function niceMax(p) { for (const m of [50, 100, 150, 250, 500, 1000, 2500, 5000, 10000, 30000, 100000]) if (p <= m) return m; return 200000; }

/* ------------------------------ Écran système ----------------------------- */
function dessineSysteme() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05060f'); g.addColorStop(1, '#0d1030');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const s of etoiles) { ctx.globalAlpha = s.a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  // ligne d'orbite
  ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(20, H / 2); ctx.lineTo(W - 20, H / 2); ctx.stroke();
  ctx.textAlign = 'center';
  for (const p of bodyXY) {
    const a = parAstre(p.id);
    if (a.id === 'espace') { ctx.fillStyle = '#20204a'; ctx.strokeStyle = '#5a5aa0'; }
    else { const rg = ctx.createRadialGradient(p.x - p.r / 3, p.y - p.r / 3, 2, p.x, p.y, p.r); rg.addColorStop(0, '#ffffffcc'); rg.addColorStop(0.3, a.coul); rg.addColorStop(1, '#00000088'); ctx.fillStyle = rg; }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    if (a.id === 'soleil') { ctx.fillStyle = '#ffd24a55'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 8, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; }
    ctx.fillStyle = '#dfe6f5'; ctx.font = '700 11px Fredoka, sans-serif'; ctx.fillText(a.nom, p.x, p.y + p.r + 15);
  }
  ctx.fillStyle = '#ffd24a'; ctx.font = '700 13px Fredoka, sans-serif';
  ctx.fillText('👆 Clique un astre pour t’y poser', W / 2, 20);
  ctx.textAlign = 'left';
}

/* ------------------------------ Écran surface ----------------------------- */
function dessineSurface() {
  const a = parAstre(st.astreId); const solY = H - 34;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a.ciel[0]); g.addColorStop(1, a.ciel[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (a.id === 'espace' || a.id === 'lune' || a.id === 'mars') { for (const s of etoiles) { ctx.globalAlpha = s.a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  if (a.id !== 'espace') { ctx.fillStyle = a.sol; ctx.fillRect(0, solY, W, H - solY); }

  // pèse-personne
  const gx = W - 74, gy = solY - 4, gr = 40, p = poids(), fs = niceMax(Math.max(p, st.needle, 20));
  ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(gx, gy, gr, Math.PI, 0); ctx.stroke();
  const frac = clamp(st.needle / fs, 0, 1), ang = Math.PI - frac * Math.PI;
  ctx.strokeStyle = p > fs * 1.02 ? '#ff6b6b' : '#ffd24a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(ang) * (gr - 4), gy - Math.sin(ang) * (gr - 4)); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx, gy, 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffe9a8'; ctx.font = '700 11px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`0–${fs} N`, gx, gy + 13);

  // objets posés
  for (const o of st.objets) { ctx.font = o.size + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(o.emoji, o.x, solY - 2); }
  // objet en chute
  if (st.falling) { ctx.font = st.falling.size + 'px serif'; ctx.textAlign = 'center'; ctx.fillText(st.falling.emoji, st.falling.x, st.falling.y); }
  // robot nettoyeur
  if (st.robot) dessineRobot(st.robot.x, solY);
  ctx.textAlign = 'left';
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
  if (st.vue === 'systeme') dessineSysteme(); else dessineSurface();
}

function boucle() {
  if (!api._open) { raf = 0; return; }
  const solY = H - 34;
  // chute
  if (st.falling) {
    const gg = parAstre(st.astreId).g;
    if (gg <= 0) { st.falling.y += 0.6; }
    else { st.falling.v += gg * 0.012; st.falling.y += st.falling.v; }
    if (st.falling.y >= solY - 4) { st.objets.push({ emoji: st.falling.emoji, x: st.falling.x, size: st.falling.size }); st.falling = null; }
    if (st.falling && st.falling.y > H + 40) st.falling = null; // espace : sort de l'écran
  }
  // robot
  if (st.robot) {
    st.robot.x += 3.2;
    st.objets = st.objets.filter((o) => o.x > st.robot.x + 6);
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
function majVue() {
  const sys = st.vue === 'systeme';
  $('#lg-ctrl').style.display = sys ? 'none' : '';
  $('#lg-sysline').style.display = sys ? '' : 'none';
  if (!sys) { $('#lg-fait').textContent = parAstre(st.astreId).emoji + ' ' + parAstre(st.astreId).fait; majObjChips(); }
}
function majObjChips() {
  document.querySelectorAll('#lg-objets .lk-chip').forEach((b, i) => b.classList.toggle('on', st.objet && OBJETS[i] === st.objet));
}

function scene(stage, _api) {
  api = _api;
  stage.innerHTML = `
    <canvas class="lk-cv" id="lg-cv"></canvas>
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
  api.aller = (id) => { st.astreId = id; st.vue = 'surface'; st.objets = []; st.falling = null; st.robot = null; st.needle = poids(); majVue(); };
  api.voirSysteme = () => { st.vue = 'systeme'; majVue(); };
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
    q: 'Un objet de 10 kg pèse environ <b>37 N</b> sur un astre. <b>Va sur cet astre</b> (clique-le dans le système solaire).',
    hint: 'Reviens au système solaire et clique la bonne planète (37 ÷ 10 = 3,7 N/kg).',
    prep: (a) => { a.setMasse(10); a.voirSysteme(); }, check: (_r, a) => Math.abs(a.gCourant() - 3.7) < 0.6,
    sol: '37 ÷ 10 = 3,7 N/kg → c’est Mars.' },
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
