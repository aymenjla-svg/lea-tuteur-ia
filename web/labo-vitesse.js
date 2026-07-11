// Léa — LABO VITESSE : une VRAIE course sur 100 m (v = d ÷ t).
// L'élève choisit deux concurrents (escargot, vélo, voiture, TGV…), lance la
// course et voit qui gagne, chrono à l'appui. Conversions km/h ↔ m/s vécues.
// 100 % ADDITIF, s'appuie sur labo-kit.js. « improvise » → mode course à 2.

import { creerLabo } from './labo-kit.js';

const MOBILES = [
  { emoji: '🐌', nom: 'Escargot', v: 3 },
  { emoji: '🚶', nom: 'Marcheur', v: 5 },
  { emoji: '🏃', nom: 'Coureur', v: 20 },
  { emoji: '🚲', nom: 'Vélo', v: 25 },
  { emoji: '🚗', nom: 'Voiture', v: 90 },
  { emoji: '🚄', nom: 'TGV', v: 300 },
];
const PISTE = 100; // mètres
const st = {
  A: { vkmh: 25, emoji: '🚲', d: 0, t: 0 },
  B: { vkmh: 90, emoji: '🚗', d: 0, t: 0 },
  run: false, last: 0, fini: null,
};
const vms = (c) => c.vkmh / 3.6;

const $ = (s, r = document) => r.querySelector(s);
let cv, ctx, W, H, raf = 0, api, nuages = [];

function initCanvas(canvas) {
  cv = canvas;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  W = r.width || 520; H = 220;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  nuages = [{ x: W * 0.2, y: 26 }, { x: W * 0.6, y: 40 }, { x: W * 0.85, y: 22 }];
}

function partir() {
  st.A.d = 0; st.A.t = 0; st.B.d = 0; st.B.t = 0; st.fini = null; st.run = true; st.last = performance.now();
}

function laneY(i) { return i === 0 ? H * 0.42 : H * 0.72; }

function dessineLane(c, i, mL, mR) {
  const y = laneY(i);
  // route
  ctx.fillStyle = '#242c44'; ctx.fillRect(mL, y - 14, mR - mL, 28);
  ctx.strokeStyle = '#ffffff44'; ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mL, y); ctx.lineTo(mR, y); ctx.stroke(); ctx.setLineDash([]);
  // arrivée damier
  for (let r = 0; r < 4; r++) for (let cc = 0; cc < 2; cc++) { ctx.fillStyle = (r + cc) % 2 ? '#fff' : '#111'; ctx.fillRect(mR + cc * 6, y - 14 + r * 7, 6, 7); }
  // mobile
  const x = mL + Math.min(1, c.d / PISTE) * (mR - mL);
  ctx.font = '24px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.emoji, x, y - 2);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  // libellé vitesse
  ctx.fillStyle = i === 0 ? '#7fd8ff' : '#ffb38a'; ctx.font = '700 11px Fredoka, sans-serif';
  ctx.fillText(`${c.vkmh} km/h · ${c.d.toFixed(0)} m · ${c.t.toFixed(1)} s`, mL, y - 20);
}

function dessiner() {
  if (!ctx) return;
  const mL = 40, mR = W - 46;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a4a8a'); g.addColorStop(1, '#0e1c3a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff33'; for (const n of nuages) { ctx.beginPath(); ctx.ellipse(n.x, n.y, 16, 7, 0, 0, 7); ctx.ellipse(n.x + 12, n.y + 2, 12, 6, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#7fe0a8'; ctx.font = '700 11px Fredoka, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('100 m 🏁', mR + 4, 14); ctx.textAlign = 'left';
  dessineLane(st.A, 0, mL, mR);
  dessineLane(st.B, 1, mL, mR);
  if (st.fini) {
    ctx.fillStyle = '#000a'; ctx.fillRect(W / 2 - 110, H / 2 - 20, 220, 40);
    ctx.fillStyle = '#ffd24a'; ctx.font = '700 17px Fredoka, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(st.fini, W / 2, H / 2 + 6); ctx.textAlign = 'left';
  }
}

