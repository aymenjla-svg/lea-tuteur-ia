// Léa — LABO VITESSE : v = d ÷ t, ressentie sur une piste de 100 m.
// L'élève choisit un mobile du quotidien (escargot, vélo, voiture, TGV…),
// le lance et VOIT la distance et le temps défiler. Conversions km/h ↔ m/s
// vécues. 100 % ADDITIF, s'appuie sur labo-kit.js.

import { creerLabo } from './labo-kit.js';

// vitesses en km/h
const MOBILES = [
  { emoji: '🐌', nom: 'Escargot', v: 3 },
  { emoji: '🚶', nom: 'Marcheur', v: 5 },
  { emoji: '🏃', nom: 'Coureur', v: 20 },
  { emoji: '🚲', nom: 'Vélo', v: 25 },
  { emoji: '🚗', nom: 'Voiture', v: 90 },
  { emoji: '🚄', nom: 'TGV', v: 300 },
];
const st = { vkmh: 25, emoji: '🚲' };
const PISTE = 100; // mètres
const vms = () => st.vkmh / 3.6;

const $ = (s, r = document) => r.querySelector(s);

let cv, ctx, W, H, raf = 0, api, run = { on: false, d: 0, t: 0, last: 0 };

function initCanvas(canvas) {
  cv = canvas;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  W = r.width || 520; H = 220;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function partir() { run = { on: true, d: 0, t: 0, last: performance.now() }; }
function stop() { run.on = false; }

function dessiner() {
  if (!ctx) return;
  ctx.fillStyle = '#0a1226'; ctx.fillRect(0, 0, W, H);
  const mL = 40, mR = W - 40, laneY = H / 2 + 10;
  // ciel + sol
  ctx.fillStyle = '#101c3a'; ctx.fillRect(0, laneY + 20, W, H - laneY - 20);
  // piste
  ctx.strokeStyle = '#5f7196'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mL, laneY + 20); ctx.lineTo(mR, laneY + 20); ctx.stroke();
  // graduations tous les 20 m
  ctx.fillStyle = '#8fa0c0'; ctx.font = '700 10px Fredoka, sans-serif'; ctx.textAlign = 'center';
  for (let d = 0; d <= 100; d += 20) {
    const x = mL + (d / 100) * (mR - mL);
    ctx.strokeStyle = '#ffffff22'; ctx.beginPath(); ctx.moveTo(x, laneY + 14); ctx.lineTo(x, laneY + 26); ctx.stroke();
    ctx.fillText(d + ' m', x, laneY + 40);
  }
  // départ / arrivée
  ctx.fillStyle = '#7fe0a8'; ctx.textAlign = 'left'; ctx.fillText('🏁 départ', mL - 6, laneY - 34);
  ctx.textAlign = 'right'; ctx.fillText('arrivée 🏁', mR + 6, laneY - 34);

  // mobile
  const frac = Math.min(1, run.d / PISTE);
  const x = mL + frac * (mR - mL);
  ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(st.emoji, x, laneY - 4);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';

  // chrono en gros
  ctx.textAlign = 'center'; ctx.font = '700 18px Fredoka, sans-serif'; ctx.fillStyle = '#ffd24a';
  ctx.fillText(`${run.d.toFixed(0)} m  ·  ${run.t.toFixed(1)} s`, W / 2, 34);
  ctx.textAlign = 'left';
}

function boucle() {
  if (!api._open) { raf = 0; return; }
  if (run.on) {
    const now = performance.now();
    const dt = Math.min(0.05, (now - run.last) / 1000); run.last = now;
    run.t += dt; run.d = vms() * run.t;
    if (run.d >= PISTE) { run.d = PISTE; run.t = PISTE / vms(); run.on = false; }
  }
  dessiner(); majReadout();
  raf = requestAnimationFrame(boucle);
}

function majReadout() {
  $('#lv-kmh').textContent = st.vkmh;
  $('#lv-ms').textContent = vms().toFixed(1);
  $('#lv-t').textContent = (PISTE / vms()).toFixed(1);
  const note = $('#lv-note');
  if (note) note.innerHTML = `<b>${st.vkmh} km/h</b> = ${st.vkmh} ÷ 3,6 = <b>${vms().toFixed(1)} m/s</b>. Pour 100 m : t = d ÷ v = <b>${(PISTE / vms()).toFixed(1)} s</b>.`;
}

