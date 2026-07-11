// Léa — LE LABO : « Odyssée gravité » — un mini-jeu de physique interactif.
//
// 100 % ADDITIF et autonome : ne modifie AUCUN fichier existant, ne touche ni au
// moteur, ni aux leçons, ni au tuteur, ni à l'Edge. S'auto-initialise, injecte
// ses styles (.lab-), une carte d'entrée dans l'accueil et une modale plein
// écran avec un simulateur canvas (physique réelle) + un parcours de missions.
// Retirable en supprimant la seule ligne <script> ajoutée dans index.html.
//
// Pédagogie (cycle 4 — poids & masse) : rendre PALPABLE la différence masse/poids
// et le rôle de g. On manipule, on PRÉDIT, puis on VOIT (predict-then-reveal),
// on gagne de l'XP et des badges → boucle de jeu addictive mais 100 % physique.

/* --------------------------------- Données -------------------------------- */
// g en N/kg (valeurs scolaires) · sol/ciel pour l'ambiance · fait = accroche.
const ASTRES = [
  { id: 'terre',   nom: 'Terre',   emoji: '🌍', g: 9.8,  ciel: ['#1a2a55', '#3f6db0'], sol: '#3a7a4a', astre: '#4f9e5e', fait: 'Ta référence : g ≈ 9,8 N/kg.' },
  { id: 'lune',    nom: 'Lune',    emoji: '🌙', g: 1.6,  ciel: ['#05060f', '#171a2b'], sol: '#8a8a90', astre: '#c8c8cf', fait: '6× plus léger que sur Terre !' },
  { id: 'mars',    nom: 'Mars',    emoji: '🔴', g: 3.7,  ciel: ['#2a0f0a', '#7a3a22'], sol: '#a3502f', astre: '#c96a3c', fait: 'La planète rouge : g ≈ 3,7.' },
  { id: 'venus',   nom: 'Vénus',   emoji: '🟠', g: 8.9,  ciel: ['#3a2a05', '#b58a2a'], sol: '#c79b3a', astre: '#e6c15a', fait: 'Presque comme la Terre (8,9).' },
  { id: 'jupiter', nom: 'Jupiter', emoji: '🟤', g: 24.8, ciel: ['#2a1a0a', '#8a5a2a'], sol: '#b07840', astre: '#d8a86a', fait: 'La géante : tu y pèses très lourd !' },
  { id: 'soleil',  nom: 'Soleil',  emoji: '☀️', g: 274,  ciel: ['#4a2a00', '#ff9a1e'], sol: '#ff7a1e', astre: '#ffd24a', fait: 'Écrasant : 274 N/kg. Le pèse-personne explose 💥.' },
  { id: 'espace',  nom: 'Espace',  emoji: '🌌', g: 0,    ciel: ['#000008', '#0a0a1c'], sol: '#0a0a1c', astre: '#0a0a1c', fait: 'Apesanteur : g = 0 → poids nul. Mais la masse, elle, reste !' },
];
const parAstre = (id) => ASTRES.find((a) => a.id === id) || ASTRES[0];

// Objets du QUOTIDIEN : on expérimente avec des masses qu'on connaît vraiment,
// pas des nombres abstraits. « Prends ton cartable et emmène-le sur la Lune. »
const OBJETS = [
  { emoji: '💧', nom: 'Bouteille d’eau', m: 1 },
  { emoji: '🍎', nom: 'Une pomme', m: 1 },   // ~ arrondi pédagogique (une pomme ≈ 0,15 kg → on prend un sac)
  { emoji: '🐱', nom: 'Un chat', m: 4 },
  { emoji: '🎒', nom: 'Ton cartable', m: 6 },
  { emoji: '🐶', nom: 'Un gros chien', m: 20 },
  { emoji: '🚲', nom: 'Un vélo', m: 12 },
  { emoji: '🧑', nom: 'Toi (un collégien)', m: 45 },
];

// « Ressenti » : traduire des newtons en sensation concrète pour un ado.
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

const CLE = 'lea.labo.v1';
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function charger() { try { return { xp: 0, missions: {}, badges: [], ...JSON.parse(localStorage.getItem(CLE) || '{}') }; } catch { return { xp: 0, missions: {}, badges: [] }; } }
function sauver(d) { try { localStorage.setItem(CLE, JSON.stringify(d)); } catch { /* stockage indispo */ } }
const niveau = (xp) => Math.floor(xp / 100) + 1;

