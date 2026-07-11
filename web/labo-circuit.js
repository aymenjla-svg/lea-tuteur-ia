// Léa — LABO CIRCUIT : MONTE ton propre circuit électrique.
// L'élève pose lui-même les composants (pile, ampoule, interrupteur, résistance,
// fil) sur une boucle et VOIT le courant passer… ou pas. Il comprend en
// construisant et en cassant. 100 % ADDITIF, s'appuie sur labo-kit.js.

import { creerLabo } from './labo-kit.js';

// Composants disponibles dans la palette.
const PALETTE = [
  { t: 'pile', emoji: '🔋', nom: 'Pile' },
  { t: 'ampoule', emoji: '💡', nom: 'Ampoule' },
  { t: 'inter', emoji: '🔘', nom: 'Interrupteur' },
  { t: 'resistance', emoji: '〰️', nom: 'Résistance' },
  { t: 'fil', emoji: '➖', nom: 'Fil' },
  { t: 'vide', emoji: '✂️', nom: 'Trou' },
];

// 4 emplacements sur la boucle (haut, droite, bas, gauche).
const st = { slots: [{ t: 'fil' }, { t: 'fil' }, { t: 'fil' }, { t: 'fil' }], brush: 'pile' };

const conductif = (s) => s.t !== 'vide' && !(s.t === 'inter' && s.on === false);
const compte = (t) => st.slots.filter((s) => s.t === t).length;
const boucleFermee = () => st.slots.every(conductif);
const lit = () => boucleFermee() && compte('pile') >= 1 && compte('ampoule') >= 1;
function eclat() {
  if (!lit()) return 0;
  let b = compte('pile') >= 2 ? 1 : 0.7;
  if (compte('resistance') >= 1) b *= 0.5;
  return b;
}
function diagnostic() {
  if (lit()) return { ok: true, msg: eclat() >= 1 ? '💡 Ça brille FORT ! (2 piles)' : (compte('resistance') ? '💡 Ça brille doucement (la résistance freine).' : '💡 Bravo, l’ampoule est allumée !') };
  if (compte('pile') === 0) return { ok: false, msg: '❌ Il manque une PILE : sans source, pas de courant.' };
  if (compte('ampoule') === 0) return { ok: false, msg: '❌ Il manque une AMPOULE à allumer.' };
  if (st.slots.some((s) => s.t === 'vide')) return { ok: false, msg: '❌ Il y a un TROU dans le circuit : le courant ne peut pas boucler.' };
  if (st.slots.some((s) => s.t === 'inter' && s.on === false)) return { ok: false, msg: '⭕ L’interrupteur est OUVERT : le courant est coupé.' };
  return { ok: false, msg: '❌ Le circuit n’est pas fermé.' };
}

const $ = (s, r = document) => r.querySelector(s);
let cv, ctx, W, H, raf = 0, phase = 0, api, slotXY = [];

function initCanvas(canvas) {
  cv = canvas;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  W = r.width || 520; H = 240;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const L = 70, R = W - 70, T = 44, B = H - 40;
  slotXY = [
    { x: (L + R) / 2, y: T },   // 0 haut
    { x: R, y: (T + B) / 2 },   // 1 droite
    { x: (L + R) / 2, y: B },   // 2 bas
    { x: L, y: (T + B) / 2 },   // 3 gauche
  ];
  slotXY.box = { L, R, T, B };
  cv.onclick = (e) => {
    const rect = cv.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (let i = 0; i < 4; i++) {
      if (Math.abs(mx - slotXY[i].x) < 40 && Math.abs(my - slotXY[i].y) < 30) { clicSlot(i); return; }
    }
  };
  cv.style.cursor = 'pointer';
}

function clicSlot(i) {
  const s = st.slots[i];
  if (st.brush && st.brush !== s.t) {
    st.slots[i] = st.brush === 'inter' ? { t: 'inter', on: true } : { t: st.brush };
  } else if (s.t === 'inter') {
    s.on = !s.on; // reclic → ouvre/ferme
  }
}

