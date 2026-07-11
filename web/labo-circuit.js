// Léa — LABO CIRCUIT : la loi d'Ohm (U = R × I) qu'on VIT au lieu de l'apprendre.
// L'élève branche une pile, tourne la résistance, voit l'ampoule s'allumer,
// faiblir… ou GRILLER en court-circuit. Objets du quotidien : lampe de poche.
// 100 % ADDITIF, s'appuie sur labo-kit.js. Une seule ligne dans index.html.

import { creerLabo } from './labo-kit.js';

const PILES = [
  { v: 1.5, nom: 'Pile ronde', emoji: '🔋' },
  { v: 4.5, nom: 'Pile plate', emoji: '🔋' },
  { v: 9, nom: 'Pile 9V', emoji: '🔋' },
];
const st = { U: 4.5, R: 9 };
const courant = () => st.U / Math.max(st.R, 0.001);
const GRILLE = 5;   // au-delà de ~5 A l'ampoule grille (mise en scène)

const $ = (s, r = document) => r.querySelector(s);

function eclat(I) {
  if (I <= 0.02) return 'éteinte 💤';
  if (I >= GRILLE) return 'ELLE GRILLE ! 💥 (trop de courant)';
  if (I < 0.2) return 'lueur très faible';
  if (I < 0.6) return 'brille doucement';
  if (I < 1.5) return 'bien éclairée 💡';
  if (I < GRILLE) return 'très forte, elle chauffe…';
  return '';
}

let cv, ctx, W, H, raf = 0, phase = 0, api;