function pas(c, dt) { if (c.d < PISTE) { c.t += dt; c.d = vms(c) * c.t; if (c.d >= PISTE) { c.d = PISTE; c.t = PISTE / vms(c); } } }

function boucle(now) {
  if (!api._open) { raf = 0; return; }
  if (st.run) {
    const dt = Math.min(0.05, (now - st.last) / 1000); st.last = now;
    pas(st.A, dt); pas(st.B, dt);
    if (st.A.d >= PISTE && st.B.d >= PISTE) {
      st.run = false;
      st.fini = Math.abs(st.A.t - st.B.t) < 0.05 ? '🤝 Égalité !' : (st.A.t < st.B.t ? '🏆 A gagne !' : '🏆 B gagne !');
    }
  }
  dessiner(); majReadout();
  raf = requestAnimationFrame(boucle);
}

function majReadout() {
  $('#lv-a').textContent = st.A.vkmh; $('#lv-b').textContent = st.B.vkmh;
  $('#lv-am').textContent = vms(st.A).toFixed(1);
  const note = $('#lv-note');
  if (note) note.innerHTML = `A : <b>${st.A.vkmh} km/h</b> = ${vms(st.A).toFixed(1)} m/s (100 m en ${(PISTE / vms(st.A)).toFixed(1)} s). Plus on va vite, plus t = d ÷ v est petit.`;
}

function chips(cible, sel) {
  return MOBILES.map((m, i) => `<button class="lk-chip" data-c="${cible}" data-i="${i}">${m.emoji} ${m.nom}<span class="mk">${m.v}</span></button>`).join('');
}

function scene(stage, _api) {
  api = _api;
  stage.innerHTML = `
    <canvas class="lk-cv" id="lv-cv"></canvas>
    <div class="lk-read">
      <div><div class="k">🔵 A</div><div class="v a"><span id="lv-a">25</span> km/h</div></div>
      <div><div class="k">= en m/s</div><div class="v b"><span id="lv-am">6.9</span> m/s</div></div>
      <div><div class="k">🔴 B</div><div class="v c"><span id="lv-b">90</span> km/h</div></div>
    </div>
    <div class="lk-ctrl">
      <div class="lk-line">🔵 Concurrent A :</div>
      <div class="lk-chips" id="lv-a-chips"></div>
      <div class="lk-slide"><label>A : règle la vitesse</label><input id="lv-as" type="range" min="1" max="300" step="1" value="25"><span class="val" id="lv-asl">25 km/h</span></div>
      <div class="lk-line">🔴 Concurrent B :</div>
      <div class="lk-chips" id="lv-b-chips"></div>
      <div class="lk-act"><button class="lk-btn gold" id="lv-go">🏁 Course&nbsp;!</button></div>
      <div class="lk-note" id="lv-note"></div>
    </div>`;
  const za = $('#lv-a-chips', stage), zb = $('#lv-b-chips', stage);
  za.innerHTML = chips('A'); zb.innerHTML = chips('B');
  stage.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => {
    const c = b.dataset.c === 'A' ? st.A : st.B; const m = MOBILES[+b.dataset.i];
    c.vkmh = m.v; c.emoji = m.emoji;
    (b.dataset.c === 'A' ? za : zb).querySelectorAll('.lk-chip').forEach((x) => x.classList.remove('on')); b.classList.add('on');
    if (b.dataset.c === 'A') { $('#lv-as', stage).value = m.v; $('#lv-asl', stage).textContent = m.v + ' km/h'; }
  }));
  const sa = $('#lv-as', stage);
  sa.addEventListener('input', () => { st.A.vkmh = +sa.value; st.A.emoji = '🔵'; $('#lv-asl', stage).textContent = st.A.vkmh + ' km/h'; za.querySelectorAll('.lk-chip').forEach((x) => x.classList.remove('on')); });
  $('#lv-go', stage).addEventListener('click', partir);

  api.vAms = () => vms(st.A); api.vBms = () => vms(st.B); api.vAkmh = () => st.A.vkmh;
  api.setA = (i) => { const m = MOBILES[i]; st.A.vkmh = m.v; st.A.emoji = m.emoji; $('#lv-as', stage).value = m.v; $('#lv-asl', stage).textContent = m.v + ' km/h'; za.querySelectorAll('.lk-chip').forEach((x, k) => x.classList.toggle('on', k === i)); };
  api.setB = (i) => { const m = MOBILES[i]; st.B.vkmh = m.v; st.B.emoji = m.emoji; zb.querySelectorAll('.lk-chip').forEach((x, k) => x.classList.toggle('on', k === i)); };
  api.onOpen = () => { api._open = true; initCanvas($('#lv-cv', stage)); st.run = false; st.fini = null; st.A.d = st.B.d = 0; st.A.t = st.B.t = 0; if (!raf) raf = requestAnimationFrame(boucle); };
  api.onClose = () => { api._open = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } };
}