/* --------------------------------- Missions ------------------------------- */
// Parcours pédagogique : chaque mission fait PRÉDIRE avant de RÉVÉLER.
const MISSIONS = [
  {
    id: 'm1', xp: 20, astre: 'terre', masse: 6, titre: 'Premier pesage',
    type: 'num', unite: 'N',
    q: 'Masse réglée sur 6 kg, sur la Terre (g ≈ 9,8 N/kg). D’après <b>P = m × g</b>, combien pèse l’astronaute&nbsp;?',
    ok: (v) => Math.abs(v - 6 * 9.8) <= 9,      // 60 (avec g=10) accepté aussi
    sol: 'P = 6 × 9,8 ≈ 59 N (≈ 60 si tu prends g = 10).',
  },
  {
    id: 'm2', xp: 20, astre: 'lune', masse: 6, titre: 'Direction la Lune',
    type: 'choix', q: 'On emmène le MÊME astronaute (6 kg) sur la Lune. Son <b>POIDS</b> va…',
    choix: ['augmenter', 'diminuer', 'rester identique'], bon: 1,
    sol: 'Sur la Lune g ≈ 1,6 → P ≈ 6 × 1,6 ≈ 9,6 N. Bien plus petit !',
  },
  {
    id: 'm3', xp: 20, astre: 'lune', masse: 6, titre: 'Le piège classique',
    type: 'choix', q: 'Et sa <b>MASSE</b>, sur la Lune, elle…',
    choix: ['augmente', 'diminue', 'reste 6 kg'], bon: 2,
    sol: 'La masse (kg) ne change JAMAIS d’un astre à l’autre. Seul le poids varie.',
  },
  {
    id: 'm4', xp: 25, masse: 10, titre: 'Enquête gravité',
    type: 'planete', q: 'Un objet de 10 kg y pèse environ <b>37 N</b>. Sur quelle planète est-on&nbsp;? (clique un astre)',
    ok: (astre) => Math.abs(astre.g - 3.7) < 0.6,
    sol: '37 ÷ 10 = 3,7 N/kg → c’est Mars.',
  },
  {
    id: 'm5', xp: 30, titre: 'Mission mystère : 100 N pile',
    type: 'reglage', cible: 100, tol: 6,
    q: 'Règle la <b>masse</b> ET l’<b>astre</b> pour que l’astronaute pèse <b>exactement 100 N</b> (± 6). Plusieurs solutions existent&nbsp;!',
    sol: 'Ex. : 10 kg sur Terre (98 N), ou ~62 kg sur la Lune, ou ~4 kg sur Jupiter…',
  },
  {
    id: 'm6', xp: 35, titre: 'Course de chute libre',
    type: 'course', q: 'On lâche le même objet d’en haut sur <b>Terre</b> et sur la <b>Lune</b>. Où touche-t-il le sol en PREMIER&nbsp;?',
    choix: ['Terre', 'Lune'], bon: 0,
    sol: 'Plus g est grand, plus la chute est rapide : la Terre gagne.',
  },
];
const BADGE_FINAL = { id: 'explorateur', txt: '🚀 Explorateur du système solaire' };

