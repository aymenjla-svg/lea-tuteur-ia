// Léa — LABO ÉNERGIE : puissance et consommation (P = U × I, E = P × t).
// L'élève allume des appareils du quotidien, voit la puissance totale sur un
// wattmètre, le compteur qui tourne plus ou moins vite, et l'énergie (Wh) +
// le coût grimper. 100 % ADDITIF, s'appuie sur labo-kit.js.

import { creerLabo, porteLabo, niveau } from './labo-kit.js';

const APPAREILS = [
  { emoji: '💡', nom: 'LED', w: 5 },
  { emoji: '🔌', nom: 'Chargeur', w: 10 },
  { emoji: '📺', nom: 'Télé', w: 100 },
  { emoji: '❄️', nom: 'Frigo', w: 150 },
  { emoji: '🍞', nom: 'Grille-pain', w: 1000 },
  { emoji: '💨', nom: 'Sèche-cheveux', w: 1500 },
  { emoji: '🔥', nom: 'Radiateur', w: 2000 },
];
const PRIX = 0.20; // €/kWh
const st = { on: new Set(), h: 2, tick: 0 };
const puissance = () => [...st.on].reduce((s, i) => s + APPAREILS[i].w, 0);
const energie = () => puissance() * st.h;      // Wh
const cout = () => (energie() / 1000) * PRIX;  // €

const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let cv, ctx, W, H, raf = 0, api;

function initCanvas(canvas) {
  cv = canvas;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  W = r.width || 520; H = 220;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function niceMax(p) { for (const m of [50, 100, 250, 500, 1000, 2500, 5000, 10000]) if (p <= m) return m; return 20000; }

function dessiner() {
  if (!ctx) return;
  const P = puissance();
  // mur / intérieur
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#241a12'); g.addColorStop(1, '#141017');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2a2118'; ctx.fillRect(0, H - 24, W, 24); // plinthe

  // wattmètre (jauge) au centre-haut
  const gx = W / 2, gy = 96, gr = 54, fs = niceMax(Math.max(P, 20));
  ctx.strokeStyle = '#ffffff26'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(gx, gy, gr, Math.PI, 0); ctx.stroke();
  // arc coloré proportionnel
  const frac = clamp(P / fs, 0, 1);
  ctx.strokeStyle = P > 1500 ? '#ff6b4a' : '#ffb454'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(gx, gy, gr, Math.PI, Math.PI + frac * Math.PI); ctx.stroke();
  const ang = Math.PI - frac * Math.PI;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(ang) * (gr - 6), gy - Math.sin(ang) * (gr - 6)); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx, gy, 4, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffcf8a'; ctx.font = '700 15px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(P + ' W', gx, gy - 14);
  ctx.fillStyle = '#9a8f80'; ctx.font = '700 10px Fredoka, sans-serif'; ctx.fillText(`0 – ${fs} W`, gx, gy + 16);

  // compteur qui tourne (vitesse ∝ P)
  const cx = 42, cy = 60, cr = 22;
  ctx.fillStyle = '#0e0c14'; ctx.strokeStyle = '#ffffff30'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 7); ctx.fill(); ctx.stroke();
  const rot = st.tick * (0.02 + P / 8000);
  ctx.strokeStyle = '#ffb454'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(rot) * (cr - 5), cy + Math.sin(rot) * (cr - 5)); ctx.stroke();
  ctx.fillStyle = '#ffb454'; ctx.beginPath(); ctx.arc(cx + Math.cos(rot) * (cr - 5), cy + Math.sin(rot) * (cr - 5), 2, 0, 7); ctx.fill();
  ctx.fillStyle = '#8a8070'; ctx.font = '700 9px Fredoka, sans-serif'; ctx.fillText('compteur', cx, cy + cr + 12);

  // appareils allumés (rangée en bas, avec halo)
  const ids = [...st.on]; const n = Math.max(1, ids.length); const step = Math.min(60, (W - 40) / n); let ax = 24 + step / 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const i of ids) {
    const glow = 0.5 + 0.5 * Math.sin(st.tick * 0.15 + i);
    ctx.fillStyle = `rgba(255,200,90,${0.18 + glow * 0.25})`; ctx.beginPath(); ctx.arc(ax, H - 44, 20, 0, 7); ctx.fill();
    ctx.font = '24px serif'; ctx.fillText(APPAREILS[i].emoji, ax, H - 44);
    ctx.fillStyle = '#ffcf8a'; ctx.font = '700 9px Fredoka, sans-serif'; ctx.textBaseline = 'alphabetic'; ctx.fillText(APPAREILS[i].w + ' W', ax, H - 20); ctx.textBaseline = 'middle';
    ax += step;
  }
  if (!ids.length) { ctx.fillStyle = '#7a7060'; ctx.font = '700 12px Fredoka, sans-serif'; ctx.fillText('Allume des appareils 👇', W / 2, H - 40); }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function boucle() {
  if (!api._open) { raf = 0; return; }
  st.tick++; dessiner(); majReadout();
  raf = requestAnimationFrame(boucle);
}