function scene(stage, _api) {
  api = _api;
  stage.innerHTML = `
    <canvas class="lk-cv" id="lv-cv"></canvas>
    <div class="lk-read">
      <div><div class="k">Vitesse</div><div class="v a"><span id="lv-kmh">25</span> km/h</div></div>
      <div><div class="k">= en m/s</div><div class="v b"><span id="lv-ms">6.9</span> m/s</div></div>
      <div><div class="k">Temps 100 m</div><div class="v c"><span id="lv-t">14</span> s</div></div>
    </div>
    <div class="lk-ctrl">
      <div class="lk-line">Choisis un mobile :</div>
      <div class="lk-chips" id="lv-mob"></div>
      <div class="lk-slide"><label>…ou règle la vitesse</label><input id="lv-s" type="range" min="1" max="300" step="1" value="25"><span class="val" id="lv-sl">25 km/h</span></div>
      <div class="lk-act"><button class="lk-btn gold" id="lv-go">🏁 Partir&nbsp;!</button></div>
      <div class="lk-note" id="lv-note"></div>
    </div>`;
  const mz = $('#lv-mob', stage);
  mz.innerHTML = MOBILES.map((m, i) => `<button class="lk-chip" data-m="${i}">${m.emoji} ${m.nom}<span class="mk">${m.v} km/h</span></button>`).join('');
  mz.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => api.setMobile(+b.dataset.m)));
  const sl = $('#lv-s', stage);
  sl.addEventListener('input', () => { st.vkmh = +sl.value; st.emoji = '🔵'; $('#lv-sl', stage).textContent = st.vkmh + ' km/h'; mz.querySelectorAll('.lk-chip').forEach((x) => x.classList.remove('on')); run = { on: false, d: 0, t: 0, last: 0 }; });
  $('#lv-go', stage).addEventListener('click', partir);

  api.vms = () => vms(); api.vkmh = () => st.vkmh;
  api.setMobile = (i) => {
    const m = MOBILES[i]; st.vkmh = m.v; st.emoji = m.emoji; sl.value = m.v; $('#lv-sl', stage).textContent = m.v + ' km/h';
    mz.querySelectorAll('.lk-chip').forEach((x, k) => x.classList.toggle('on', k === i)); run = { on: false, d: 0, t: 0, last: 0 };
  };
  api.onOpen = () => { api._open = true; initCanvas($('#lv-cv', stage)); run = { on: false, d: 0, t: 0, last: 0 }; if (!raf) raf = requestAnimationFrame(boucle); };
  api.onClose = () => { api._open = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } };
}

const MISSIONS = [
  { id: 'v1', xp: 20, titre: 'Ta première vitesse', ui: 'num', unite: 'm/s',
    q: 'Un coureur parcourt <b>100 m en 20 s</b>. D’après <b>v = d ÷ t</b>, quelle est sa vitesse&nbsp;?',
    check: (v) => Math.abs(v - 5) <= 0.4, sol: 'v = 100 ÷ 20 = 5 m/s (soit 18 km/h).' },
  { id: 'v2', xp: 20, titre: 'La course', ui: 'choix',
    q: 'Sur 100 m, qui arrive en <b>premier</b> : le marcheur (5 km/h) ou le vélo (25 km/h)&nbsp;?',
    choix: ['le marcheur', 'le vélo'], check: (i) => i === 1, prep: (a) => a.setMobile(3),
    sol: 'Plus la vitesse est grande, plus le temps est court : le vélo gagne largement.' },
  { id: 'v3', xp: 25, titre: 'Passe en km/h', ui: 'num', unite: 'km/h',
    q: 'Une vitesse de <b>5 m/s</b>, ça fait combien en km/h&nbsp;? (on multiplie par 3,6)',
    check: (v) => Math.abs(v - 18) <= 1, sol: '5 × 3,6 = 18 km/h.' },
  { id: 'v4', xp: 30, titre: 'Vise 100 m en 10 s', ui: 'live',
    q: 'Règle la vitesse pour parcourir les <b>100 m en environ 10 secondes</b>, puis lance pour vérifier.',
    hint: 'Cherche la vitesse dont le « temps 100 m » affiche ≈ 10 s.',
    check: (_r, a) => Math.abs(a.vms() - 10) <= 1.5, sol: '100 m ÷ 10 s = 10 m/s = 36 km/h.' },
  { id: 'v5', xp: 30, titre: 'L’orage', ui: 'choix',
    q: 'Pendant un orage, tu vois l’éclair PUIS, quelques secondes après, tu entends le tonnerre. Pourquoi&nbsp;?',
    choix: ['La lumière va bien plus vite que le son', 'Le son part avant l’éclair'], check: (i) => i === 0,
    sol: 'Lumière ≈ 300 000 km/s, son ≈ 340 m/s : la lumière arrive quasi instantanément, le son traîne.' },
];

const labo = creerLabo({
  key: 'lea.labo.vitesse.v1', titre: '🏃 Labo vitesse — v = d ÷ t',
  badges: { premier: '🏁 Premier départ', final: '🏃 Maître de la vitesse' },
  scene, missions: MISSIONS,
});

function injecterCarte() {
  const accueil = $('#accueil'); if (!accueil || $('#lv-card')) return;
  const d = labo.etat(); const faites = MISSIONS.filter((m) => d.missions[m.id]).length;
  const card = document.createElement('div');
  card.className = 'lk-card'; card.id = 'lv-card';
  card.style.background = 'linear-gradient(135deg,#3a1a5e,#6a2b8a 60%,#a02b7e)';
  card.innerHTML =
    '<h3>🏃 Labo vitesse — lance la course</h3>' +
    '<p>Fais courir un escargot, un vélo, une voiture ou un TGV sur 100 m, chrono en main. Tu ressens v = d ÷ t et les conversions km/h ↔ m/s.</p>' +
    `<button class="lk-cta" id="lv-open">🎮 Jouer${faites ? ' — continuer' : ''}</button>` +
    (faites ? `<span class="lk-mini">⭐ ${faites}/${MISSIONS.length}</span>` : '');
  const ancre = accueil.querySelector('#ld-card') || accueil.querySelector('#lc-card') || accueil.querySelector('#lab-card') || accueil.querySelector('p.note');
  if (ancre) accueil.insertBefore(card, ancre); else accueil.appendChild(card);
  $('#lv-open').addEventListener('click', labo.ouvrir);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injecterCarte);
else injecterCarte();