/* --------------------------------- Styles --------------------------------- */
function injecterStyles() {
  if ($('#lab-style')) return;
  const st = document.createElement('style'); st.id = 'lab-style';
  st.textContent = `
  .lab-card{margin:14px 0 6px;border-radius:var(--rad,18px);padding:16px;color:#fff;position:relative;overflow:hidden;
    background:linear-gradient(135deg,#132a5e,#4b2b7a 60%,#7a2b6e);border:1.5px solid #ffffff2e}
  .lab-card::after{content:"🌍  🚀  🌙  ⭐";position:absolute;right:-4px;top:8px;font-size:1.4rem;opacity:.35;letter-spacing:6px}
  .lab-card h3{font-family:var(--round,sans-serif);margin:0 0 4px;font-size:1.08rem}
  .lab-card p{margin:0 0 12px;color:#dfe4ff;font-size:.9rem;max-width:82%}
  .lab-cta{font-family:var(--round,sans-serif);font-weight:700;font-size:.95rem;padding:11px 18px;border-radius:999px;border:0;
    background:#ffd24a;color:#3a2400;cursor:pointer;box-shadow:0 4px 14px #0004}
  .lab-cta:hover{filter:brightness(1.06)}
  .lab-mini{display:inline-block;margin-left:10px;font-size:.82rem;color:#ffe9a8}

  .lab-modale{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(4,6,16,.72);backdrop-filter:blur(4px)}
  .lab-modale[hidden]{display:none}
  .lab-wrap{width:min(560px,97vw);max-height:95vh;overflow:auto;background:#0e1424;border:1.5px solid #ffffff24;border-radius:22px;padding:0}
  .lab-top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px 8px}
  .lab-top h2{font-family:var(--round,sans-serif);font-size:1.15rem;margin:0;color:#fff}
  .lab-x{background:none;border:0;color:#cbd5e8;font-size:1.6rem;line-height:1;cursor:pointer}
  .lab-xp{padding:0 16px 8px}
  .lab-xpbar{height:9px;border-radius:999px;background:#ffffff18;overflow:hidden}
  .lab-xpbar>span{display:block;height:100%;background:linear-gradient(90deg,#14c8d4,#ffd24a);transition:width .5s}
  .lab-xpline{display:flex;justify-content:space-between;font-size:.76rem;color:#9fb0cc;margin-top:4px;font-family:var(--round,sans-serif);font-weight:600}
  canvas.lab-cv{display:block;width:100%;height:230px;border-top:1px solid #ffffff14;border-bottom:1px solid #ffffff14;background:#05060f}
  .lab-read{display:flex;gap:8px;padding:10px 12px;justify-content:center;flex-wrap:wrap}
  .lab-read div{background:#ffffff10;border:1.5px solid #ffffff1e;border-radius:12px;padding:7px 12px;text-align:center;min-width:82px}
  .lab-read .k{font-size:.68rem;color:#9fb0cc;text-transform:uppercase;letter-spacing:.06em}
  .lab-read .v{font-family:var(--round,sans-serif);font-weight:700;font-size:1.15rem}
  .lab-read .v.p{color:#ffd24a}.lab-read .v.m{color:#14c8d4}.lab-read .v.g{color:#7fe0a8}
  .lab-ctrl{padding:4px 14px 12px}
  .lab-objline{font-family:var(--round,sans-serif);font-weight:600;font-size:.82rem;color:#dfe4ff;margin:2px 0 6px}
  .lab-objets{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
  .lab-obj{display:flex;align-items:center;gap:5px;font-family:var(--round,sans-serif);font-weight:600;font-size:.8rem;padding:6px 10px;border-radius:12px;border:1.5px solid #ffffff20;background:#ffffff0e;color:#fff;cursor:pointer}
  .lab-obj .mk{font-size:.68rem;color:#9fb0cc}
  .lab-obj.on{border-color:#14c8d4;background:#14c8d422}
  .lab-obj:hover{filter:brightness(1.1)}
  .lab-ressenti{text-align:center;font-size:.86rem;color:#dfe4ff;background:#ffffff0d;border:1px solid #ffffff16;border-radius:12px;padding:7px 10px;margin:8px 0 2px;line-height:1.35}
  .lab-ressenti b{color:#ffd98a}
  .lab-slide{display:flex;align-items:center;gap:10px;margin:6px 0 10px}
  .lab-slide label{font-family:var(--round,sans-serif);font-weight:600;font-size:.85rem;color:#dfe4ff;white-space:nowrap}
  .lab-slide input[type=range]{flex:1;accent-color:#14c8d4}
  .lab-astres{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
  .lab-astre{font-family:var(--round,sans-serif);font-weight:600;font-size:.82rem;padding:7px 11px;border-radius:999px;border:1.5px solid #ffffff22;background:#ffffff10;color:#fff;cursor:pointer}
  .lab-astre.on{border-color:#ffd24a;background:#ffd24a22;box-shadow:inset 0 0 0 1.5px #ffd24a55}
  .lab-drop{margin-top:8px;text-align:center}
  .lab-btn{font-family:var(--round,sans-serif);font-weight:700;font-size:.9rem;padding:9px 16px;border-radius:999px;border:1.5px solid #ffffff2e;background:#ffffff16;color:#fff;cursor:pointer}
  .lab-btn.gold{background:#ffd24a;color:#3a2400;border-color:transparent}
  .lab-btn:hover{filter:brightness(1.08)}
  .lab-fait{text-align:center;font-size:.82rem;color:#bcae86;padding:2px 14px 10px}

  .lab-miss{margin:6px 12px 14px;background:#12203c;border:1.5px solid #ffffff20;border-radius:16px;padding:14px}
  .lab-miss .tag{font-family:var(--round,sans-serif);font-weight:700;font-size:.72rem;color:#7fe0a8;text-transform:uppercase;letter-spacing:.08em}
  .lab-miss h4{font-family:var(--round,sans-serif);margin:2px 0 8px;color:#fff;font-size:1.05rem}
  .lab-miss .q{color:#dfe4ff;font-size:.92rem;line-height:1.45;margin:0 0 10px}
  .lab-miss .q b{color:#ffd98a}
  .lab-choix{display:flex;flex-direction:column;gap:7px}
  .lab-choix button{text-align:left;padding:10px 13px;border-radius:12px;border:1.5px solid #ffffff22;background:#ffffff10;color:#fff;cursor:pointer;font-size:.92rem}
  .lab-choix button.sel{border-color:#14c8d4;background:#14c8d422}
  .lab-numin{width:120px;padding:9px 12px;border-radius:10px;border:1.5px solid #ffffff2a;background:#0a1120;color:#fff;font-size:1rem}
  .lab-fb{margin-top:10px;padding:10px 12px;border-radius:12px;font-size:.9rem;line-height:1.4;display:none}
  .lab-fb.show{display:block}
  .lab-fb.good{background:#14c8d41f;border:1.5px solid #14c8d4aa;color:#c9fff6}
  .lab-fb.bad{background:#ff8f8f1c;border:1.5px solid #ff8f8f88;color:#ffd9d9}
  .lab-fb .sol{display:block;margin-top:6px;color:#dfe4ff}
  .lab-next{margin-top:10px;display:flex;gap:8px;justify-content:flex-end}
  .lab-badges{display:flex;gap:6px;flex-wrap:wrap;padding:0 14px 12px}
  .lab-badge{font-size:.76rem;background:#ffd24a1c;border:1.5px solid #ffd24a66;color:#ffe6a0;border-radius:999px;padding:4px 10px;font-weight:600}
  .lab-fin{text-align:center;padding:6px 14px 16px}
  .lab-fin .big{font-size:2.6rem}
  .lab-fin h4{font-family:var(--round,sans-serif);color:#fff;margin:6px 0 4px}
  .lab-fin p{color:#dfe4ff;font-size:.9rem;margin:0 0 10px}
  `;
  document.head.appendChild(st);
}