function majReadout() {
  const P = puissance(), E = energie();
  $('#le-P').textContent = P; $('#le-h').textContent = st.h; $('#le-E').textContent = E >= 1000 ? (E / 1000).toFixed(2) + ' k' : E;
  const note = $('#le-note');
  if (note) note.innerHTML = P ? `P = <b>${P} W</b> pendant <b>${st.h} h</b> → E = P × t = <b>${E >= 1000 ? (E / 1000).toFixed(2) + ' kWh' : E + ' Wh'}</b> · coût ≈ <b>${cout().toFixed(2)} €</b>` : 'Allume un ou plusieurs appareils pour voir la puissance et l’énergie.';
}

function scene(stage, _api) {
  api = _api;
  stage.innerHTML = `
    <canvas class="lk-cv" id="le-cv"></canvas>
    <div class="lk-read">
      <div><div class="k">Puissance</div><div class="v c"><span id="le-P">0</span> W</div></div>
      <div><div class="k">Durée</div><div class="v a"><span id="le-h">2</span> h</div></div>
      <div><div class="k">Énergie</div><div class="v b"><span id="le-E">0</span> Wh</div></div>
    </div>
    <div class="lk-ctrl">
      <div class="lk-line">Allume des appareils (clique pour éteindre) :</div>
      <div class="lk-chips" id="le-app"></div>
      <div class="lk-slide"><label>Durée d’utilisation</label><input id="le-hh" type="range" min="0.5" max="8" step="0.5" value="2"><span class="val" id="le-hl">2 h</span></div>
      <div class="lk-note" id="le-note"></div>
    </div>`;
  const az = $('#le-app', stage);
  az.innerHTML = APPAREILS.map((a, i) => `<button class="lk-chip" data-i="${i}">${a.emoji} ${a.nom}<span class="mk">${a.w} W</span></button>`).join('');
  az.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.i; st.on.has(i) ? st.on.delete(i) : st.on.add(i); b.classList.toggle('on', st.on.has(i));
  }));
  const sl = $('#le-hh', stage);
  sl.addEventListener('input', () => { st.h = +sl.value; $('#le-hl', stage).textContent = st.h + ' h'; });

  api.puissance = () => puissance(); api.energie = () => energie();
  api.setOn = (arr) => { st.on = new Set(arr); az.querySelectorAll('.lk-chip').forEach((b, i) => b.classList.toggle('on', st.on.has(i))); };
  api.onOpen = () => { api._open = true; initCanvas($('#le-cv', stage)); if (!raf) raf = requestAnimationFrame(boucle); };
  api.onClose = () => { api._open = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } };
}

const MISSIONS = [
  { id: 'e1', xp: 20, titre: 'La puissance', ui: 'num', unite: 'W',
    q: 'Un radiateur branché sous <b>230 V</b> est traversé par <b>I = 8 A</b>. Sa puissance&nbsp;? (<b>P = U × I</b>)',
    check: (v) => Math.abs(v - 1840) <= 40, sol: 'P = 230 × 8 = 1840 W.' },
  { id: 'e2', xp: 20, titre: 'L’énergie', ui: 'num', unite: 'Wh',
    q: 'Une télé de <b>100 W</b> allumée pendant <b>3 h</b>. Énergie consommée&nbsp;? (<b>E = P × t</b>)',
    check: (v) => Math.abs(v - 300) <= 10, sol: 'E = 100 × 3 = 300 Wh.' },
  { id: 'e3', xp: 20, titre: 'Qui consomme le plus ?', ui: 'choix',
    q: 'Allumés pendant la même heure, qui consomme le plus d’énergie&nbsp;: la <b>LED (5 W)</b> ou le <b>radiateur (2000 W)</b>&nbsp;?',
    choix: ['la LED', 'le radiateur'], check: (i) => i === 1,
    sol: 'À durée égale, E ∝ P : le radiateur (2000 W) consomme 400× plus qu’une LED (5 W).' },
  { id: 'e4', xp: 30, titre: 'Dépasse 2500 W', ui: 'live',
    q: 'Allume plusieurs appareils pour dépasser une puissance totale de <b>2500 W</b>.',
    hint: 'Le radiateur (2000 W) + le sèche-cheveux (1500 W) suffisent largement.',
    check: (_r, a) => a.puissance() >= 2500, sol: 'Les puissances s’additionnent : radiateur + sèche-cheveux = 3500 W.' },
  { id: 'e5', xp: 30, titre: 'Baisser la facture', ui: 'choix',
    q: 'Tu remplaces tes ampoules de <b>60 W</b> par des <b>LED de 5 W</b>. Pourquoi ta facture baisse&nbsp;?',
    choix: ['Les LED éclairent moins longtemps', 'À usage égal, moins de puissance = moins d’énergie'], check: (i) => i === 1,
    sol: 'Même durée, mais P bien plus petite → E = P × t plus petite → moins de kWh à payer.' },
];

const labo = creerLabo({
  key: 'lea.labo.energie.v1', titre: '🔥 Labo énergie — P = U × I', couleur: '#ff8a3c',
  badges: { premier: '🔌 Sous tension', final: '🔥 Maître de l’énergie' },
  scene, missions: MISSIONS,
});

function injecterCarte() {
  const d = labo.etat(); const faites = MISSIONS.filter((m) => d.missions[m.id]).length;
  porteLabo({
    id: 'porte-energie', ordre: 5, icone: '🔥', couleur: '#ff8a3c',
    titre: 'Labo énergie', faites, total: MISSIONS.length, niv: niveau(d.xp), ouvrir: labo.ouvrir,
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injecterCarte);
else injecterCarte();