function dessineComposant(x, y, s, on) {
  ctx.save(); ctx.translate(x, y);
  ctx.lineWidth = 3; ctx.strokeStyle = '#dfe6f5'; ctx.fillStyle = '#dfe6f5';
  ctx.font = '700 11px Fredoka, sans-serif'; ctx.textAlign = 'center';
  if (s.t === 'fil') {
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.stroke();
  } else if (s.t === 'vide') {
    ctx.strokeStyle = '#ff8f8f'; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-8, 0); ctx.moveTo(8, 0); ctx.lineTo(26, 0); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = '#ff8f8f'; ctx.fillText('✂', 0, 4);
  } else if (s.t === 'pile') {
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-8, 0); ctx.moveTo(8, 0); ctx.lineTo(26, 0); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-8, 12); ctx.stroke();
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(4, -7); ctx.lineTo(4, 7); ctx.stroke();
    ctx.fillStyle = '#ffd24a'; ctx.fillText('PILE', 0, 26);
  } else if (s.t === 'resistance') {
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-16, 0);
    ctx.strokeStyle = '#e0a83e'; ctx.strokeRect(-16, -8, 32, 16); ctx.moveTo(16, 0); ctx.lineTo(26, 0); ctx.stroke();
    ctx.fillStyle = '#e0a83e'; ctx.fillText('R', 0, 4);
  } else if (s.t === 'inter') {
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-10, 0); ctx.moveTo(12, 0); ctx.lineTo(26, 0); ctx.stroke();
    ctx.fillStyle = '#9fb0cc'; ctx.beginPath(); ctx.arc(-10, 0, 3, 0, 7); ctx.arc(12, 0, 3, 0, 7); ctx.fill();
    ctx.strokeStyle = on ? '#7fe0a8' : '#ff9a7a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(on ? 12 : 8, on ? 0 : -14); ctx.stroke();
    ctx.fillStyle = on ? '#7fe0a8' : '#ff9a7a'; ctx.fillText(on ? 'ON' : 'OFF', 0, 26);
  } else if (s.t === 'ampoule') {
    const b = eclat();
    if (b > 0) { const h = ctx.createRadialGradient(0, 0, 2, 0, 0, 34); h.addColorStop(0, `rgba(255,230,140,${.3 + b * .6})`); h.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = h; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#cbd5e8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-15, 0); ctx.moveTo(15, 0); ctx.lineTo(26, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fillStyle = b ? `rgb(255,210,${Math.round(60 + b * 60)})` : '#26304a'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = b ? '#c98a2a' : '#5a6a86'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-2, -6); ctx.lineTo(2, 5); ctx.lineTo(6, -6); ctx.stroke();
  }
  ctx.restore();
}

function dessiner() {
  if (!ctx) return;
  ctx.fillStyle = '#070d1c'; ctx.fillRect(0, 0, W, H);
  const { L, R, T, B } = slotXY.box;
  const on = lit();
  // fils de la boucle (segments entre les slots) — verts si courant passe
  ctx.strokeStyle = on ? '#41b892' : '#39435c'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(L, T); ctx.lineTo(R, T); ctx.lineTo(R, B); ctx.lineTo(L, B); ctx.closePath(); ctx.stroke();
  // slots
  for (let i = 0; i < 4; i++) {
    const p = slotXY[i];
    ctx.fillStyle = '#0d1526';
    ctx.strokeStyle = '#ffffff26'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(p.x - 34, p.y - 20, 68, 40, 8); ctx.fill(); ctx.stroke();
    dessineComposant(p.x, p.y, st.slots[i], st.slots[i].on !== false);
  }
  // électrons
  if (on) {
    ctx.fillStyle = '#7fe0ff';
    for (let k = 0; k < 16; k++) {
      const pp = (phase + k / 16) % 1; const [x, y] = pointLoop(pp, L, R, T, B);
      ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill();
    }
  }
}

function pointLoop(p, L, R, T, B) {
  const w = R - L, h = B - T, per = 2 * (w + h); let d = p * per;
  if (d < w) return [L + d, T]; d -= w;
  if (d < h) return [R, T + d]; d -= h;
  if (d < w) return [R - d, B]; d -= w; return [L, B - d];
}

function boucle() {
  if (!api._open) { raf = 0; return; }
  if (lit()) phase = (phase + 0.01 * (eclat() >= 1 ? 1.6 : 1)) % 1;
  dessiner(); majDiag();
  raf = requestAnimationFrame(boucle);
}
function majDiag() {
  const d = diagnostic(); const el = $('#lc-diag');
  if (el) { el.textContent = d.msg; el.style.color = d.ok ? '#7fe0a8' : '#ffb38a'; }
}

function scene(stage, _api) {
  api = _api;
  stage.innerHTML = `
    <canvas class="lk-cv" id="lc-cv" style="height:240px"></canvas>
    <div class="lk-ctrl">
      <div class="lk-line">Prends un composant, puis clique un emplacement du circuit :</div>
      <div class="lk-chips" id="lc-pal"></div>
      <div class="lk-note" id="lc-diag" style="font-weight:600">Monte ton circuit…</div>
      <div class="lk-act">
        <button class="lk-btn" id="lc-reset">🧹 Tout effacer</button>
        <span style="color:#9fb0cc;font-size:.8rem;margin-left:8px">Astuce : reclique un interrupteur pour l’ouvrir/fermer.</span>
      </div>
    </div>`;
  const pal = $('#lc-pal', stage);
  pal.innerHTML = PALETTE.map((c) => `<button class="lk-chip" data-t="${c.t}">${c.emoji} ${c.nom}</button>`).join('');
  const majBrush = () => pal.querySelectorAll('.lk-chip').forEach((b) => b.classList.toggle('on', b.dataset.t === st.brush));
  pal.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { st.brush = b.dataset.t; majBrush(); }));
  $('#lc-reset', stage).addEventListener('click', () => { st.slots = [{ t: 'fil' }, { t: 'fil' }, { t: 'fil' }, { t: 'fil' }]; });
  majBrush();

  api.lit = () => lit(); api.piles = () => compte('pile'); api.hasAmpoule = () => compte('ampoule') >= 1;
  api.hasInter = () => compte('inter') >= 1; api.interOuvert = () => st.slots.some((s) => s.t === 'inter' && s.on === false);
  api.hasResistance = () => compte('resistance') >= 1;
  api.setSlots = (arr) => { st.slots = arr.map((s) => (typeof s === 'string' ? { t: s } : { ...s })); };
  api.onOpen = () => { api._open = true; initCanvas($('#lc-cv', stage)); if (!raf) raf = requestAnimationFrame(boucle); };
  api.onClose = () => { api._open = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } };
}