/* --------------------------- État de simulation --------------------------- */
const sim = {
  masse: 10, astreId: 'terre', objet: null,
  fall: null,          // { y, v } pendant une chute (y en mètres, 0 = haut, HMETRES = sol)
  needle: 0,           // valeur affichée par l'aiguille (N), suit P avec ressort
  raf: 0, last: 0,
};
const HMETRES = 4;     // hauteur de chute simulée
const poids = () => sim.masse * parAstre(sim.astreId).g;

/* --------------------------------- Canvas --------------------------------- */
let cv, ctx, W, H, etoiles;
function initCanvas(canvas) {
  cv = canvas;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  W = r.width || 520; H = 230;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // champ d'étoiles fixe (déterministe, pas de Math.random dépendant du temps)
  etoiles = Array.from({ length: 60 }, (_, i) => ({
    x: ((i * 97) % 100) / 100 * W,
    y: ((i * 57) % 70) / 100 * H,
    r: (i % 3 === 0) ? 1.4 : 0.8, a: 0.3 + (i % 5) / 10,
  }));
}

function niceMax(p) {
  for (const m of [50, 100, 150, 250, 500, 1000, 2500, 5000, 10000, 30000]) if (p <= m) return m;
  return 30000;
}

function dessiner() {
  if (!ctx) return;
  const a = parAstre(sim.astreId);
  const solY = H - 34;
  // ciel
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, a.ciel[0]); gr.addColorStop(1, a.ciel[1]);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  // étoiles (espace / lune surtout)
  if (a.id === 'espace' || a.id === 'lune' || a.id === 'mars') {
    for (const s of etoiles) { ctx.globalAlpha = s.a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  // astre à l'horizon
  if (a.id !== 'espace') {
    ctx.fillStyle = a.astre; ctx.beginPath(); ctx.arc(W * 0.5, solY + 120, 150, Math.PI, 0); ctx.fill();
  }
  // sol
  if (a.id !== 'espace') { ctx.fillStyle = a.sol; ctx.fillRect(0, solY, W, H - solY); }

  // --- pèse-personne (jauge) à droite ---
  const gx = W - 84, gy = solY - 6, gr2 = 46;
  const p = poids(), fs = niceMax(Math.max(p, sim.needle, 20));
  ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(gx, gy, gr2, Math.PI, 0); ctx.stroke();
  // graduations
  ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 1.5;
  for (let i = 0; i <= 5; i++) {
    const ang = Math.PI - (i / 5) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(gx + Math.cos(ang) * (gr2 - 8), gy - Math.sin(ang) * (gr2 - 8));
    ctx.lineTo(gx + Math.cos(ang) * (gr2 + 2), gy - Math.sin(ang) * (gr2 + 2));
    ctx.stroke();
  }
  // aiguille
  const frac = clamp(sim.needle / fs, 0, 1);
  const ang = Math.PI - frac * Math.PI;
  ctx.strokeStyle = p > fs * 1.02 ? '#ff6b6b' : '#ffd24a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(gx, gy);
  ctx.lineTo(gx + Math.cos(ang) * (gr2 - 4), gy - Math.sin(ang) * (gr2 - 4)); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx, gy, 3.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffe9a8'; ctx.font = '700 12px Fredoka, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`0 – ${fs} N`, gx, gy + 14);

  // --- astronaute ---
  let ay;
  if (sim.fall) ay = 24 + (sim.fall.y / HMETRES) * (solY - 60);
  else ay = solY - 40; // posé au sol
  const ax = W * 0.32;
  const scale = 0.8 + clamp(sim.masse, 1, 100) / 200; // masse un peu visible
  dessinerAstronaute(ax, ay, scale, a.id === 'espace' && !sim.fall);
  ctx.textAlign = 'left';
}

