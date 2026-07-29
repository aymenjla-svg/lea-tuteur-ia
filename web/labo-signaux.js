// Léa — LABO SIGNAUX : lumière vs son (v = d ÷ t).
// L'élève déclenche un éclair : la lumière arrive INSTANTANÉMENT, puis l'onde
// sonore traverse la distance à 340 m/s → il VOIT le retard du tonnerre (le
// délai réel = d ÷ 340). Comme pendant un orage. 100 % ADDITIF (labo-kit).

import { creerLabo, porteLabo, niveau } from './labo-kit.js';

const VSON = 340; // m/s
const st = { d: 680, flash: 0, sound: null, heard: 0, tick: 0 };

const $ = (s, r = document) => r.querySelector(s);
let cv, ctx, W, H, raf = 0, api, etoiles = [];

function initCanvas(canvas) {
  cv = canvas;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  W = r.width || 520; H = 220;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  etoiles = Array.from({ length: 40 }, (_, i) => ({ x: ((i * 83) % 100) / 100 * W, y: ((i * 47) % 100) / 100 * (H - 40), r: (i % 3 === 0) ? 1.3 : 0.7 }));
}

const cloudX = () => 74, cloudY = () => 52;
const obsX = () => W - 66, obsY = () => H - 44;

function eclair() { st.flash = performance.now(); st.sound = { start: performance.now() }; st.heard = 0; }

function dessineNuage(x, y, flash) {
  ctx.fillStyle = flash > 0.2 ? '#e8ecff' : '#4a4f66';
  ctx.beginPath(); ctx.ellipse(x, y, 30, 15, 0, 0, 7); ctx.ellipse(x - 18, y + 4, 18, 12, 0, 0, 7); ctx.ellipse(x + 18, y + 4, 18, 12, 0, 0, 7); ctx.fill();
  // éclair
  ctx.strokeStyle = flash > 0.05 ? '#fff27a' : '#8a7a3a'; ctx.lineWidth = flash > 0.05 ? 3 : 2; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x - 8, y + 30); ctx.lineTo(x + 2, y + 30); ctx.lineTo(x - 6, y + 50); ctx.stroke();
  if (flash > 0.05) { ctx.strokeStyle = `rgba(255,255,180,${flash})`; ctx.lineWidth = 7; ctx.stroke(); }
}