function initCanvas(canvas) {
  cv = canvas;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  W = r.width || 520; H = 220;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function dessiner() {
  if (!ctx) return;
  const I = courant(), grille = I >= GRILLE;
  ctx.fillStyle = '#070b16'; ctx.fillRect(0, 0, W, H);
  // rectangle du circuit
  const L = 60, R = W - 60, T = 50, B = H - 40;
  ctx.strokeStyle = '#5f7196'; ctx.lineWidth = 4;
  ctx.strokeRect(L, T, R - L, B - T);

  // pile (à gauche)
  ctx.strokeStyle = '#cbd5e8'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(L, (T + B) / 2 - 16); ctx.lineTo(L, (T + B) / 2 - 4); ctx.stroke();
  ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(L - 8, (T + B) / 2 - 4); ctx.lineTo(L + 8, (T + B) / 2 - 4); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(L - 4, (T + B) / 2 + 6); ctx.lineTo(L + 4, (T + B) / 2 + 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(L, (T + B) / 2 + 6); ctx.lineTo(L, (T + B) / 2 + 16); ctx.stroke();
  ctx.fillStyle = '#8fa0c0'; ctx.font = '700 12px Fredoka, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(st.U + ' V', L + 22, (T + B) / 2 + 4);

  // résistance (zigzag à droite)
  const rx = R, ry0 = T + 26, ry1 = B - 26;
  ctx.strokeStyle = '#e0a83e'; ctx.lineWidth = 3; ctx.beginPath();
  ctx.moveTo(rx, ry0);
  const seg = (ry1 - ry0) / 6;
  for (let i = 0; i < 6; i++) ctx.lineTo(rx + (i % 2 ? 10 : -10), ry0 + seg * (i + 0.5));
  ctx.lineTo(rx, ry1); ctx.stroke();
  ctx.fillStyle = '#e0a83e'; ctx.fillText(st.R + ' Ω', rx - 26, (ry0 + ry1) / 2);

  // ampoule (en haut au centre)
  const bx = (L + R) / 2, by = T;
  const b = grille ? 0 : Math.min(1, I / 2);
  if (b > 0) {
    const halo = ctx.createRadialGradient(bx, by, 2, bx, by, 30 + b * 26);
    halo.addColorStop(0, `rgba(255,230,140,${0.25 + b * 0.6})`); halo.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(bx, by, 30 + b * 26, 0, 7); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(bx, by, 15, 0, 7);
  ctx.fillStyle = grille ? '#3a2020' : `rgb(${60 + b * 195},${60 + b * 180},${60 + b * 60})`;
  ctx.fill(); ctx.strokeStyle = '#cbd5e8'; ctx.lineWidth = 2.5; ctx.stroke();
  // filament / croix
  ctx.strokeStyle = grille ? '#ff6b6b' : '#a06a2a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(bx - 8, by + 6); ctx.lineTo(bx - 2, by - 6); ctx.lineTo(bx + 2, by + 6); ctx.lineTo(bx + 8, by - 6); ctx.stroke();
  if (grille) { ctx.fillStyle = '#ff8f5a'; ctx.font = '18px serif'; ctx.fillText('💥', bx, by - 22); }

  // électrons qui circulent (vitesse ∝ I)
  if (!grille && I > 0.02) {
    const per = 4 * (L + R + T + B); // approx périmètre
    const n = 14;
    ctx.fillStyle = '#7fe0ff';
    for (let k = 0; k < n; k++) {
      const p = ((phase + k / n) % 1);
      const [x, y] = pointLoop(p, L, R, T, B);
      ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill();
    }
  }
  ctx.textAlign = 'left';
}

// position sur le rectangle (p ∈ [0,1)) sens horaire
function pointLoop(p, L, R, T, B) {
  const w = R - L, h = B - T, per = 2 * (w + h);
  let d = p * per;
  if (d < w) return [L + d, T];
  d -= w; if (d < h) return [R, T + d];
  d -= h; if (d < w) return [R - d, B];
  d -= w; return [L, B - d];
}

function boucle() {
  if (!api._open) { raf = 0; return; }
  const I = courant();
  phase = (phase + Math.min(0.03, I * 0.006)) % 1;
  dessiner(); majReadout();
  raf = requestAnimationFrame(boucle);
}

function majReadout() {
  const I = courant();
  $('#lc-U').textContent = st.U; $('#lc-R').textContent = st.R;
  $('#lc-I').textContent = I >= GRILLE ? Math.round(I) : I.toFixed(2);
  const note = $('#lc-note');
  if (note) note.innerHTML = `Pile <b>${st.U} V</b>, résistance <b>${st.R} Ω</b> → I = U ÷ R = <b>${I.toFixed(2)} A</b> · l’ampoule : ${eclat(I)}`;
}

function scene(stage, _api) {
  api = _api;
  stage.innerHTML = `
    <canvas class="lk-cv" id="lc-cv"></canvas>
    <div class="lk-read">
      <div><div class="k">Tension U</div><div class="v a"><span id="lc-U">4.5</span> V</div></div>
      <div><div class="k">Résistance R</div><div class="v c"><span id="lc-R">9</span> Ω</div></div>
      <div><div class="k">Intensité I</div><div class="v b"><span id="lc-I">0.50</span> A</div></div>
    </div>
    <div class="lk-ctrl">
      <div class="lk-line">Choisis une pile (comme dans une lampe de poche) :</div>
      <div class="lk-chips" id="lc-piles"></div>
      <div class="lk-slide"><label>Résistance</label><input id="lc-r" type="range" min="1" max="100" step="1" value="9"><span class="val" id="lc-rl">9 Ω</span></div>
      <div class="lk-note" id="lc-note"></div>
    </div>`;
  const piles = $('#lc-piles', stage);
  piles.innerHTML = PILES.map((p, i) => `<button class="lk-chip" data-p="${i}">${p.emoji} ${p.nom}<span class="mk">${p.v} V</span></button>`).join('');
  piles.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
    st.U = PILES[+b.dataset.p].v; piles.querySelectorAll('.lk-chip').forEach((x) => x.classList.remove('on')); b.classList.add('on');
  }));
  const sl = $('#lc-r', stage);
  sl.addEventListener('input', () => { st.R = +sl.value; $('#lc-rl', stage).textContent = st.R + ' Ω'; });

  api.U = () => st.U; api.R = () => st.R; api.I = () => courant();
  api.setPile = (v) => { st.U = v; const i = PILES.findIndex((p) => p.v === v); piles.querySelectorAll('.lk-chip').forEach((x, k) => x.classList.toggle('on', k === i)); };
  api.setR = (v) => { st.R = v; sl.value = v; $('#lc-rl', stage).textContent = v + ' Ω'; };
  api.onOpen = () => { api._open = true; initCanvas($('#lc-cv', stage)); if (!raf) raf = requestAnimationFrame(boucle); };
  api.onClose = () => { api._open = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  api.setPile(4.5); api.setR(9);
}

const MISSIONS = [
  { id: 'c1', xp: 20, titre: 'Ton premier calcul', ui: 'num', unite: 'A',
    q: 'Pile plate <b>4,5 V</b>, résistance <b>9 Ω</b>. D’après <b>I = U ÷ R</b>, quelle intensité traverse l’ampoule&nbsp;?',
    prep: (a) => { a.setPile(4.5); a.setR(9); },
    check: (v) => Math.abs(v - 0.5) <= 0.06, sol: 'I = 4,5 ÷ 9 = 0,5 A.' },
  { id: 'c2', xp: 20, titre: 'Tourne le bouton', ui: 'choix',
    q: 'Tu <b>augmentes</b> la résistance (à tension fixe). L’ampoule brille…',
    choix: ['plus fort', 'moins fort', 'pareil'], check: (i) => i === 1,
    sol: 'Plus de résistance freine le courant : I diminue → l’ampoule faiblit.' },
  { id: 'c3', xp: 25, titre: 'Vise 1 ampère', ui: 'live',
    q: 'Règle la pile ET la résistance pour obtenir une intensité <b>proche de 1 A</b>.',
    hint: 'Bouge la pile et le curseur de résistance jusqu’à I ≈ 1 A.',
    check: (_r, a) => Math.abs(a.I() - 1) <= 0.15,
    sol: 'Ex. : 9 V avec 9 Ω → 1 A. Ou 4,5 V avec ~4–5 Ω.' },
  { id: 'c4', xp: 25, titre: 'La bêtise interdite', ui: 'choix',
    q: 'Tu relies les deux bornes par un simple fil : <b>R ≈ 0 Ω</b> (court-circuit). Le courant I…',
    choix: ['devient nul', 'devient énorme et ça chauffe 💥', 'ne change pas'], check: (i) => i === 1,
    prep: (a) => { a.setR(1); }, sol: 'I = U ÷ R : si R → 0, I explose. C’est pour ça qu’un court-circuit fait fondre les fils / déclenche le disjoncteur.' },
  { id: 'c5', xp: 30, titre: 'Retrouve la résistance', ui: 'num', unite: 'Ω',
    q: 'Avec la pile <b>9 V</b>, tu veux exactement <b>I = 3 A</b>. Quelle résistance faut-il&nbsp;? (<b>R = U ÷ I</b>)',
    prep: (a) => { a.setPile(9); }, check: (v) => Math.abs(v - 3) <= 0.4, sol: 'R = 9 ÷ 3 = 3 Ω.' },
];

const labo = creerLabo({
  key: 'lea.labo.circuit.v1', titre: '⚡ Labo circuit — la loi d’Ohm',
  badges: { premier: '🔌 Premier circuit', final: '⚡ Maître du courant' },
  scene, missions: MISSIONS,
});

function injecterCarte() {
  const accueil = $('#accueil'); if (!accueil || $('#lc-card')) return;
  const d = labo.etat(); const faites = MISSIONS.filter((m) => d.missions[m.id]).length;
  const card = document.createElement('div');
  card.className = 'lk-card'; card.id = 'lc-card';
  card.style.background = 'linear-gradient(135deg,#0b3a4a,#116a7a 60%,#0e8a6a)';
  card.innerHTML =
    '<h3>⚡ Labo circuit — allume (ou fais griller) l’ampoule</h3>' +
    '<p>Branche une pile, tourne la résistance et regarde l’ampoule s’éclairer… ou exploser en court-circuit. Tu comprends la loi d’Ohm en la vivant.</p>' +
    `<button class="lk-cta" id="lc-open">🎮 Jouer${faites ? ' — continuer' : ''}</button>` +
    (faites ? `<span class="lk-mini">⭐ ${faites}/${MISSIONS.length}</span>` : '');
  const ancre = accueil.querySelector('#lab-card') || accueil.querySelector('#rev-card') || accueil.querySelector('p.note');
  if (ancre) accueil.insertBefore(card, ancre); else accueil.appendChild(card);
  $('#lc-open').addEventListener('click', labo.ouvrir);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injecterCarte);
else injecterCarte();