function dessinerAstronaute(x, y, s, flotte) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (flotte) ctx.rotate(-0.25);
  // corps
  ctx.fillStyle = '#e9edf6'; ctx.strokeStyle = '#b9c2d6'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-13, 0, 26, 30, 9); ctx.fill(); ctx.stroke();
  // jambes
  ctx.beginPath(); ctx.roundRect(-11, 26, 9, 16, 4); ctx.roundRect(2, 26, 9, 16, 4); ctx.fill(); ctx.stroke();
  // bras
  ctx.beginPath(); ctx.roundRect(-20, 4, 8, 20, 4); ctx.roundRect(12, 4, 8, 20, 4); ctx.fill(); ctx.stroke();
  // casque
  ctx.beginPath(); ctx.arc(0, -12, 15, 0, 7); ctx.fill(); ctx.stroke();
  // visière
  ctx.fillStyle = '#1a2540'; ctx.beginPath(); ctx.arc(1, -12, 10, 0, 7); ctx.fill();
  ctx.fillStyle = '#14c8d4'; ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(-3, -15, 3.5, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  // logo Léa
  ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(0, 12, 4, 0, 7); ctx.fill();
  ctx.restore();
}

function boucle(t) {
  if (!modale || modale.hidden) { sim.raf = 0; return; }
  const dt = Math.min(0.05, (t - (sim.last || t)) / 1000); sim.last = t;
  // chute libre
  if (sim.fall) {
    const g = parAstre(sim.astreId).g;
    if (g <= 0) { sim.fall.y += 0.15; if (sim.fall.y > HMETRES) sim.fall = null; }
    else {
      sim.fall.v += g * dt; sim.fall.y += sim.fall.v * dt;
      if (sim.fall.y >= HMETRES) { sim.fall = null; }
    }
  }
  // aiguille : ressort vers P
  const cible = poids();
  sim.needle += (cible - sim.needle) * Math.min(1, dt * 9);
  if (Math.abs(cible - sim.needle) < 0.3) sim.needle = cible;
  dessiner();
  majReadout();
  sim.raf = requestAnimationFrame(boucle);
}
function lancerBoucle() { if (!sim.raf) sim.raf = requestAnimationFrame(boucle); }