function dessiner() {
  if (!ctx) return;
  const now = performance.now();
  const flash = st.flash ? Math.max(0, 1 - (now - st.flash) / 180) : 0;
  // ciel d'orage
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#10131f'); g.addColorStop(1, '#1c2233');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const s of etoiles) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#cdd6f0'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
  // sol
  ctx.fillStyle = '#232a1e'; ctx.fillRect(0, H - 26, W, 26);
  ctx.fillStyle = '#33402c'; ctx.fillRect(0, H - 26, W, 3);

  // onde sonore (cercles qui progressent en TEMPS RÉEL : délai = d/340)
  if (st.sound) {
    const delai = st.d / VSON, e = (now - st.sound.start) / 1000, prog = Math.min(1, e / delai);
    const gap = obsX() - cloudX();
    ctx.strokeStyle = '#7fd8ff'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const p = prog - k * 0.06; if (p > 0) { ctx.globalAlpha = 0.5 * (1 - k * 0.3) * (1 - prog * 0.4); ctx.beginPath(); ctx.arc(cloudX(), cloudY() + 30, p * gap, -0.7, 0.7); ctx.stroke(); } }
    ctx.globalAlpha = 1;
    if (prog >= 1 && !st.heard) { st.heard = now; st.sound = null; }
  }
  // ligne + distance
  ctx.strokeStyle = '#ffffff22'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cloudX(), H - 40); ctx.lineTo(obsX(), H - 40); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#9fb0cc'; ctx.font = '700 11px Lexend, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`d = ${st.d} m`, (cloudX() + obsX()) / 2, H - 44);

  // flash plein écran
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,220,${flash * 0.5})`; ctx.fillRect(0, 0, W, H); }

  dessineNuage(cloudX(), cloudY(), flash);
  // observateur
  ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText('🧍', obsX(), obsY() + 10);
  // réaction
  const justHeard = st.heard && now - st.heard < 1400;
  if (justHeard) { ctx.font = '20px serif'; ctx.fillText('🔊', obsX(), obsY() - 22); ctx.fillStyle = '#ffd24a'; ctx.font = '700 12px Lexend, sans-serif'; ctx.fillText(`tonnerre après ${(st.d / VSON).toFixed(1)} s !`, obsX() - 4, obsY() - 40); }
  else if (st.sound) { const e = (now - st.sound.start) / 1000; ctx.fillStyle = '#7fd8ff'; ctx.font = '700 12px Lexend, sans-serif'; ctx.fillText(`⏱ ${e.toFixed(1)} s…`, obsX(), obsY() - 26); }
  ctx.textAlign = 'left';
}

function boucle() {
  if (!api._open) { raf = 0; return; }
  st.tick++; dessiner(); majReadout();
  raf = requestAnimationFrame(boucle);
}

function majReadout() {
  $('#ls-d').textContent = st.d; $('#ls-t').textContent = (st.d / VSON).toFixed(1);
  const note = $('#ls-note');
  if (note) note.innerHTML = `À <b>${st.d} m</b>, la lumière arrive quasi instantanément, mais le son (340 m/s) met <b>t = d ÷ v = ${(st.d / VSON).toFixed(1)} s</b>. C’est pour ça qu’on voit l’éclair avant d’entendre le tonnerre.`;
}

function scene(stage, _api) {
  api = _api;
  stage.innerHTML = `
    <canvas class="lk-cv" id="ls-cv"></canvas>
    <div class="lk-read">
      <div><div class="k">Distance</div><div class="v a"><span id="ls-d">680</span> m</div></div>
      <div><div class="k">Son</div><div class="v b">340 m/s</div></div>
      <div><div class="k">Délai son</div><div class="v c"><span id="ls-t">2.0</span> s</div></div>
    </div>
    <div class="lk-ctrl">
      <div class="lk-slide"><label>Distance de l’orage</label><input id="ls-dd" type="range" min="100" max="2000" step="20" value="680"><span class="val" id="ls-dl">680 m</span></div>
      <div class="lk-act"><button class="lk-btn gold" id="ls-go">⚡ Déclencher l’éclair</button></div>
      <div class="lk-note" id="ls-note"></div>
    </div>`;
  const sl = $('#ls-dd', stage);
  sl.addEventListener('input', () => { st.d = +sl.value; $('#ls-dl', stage).textContent = st.d + ' m'; });
  $('#ls-go', stage).addEventListener('click', eclair);

  api.delai = () => st.d / VSON; api.setD = (d) => { st.d = d; sl.value = d; $('#ls-dl', stage).textContent = d + ' m'; };
  api.onOpen = () => { api._open = true; initCanvas($('#ls-cv', stage)); st.sound = null; st.heard = 0; st.flash = 0; if (!raf) raf = requestAnimationFrame(boucle); };
  api.onClose = () => { api._open = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } };
}

const MISSIONS = [
  { id: 's1', xp: 20, titre: 'L’orage', ui: 'choix',
    q: 'Pendant un orage, tu vois l’éclair PUIS, quelques secondes après, tu entends le tonnerre. Pourquoi&nbsp;?',
    choix: ['La lumière va bien plus vite que le son', 'Le son part avant la lumière'], check: (i) => i === 0,
    sol: 'Lumière ≈ 300 000 km/s, son ≈ 340 m/s : la lumière arrive quasi instantanément.' },
  { id: 's2', xp: 25, titre: 'À quelle distance ?', ui: 'num', unite: 'm',
    q: 'Tu comptes <b>3 s</b> entre l’éclair et le tonnerre. À quelle distance est l’orage&nbsp;? (<b>d = v × t</b>, son = 340 m/s)',
    check: (v) => Math.abs(v - 1020) <= 60, sol: 'd = 340 × 3 = 1020 m, soit environ 1 km.' },
  { id: 's3', xp: 20, titre: 'Le plus rapide', ui: 'choix',
    q: 'Qui va le plus vite&nbsp;: la <b>lumière</b> (300 000 km/s) ou le <b>son</b> (340 m/s)&nbsp;?',
    choix: ['la lumière', 'le son'], check: (i) => i === 0,
    sol: 'La lumière est presque un million de fois plus rapide que le son.' },
  { id: 's4', xp: 30, titre: 'Vise 2 secondes', ui: 'live',
    q: 'Règle la distance pour que le tonnerre arrive <b>≈ 2 s</b> après l’éclair, puis déclenche pour vérifier.',
    hint: 'd = v × t = 340 × 2. Cherche la distance qui donne un « délai son » ≈ 2 s.',
    check: (_r, a) => Math.abs(a.delai() - 2) <= 0.35, sol: '340 × 2 = 680 m.' },
  { id: 's5', xp: 25, titre: 'Une année-lumière', ui: 'choix',
    q: 'Une « année-lumière », c’est…',
    choix: ['une durée (comme une année)', 'une distance (celle que la lumière parcourt en 1 an)'], check: (i) => i === 1,
    sol: 'C’est une DISTANCE énorme : la distance parcourue par la lumière en une année.' },
];

const labo = creerLabo({
  key: 'lea.labo.signaux.v1', titre: '📡 Labo signaux — lumière vs son', couleur: '#8b6cf6',
  badges: { premier: '⚡ Premier éclair', final: '📡 Maître des signaux' },
  scene, missions: MISSIONS,
});

function injecterCarte() {
  const d = labo.etat(); const faites = MISSIONS.filter((m) => d.missions[m.id]).length;
  porteLabo({
    id: 'porte-signaux', ordre: 6, icone: '📡', couleur: '#8b6cf6',
    titre: 'Labo signaux', faites, total: MISSIONS.length, niv: niveau(d.xp), ouvrir: labo.ouvrir,
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injecterCarte);
else injecterCarte();