const MISSIONS = [
  { id: 'v1', xp: 20, titre: 'Ta première vitesse', ui: 'num', unite: 'm/s',
    q: 'Un coureur parcourt <b>100 m en 20 s</b>. D’après <b>v = d ÷ t</b>, quelle est sa vitesse&nbsp;?',
    check: (v) => Math.abs(v - 5) <= 0.4, sol: 'v = 100 ÷ 20 = 5 m/s (18 km/h).' },
  { id: 'v2', xp: 20, titre: 'Le pronostic', ui: 'choix',
    q: 'Course : <b>A = marcheur (5 km/h)</b> contre <b>B = vélo (25 km/h)</b> sur 100 m. Qui gagne&nbsp;? (lance la course pour vérifier)',
    choix: ['A, le marcheur', 'B, le vélo'], check: (i) => i === 1, prep: (a) => { a.setA(1); a.setB(3); },
    sol: 'Plus la vitesse est grande, plus le temps est court : le vélo gagne largement.' },
  { id: 'v3', xp: 25, titre: 'Passe en km/h', ui: 'num', unite: 'km/h',
    q: 'Une vitesse de <b>5 m/s</b>, ça fait combien en km/h&nbsp;? (× 3,6)',
    check: (v) => Math.abs(v - 18) <= 1, sol: '5 × 3,6 = 18 km/h.' },
  { id: 'v4', xp: 30, titre: 'Vise 100 m en 10 s', ui: 'live',
    q: 'Règle le concurrent <b>A</b> pour parcourir les 100 m en <b>≈ 10 secondes</b>, puis lance pour vérifier.',
    hint: 'Cherche la vitesse de A telle que « 100 m en … » affiche ≈ 10 s.',
    check: (_r, a) => Math.abs(a.vAms() - 10) <= 1.5, sol: '100 ÷ 10 = 10 m/s = 36 km/h.' },
  { id: 'v5', xp: 30, titre: 'L’orage', ui: 'choix',
    q: 'Tu vois l’éclair PUIS, quelques secondes après, le tonnerre. Pourquoi&nbsp;?',
    choix: ['La lumière va bien plus vite que le son', 'Le son part avant l’éclair'], check: (i) => i === 0,
    sol: 'Lumière ≈ 300 000 km/s, son ≈ 340 m/s : la lumière arrive quasi instantanément.' },
];

const labo = creerLabo({
  key: 'lea.labo.vitesse.v1', titre: '🏃 Labo vitesse — la course',
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
    '<p>Fais s’affronter un escargot, un vélo, une voiture ou un TGV sur 100 m, chrono en main. Tu ressens v = d ÷ t et les conversions km/h ↔ m/s.</p>' +
    `<button class="lk-cta" id="lv-open">🎮 Jouer${faites ? ' — continuer' : ''}</button>` +
    (faites ? `<span class="lk-mini">⭐ ${faites}/${MISSIONS.length}</span>` : '');
  const ancre = accueil.querySelector('#ld-card') || accueil.querySelector('#lc-card') || accueil.querySelector('#lab-card') || accueil.querySelector('p.note');
  if (ancre) accueil.insertBefore(card, ancre); else accueil.appendChild(card);
  $('#lv-open').addEventListener('click', labo.ouvrir);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injecterCarte);
else injecterCarte();