/* -------------------------------- Readout --------------------------------- */
function majReadout() {
  const p = poids();
  const el = $('#lab-vP', modale); if (!el) return;
  el.textContent = p >= 1000 ? Math.round(p) : p.toFixed(p < 100 ? 1 : 0);
  $('#lab-vM', modale).textContent = sim.masse;
  $('#lab-vG', modale).textContent = parAstre(sim.astreId).g;
  const r = $('#lab-ressenti', modale);
  if (r) {
    const a = parAstre(sim.astreId);
    const quoi = sim.objet ? `${sim.objet.emoji} ${sim.objet.nom} (${sim.objet.m} kg)` : `${sim.masse} kg`;
    r.innerHTML = `Sur <b>${a.nom}</b>, ${quoi} pèse <b>${p < 100 ? p.toFixed(1) : Math.round(p)} N</b> → ${ressenti(p)}`;
  }
}

/* --------------------------------- Modale --------------------------------- */
let modale, missionCourante = 0;
function assurer() {
  if (modale) return;
  injecterStyles();
  modale = document.createElement('div'); modale.className = 'lab-modale'; modale.hidden = true;
  modale.innerHTML = `
  <div class="lab-wrap" role="dialog" aria-modal="true" aria-label="Le Labo — Odyssée gravité">
    <div class="lab-top"><h2>🚀 Le Labo — Odyssée gravité</h2><button class="lab-x" aria-label="Fermer">×</button></div>
    <div class="lab-xp">
      <div class="lab-xpbar"><span id="lab-xpfill" style="width:0"></span></div>
      <div class="lab-xpline"><span id="lab-niv">Niveau 1</span><span id="lab-xptxt">0 XP</span></div>
    </div>
    <div class="lab-badges" id="lab-badges"></div>
    <canvas class="lab-cv" id="lab-cv"></canvas>
    <div class="lab-read">
      <div><div class="k">Masse</div><div class="v m"><span id="lab-vM">10</span> kg</div></div>
      <div><div class="k">Gravité g</div><div class="v g"><span id="lab-vG">9.8</span> N/kg</div></div>
      <div><div class="k">Poids P</div><div class="v p"><span id="lab-vP">98</span> N</div></div>
    </div>
    <div class="lab-ctrl">
      <div class="lab-objline">Prends un objet de tous les jours&nbsp;:</div>
      <div class="lab-objets" id="lab-objets"></div>
      <div class="lab-slide"><label>…ou règle la masse</label><input id="lab-masse" type="range" min="1" max="100" step="1" value="10"><span id="lab-masse-l" style="font-family:var(--round);font-weight:700;color:#14c8d4;width:52px">10 kg</span></div>
      <div class="lab-astres" id="lab-astres"></div>
      <div class="lab-ressenti" id="lab-ressenti"></div>
      <div class="lab-drop"><button class="lab-btn" id="lab-lacher">🪂 Lâcher l’objet</button></div>
      <div class="lab-fait" id="lab-fait"></div>
    </div>
    <div class="lab-miss" id="lab-miss"></div>
  </div>`;
  modale.addEventListener('click', (e) => { if (e.target === modale || e.target.classList.contains('lab-x')) fermer(); });
  document.body.appendChild(modale);

  // slider masse
  const sl = $('#lab-masse', modale);
  sl.addEventListener('input', () => {
    sim.masse = +sl.value; sim.objet = null; $('#lab-masse-l', modale).textContent = sim.masse + ' kg';
    modale.querySelectorAll('.lab-obj').forEach((x) => x.classList.remove('on'));
  });
  // astres
  const zone = $('#lab-astres', modale);
  zone.innerHTML = ASTRES.map((a) => `<button class="lab-astre" data-a="${a.id}">${a.emoji} ${a.nom}</button>`).join('');
  zone.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => choisirAstre(b.dataset.a)));
  // objets du quotidien
  const oz = $('#lab-objets', modale);
  oz.innerHTML = OBJETS.map((o, i) => `<button class="lab-obj" data-o="${i}">${o.emoji} ${o.nom}<span class="mk">${o.m} kg</span></button>`).join('');
  oz.querySelectorAll('[data-o]').forEach((b) => b.addEventListener('click', () => {
    const o = OBJETS[+b.dataset.o]; sim.objet = o; sim.masse = o.m;
    $('#lab-masse', modale).value = o.m; $('#lab-masse-l', modale).textContent = o.m + ' kg';
    oz.querySelectorAll('.lab-obj').forEach((x) => x.classList.remove('on')); b.classList.add('on');
  }));
  // lâcher
  $('#lab-lacher', modale).addEventListener('click', () => { sim.fall = { y: 0, v: 0 }; });
}