const MISSIONS = [
  { id: 'c1', xp: 25, titre: 'Allume l’ampoule', ui: 'live',
    q: 'Monte un circuit qui <b>allume l’ampoule</b> : il faut au moins une <b>pile</b> et une <b>ampoule</b>, et la boucle doit être fermée.',
    hint: 'Prends « Pile » et pose-la ; prends « Ampoule » et pose-la ; laisse le reste en fil.',
    prep: (a) => a.setSlots(['fil', 'fil', 'fil', 'fil']),
    check: (_r, a) => a.lit(), sol: 'Une pile (source) + une ampoule + une boucle fermée = le courant circule.' },
  { id: 'c2', xp: 25, titre: 'Le bouton magique', ui: 'live',
    q: 'On te donne un circuit qui marche. Ajoute un <b>interrupteur</b> et <b>éteins</b> la lampe sans enlever la pile.',
    hint: 'Pose un interrupteur sur un fil, puis reclique-le pour l’ouvrir (OFF).',
    prep: (a) => a.setSlots(['ampoule', 'fil', 'pile', 'fil']),
    check: (_r, a) => a.hasInter() && a.interOuvert() && a.piles() >= 1 && !a.lit(),
    sol: 'Interrupteur ouvert = boucle coupée = plus de courant. C’est comme l’interrupteur du plafond.' },
  { id: 'c3', xp: 20, titre: 'Pourquoi c’est éteint ?', ui: 'choix',
    q: 'Ce circuit a une pile et une ampoule, mais rien ne s’allume (regarde le schéma). Pourquoi&nbsp;?',
    choix: ['Il y a un trou : la boucle n’est pas fermée', 'La pile est trop petite', 'L’ampoule est trop loin'],
    check: (i) => i === 0, prep: (a) => a.setSlots(['ampoule', 'vide', 'pile', 'fil']),
    sol: 'Un circuit doit être une boucle FERMÉE. Le moindre trou coupe tout.' },
  { id: 'c4', xp: 25, titre: 'Baisse la lumière', ui: 'live',
    q: 'Garde l’ampoule allumée, mais fais-la briller <b>plus faiblement</b> en ajoutant une <b>résistance</b>.',
    hint: 'Pars d’un circuit qui marche, puis remplace un fil par une résistance.',
    prep: (a) => a.setSlots(['ampoule', 'fil', 'pile', 'fil']),
    check: (_r, a) => a.lit() && a.hasResistance(),
    sol: 'La résistance freine le courant : moins d’intensité → l’ampoule brille moins.' },
  { id: 'c5', xp: 30, titre: 'Plein phare', ui: 'live',
    q: 'Fais briller l’ampoule le plus fort possible en mettant <b>deux piles</b> dans le circuit.',
    hint: 'Pose une pile, une ampoule, et une deuxième pile sur les emplacements restants.',
    prep: (a) => a.setSlots(['ampoule', 'fil', 'pile', 'fil']),
    check: (_r, a) => a.piles() >= 2 && a.lit(),
    sol: 'Deux piles = plus de tension = plus de courant = ça brille plus fort (attention à ne pas la griller en vrai !).' },
];

const labo = creerLabo({
  key: 'lea.labo.circuit.v1', titre: '⚡ Labo circuit — monte ton circuit',
  badges: { premier: '🔌 Premier montage', final: '⚡ Ingénieur électricien' },
  scene, missions: MISSIONS,
});

function injecterCarte() {
  const accueil = $('#accueil'); if (!accueil || $('#lc-card')) return;
  const d = labo.etat(); const faites = MISSIONS.filter((m) => d.missions[m.id]).length;
  const card = document.createElement('div');
  card.className = 'lk-card'; card.id = 'lc-card';
  card.style.background = 'linear-gradient(135deg,#0b3a4a,#116a7a 60%,#0e8a6a)';
  card.innerHTML =
    '<h3>⚡ Labo circuit — monte ton circuit électrique</h3>' +
    '<p>Pose toi-même la pile, l’ampoule, l’interrupteur… clique pour brancher, allume, éteins, fais briller plus fort. Tu construis, donc tu comprends.</p>' +
    `<button class="lk-cta" id="lc-open">🎮 Jouer${faites ? ' — continuer' : ''}</button>` +
    (faites ? `<span class="lk-mini">⭐ ${faites}/${MISSIONS.length}</span>` : '');
  const ancre = accueil.querySelector('#lab-card') || accueil.querySelector('#rev-card') || accueil.querySelector('p.note');
  if (ancre) accueil.insertBefore(card, ancre); else accueil.appendChild(card);
  $('#lc-open').addEventListener('click', labo.ouvrir);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injecterCarte);
else injecterCarte();