function choisirAstre(id) {
  sim.astreId = id;
  modale.querySelectorAll('.lab-astre').forEach((b) => b.classList.toggle('on', b.dataset.a === id));
  $('#lab-fait', modale).textContent = parAstre(id).emoji + ' ' + parAstre(id).fait;
}

function syncSim() {
  const sl = $('#lab-masse', modale); sl.value = sim.masse; $('#lab-masse-l', modale).textContent = sim.masse + ' kg';
  choisirAstre(sim.astreId);
}

function ouvrir() {
  assurer();
  modale.hidden = false;
  initCanvas($('#lab-cv', modale));
  sim.needle = poids();
  syncSim();
  majBandeauXP();
  // reprend à la première mission non faite
  const d = charger();
  missionCourante = MISSIONS.findIndex((m) => !d.missions[m.id]);
  if (missionCourante < 0) missionCourante = MISSIONS.length; // tout fait
  rendreMission();
  lancerBoucle();
}
function fermer() { if (modale) modale.hidden = true; if (sim.raf) { cancelAnimationFrame(sim.raf); sim.raf = 0; } }

/* ------------------------------ Bandeau XP -------------------------------- */
function majBandeauXP() {
  const d = charger();
  const niv = niveau(d.xp), dansNiv = d.xp % 100;
  $('#lab-xpfill', modale).style.width = dansNiv + '%';
  $('#lab-niv', modale).textContent = 'Niveau ' + niv;
  $('#lab-xptxt', modale).textContent = d.xp + ' XP';
  const bz = $('#lab-badges', modale);
  bz.innerHTML = (d.badges || []).map((b) => `<span class="lab-badge">${b}</span>`).join('');
}

/* ------------------------------- Missions --------------------------------- */
function rendreMission() {
  const zone = $('#lab-miss', modale);
  const d = charger();
  const faites = MISSIONS.filter((m) => d.missions[m.id]).length;

  if (missionCourante >= MISSIONS.length) {
    zone.innerHTML =
      '<div class="lab-fin"><div class="big">🏆</div>' +
      `<h4>Parcours terminé — ${faites}/${MISSIONS.length} missions&nbsp;!</h4>` +
      '<p>Tu maîtrises la différence masse / poids et le rôle de g. Continue à explorer le système solaire en mode libre&nbsp;: change de planète et observe l’aiguille.</p>' +
      '<button class="lab-btn gold" id="lab-rejouer">↻ Rejouer les missions</button></div>';
    $('#lab-rejouer', modale).addEventListener('click', () => {
      const dd = charger(); dd.missions = {}; sauver(dd); missionCourante = 0; rendreMission();
    });
    return;
  }

  const m = MISSIONS[missionCourante];
  // pré-règle la scène selon la mission
  if (m.astre) sim.astreId = m.astre;
  if (m.masse != null) sim.masse = m.masse;
  syncSim();

  let corps = '';
  if (m.type === 'num') {
    corps = `<input class="lab-numin" id="lab-in" type="text" inputmode="decimal" placeholder="Poids…"> <span style="color:#9fb0cc">${m.unite || ''}</span>`;
  } else if (m.type === 'choix' || m.type === 'course') {
    corps = '<div class="lab-choix" id="lab-in">' + m.choix.map((c, i) => `<button data-i="${i}">${c}</button>`).join('') + '</div>';
  } else if (m.type === 'planete') {
    corps = '<p style="color:#9fb0cc;font-size:.84rem;margin:0">👉 Choisis l’astre dans la barre au-dessus, puis valide.</p>';
  } else if (m.type === 'reglage') {
    corps = '<p style="color:#9fb0cc;font-size:.84rem;margin:0">👉 Bouge le curseur de masse et choisis un astre, puis valide.</p>';
  }

  zone.innerHTML =
    `<div class="tag">Mission ${missionCourante + 1} / ${MISSIONS.length} · +${m.xp} XP</div>` +
    `<h4>${m.titre}</h4>` +
    `<p class="q">${m.q}</p>` + corps +
    '<div class="lab-fb" id="lab-fb"></div>' +
    '<div class="lab-next"><button class="lab-btn gold" id="lab-valider">Valider</button></div>';

  let choixSel = null;
  if (m.type === 'choix' || m.type === 'course') {
    zone.querySelectorAll('#lab-in button').forEach((b) => b.addEventListener('click', () => {
      zone.querySelectorAll('#lab-in button').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel'); choixSel = +b.dataset.i;
    }));
  }

  $('#lab-valider', modale).addEventListener('click', () => valider(m, choixSel));
}

function valider(m, choixSel) {
  let bon = false, extra = '';
  if (m.type === 'num') {
    const v = parseFloat(String($('#lab-in', modale).value).replace(',', '.'));
    bon = isFinite(v) && m.ok(v);
  } else if (m.type === 'choix') {
    bon = choixSel === m.bon;
  } else if (m.type === 'planete') {
    bon = m.ok(parAstre(sim.astreId));
    extra = ` Tu as choisi ${parAstre(sim.astreId).nom} (g = ${parAstre(sim.astreId).g}).`;
  } else if (m.type === 'reglage') {
    const p = poids();
    bon = Math.abs(p - m.cible) <= m.tol;
    extra = ` Ton réglage : ${sim.masse} kg sur ${parAstre(sim.astreId).nom} → P ≈ ${p.toFixed(0)} N.`;
  } else if (m.type === 'course') {
    bon = choixSel === m.bon;
    // petite mise en scène : on lâche sur Terre
    sim.astreId = 'terre'; syncSim(); sim.fall = { y: 0, v: 0 };
  }

  const fb = $('#lab-fb', modale);
  fb.className = 'lab-fb show ' + (bon ? 'good' : 'bad');
  fb.innerHTML = (bon ? '✅ Bravo !' : '❌ Pas tout à fait.') + extra +
    `<span class="sol">💡 ${m.sol}</span>`;

  const btn = $('#lab-valider', modale);
  if (bon) {
    const d = charger();
    if (!d.missions[m.id]) {
      d.missions[m.id] = 1; d.xp += m.xp;
      // badges
      if (!d.badges.includes('🛰️ Décollage')) d.badges.push('🛰️ Décollage');
      const toutFait = MISSIONS.every((x) => d.missions[x.id]);
      if (toutFait && !d.badges.includes(BADGE_FINAL.txt)) d.badges.push(BADGE_FINAL.txt);
      sauver(d); majBandeauXP();
    }
    btn.textContent = missionCourante + 1 >= MISSIONS.length ? 'Voir le bilan →' : 'Mission suivante →';
    btn.replaceWith(btn.cloneNode(true)); // retire l'ancien listener
    $('#lab-valider', modale).addEventListener('click', () => { missionCourante++; rendreMission(); });
  } else {
    btn.textContent = 'Réessayer';
  }
}

/* ------------------------------ Carte accueil ----------------------------- */
function injecterCarte() {
  const accueil = $('#accueil'); if (!accueil || $('#lab-card')) return;
  const d = charger();
  const faites = MISSIONS.filter((m) => d.missions[m.id]).length;
  const prog = faites ? `<span class="lab-mini">⭐ ${faites}/${MISSIONS.length} · niv. ${niveau(d.xp)}</span>` : '';
  const card = document.createElement('div');
  card.className = 'lab-card'; card.id = 'lab-card';
  card.innerHTML =
    '<h3>🚀 Le Labo — Odyssée gravité</h3>' +
    '<p>Fais voyager un astronaute de la Terre au Soleil, joue avec la masse et découvre pourquoi le poids change… mais pas la masse. Missions, XP et badges à la clé.</p>' +
    `<button class="lab-cta" id="lab-open">🎮 Jouer${faites ? ' — continuer' : ''}</button>${prog}`;
  const ancre = accueil.querySelector('#rev-card') || accueil.querySelector('p.note');
  if (ancre) accueil.insertBefore(card, ancre); else accueil.appendChild(card);
  $('#lab-open').addEventListener('click', ouvrir);
}

function init() {
  injecterStyles();
  injecterCarte();
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermer(); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
