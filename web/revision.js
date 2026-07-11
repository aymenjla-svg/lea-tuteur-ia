// Léa — RÉVISION : « Contrôle blanc » + « Fiche de révision » imprimable.
//
// 100 % ADDITIF et autonome : ce module ne modifie AUCUN fichier existant.
// Il s'auto-initialise (injecte son bouton d'entrée dans l'accueil, ses styles
// et sa modale), réutilise les données déjà présentes (MODULES, EXOS) et ne
// touche pas au moteur, aux leçons ni au tuteur. Retirable en supprimant la
// seule ligne <script> ajoutée dans index.html.
//
// - Contrôle blanc : test chronométré (QCM + calcul, corrigé déterministe) sur
//   un module OU tout le programme mélangé (interleaving), puis bilan + notions
//   à revoir.
// - Fiche de révision : une page A4 (formule, points clés, erreurs fréquentes,
//   exemple résolu) imprimable, à réviser la veille d'un contrôle.

import { MODULES } from './modules.js';
import { EXOS } from './exos.js';

// --- Contenu des fiches (autonome, remplaçable quand le prof fournira le sien) ---
const FICHES = {
  mouvement: {
    formule: 'v = d ÷ t',
    unites: 'v en m/s (ou km/h) · d en mètres (m) · t en secondes (s)',
    cles: [
      'La vitesse, c’est une distance divisée par une durée.',
      'Pour passer de m/s à km/h : ×3,6 (et ÷3,6 dans l’autre sens).',
      'Toujours vérifier que les unités vont ensemble avant de calculer.',
    ],
    erreurs: [
      'Inverser : écrire t ÷ d au lieu de d ÷ t.',
      'Comparer des vitesses sans convertir (50 m/s = 180 km/h !).',
    ],
    exemple: '100 m parcourus en 20 s → v = 100 ÷ 20 = 5 m/s = 18 km/h.',
  },
  poids: {
    formule: 'P = m × g',
    unites: 'P en newtons (N) · m en kilogrammes (kg) · g en N/kg',
    cles: [
      'La masse (kg) est la quantité de matière : elle ne change JAMAIS d’astre en astre.',
      'Le poids (N) est une force : il dépend de g (≈ 10 N/kg sur Terre, ≈ 1,6 sur la Lune).',
      'Sur la Lune : même masse, mais poids plus petit.',
    ],
    erreurs: [
      'Confondre masse (kg) et poids (N).',
      'Croire que la masse diminue sur la Lune (c’est le poids).',
    ],
    exemple: 'Masse 3 kg sur Terre → P = 3 × 10 = 30 N.',
  },
  electricite: {
    formule: 'U = R × I',
    unites: 'U en volts (V) · R en ohms (Ω) · I en ampères (A)',
    cles: [
      'La loi d’Ohm relie tension, résistance et intensité.',
      'À tension fixe : si R augmente, I diminue (plus de résistance freine le courant).',
      'On peut aussi écrire I = U ÷ R et R = U ÷ I.',
    ],
    erreurs: [
      'Additionner au lieu de multiplier (U = R + I ✗).',
      'Mélanger les unités : V, Ω et A ne se confondent pas.',
    ],
    exemple: 'R = 5 Ω et I = 3 A → U = 5 × 3 = 15 V.',
  },
  matiere: {
    formule: 'ρ = m ÷ V',
    unites: 'ρ en g/cm³ (ou kg/m³) · m en grammes · V en cm³',
    cles: [
      'La masse volumique compare masse et volume.',
      'Si ρ < ρ(eau) = 1 g/cm³ → l’objet flotte ; sinon il coule.',
      'Lors d’un changement d’état, la masse se conserve (elle ne change pas).',
    ],
    erreurs: [
      'Inverser : V ÷ m au lieu de m ÷ V.',
      'Croire que l’eau qui gèle change de masse.',
    ],
    exemple: 'm = 300 g pour V = 100 cm³ → ρ = 300 ÷ 100 = 3 g/cm³.',
  },
  energie: {
    formule: 'P = U × I   et   E = P × t',
    unites: 'P en watts (W) · E en Wh (ou J) · t en heures',
    cles: [
      'La puissance (W) dit « combien ça consomme à chaque instant ».',
      'L’énergie (Wh) = puissance × durée.',
      'Plus la puissance est grande, plus l’appareil consomme.',
    ],
    erreurs: [
      'Confondre puissance (W) et énergie (Wh).',
      'Additionner U et I au lieu de les multiplier.',
    ],
    exemple: '230 V × 0,5 A → P = 115 W. Une lampe 60 W pendant 2 h → E = 120 Wh.',
  },
  signaux: {
    formule: 'v = d ÷ t',
    unites: 'lumière ≈ 300 000 km/s · son ≈ 340 m/s (dans l’air)',
    cles: [
      'La lumière va BEAUCOUP plus vite que le son.',
      'Une « année-lumière » est une DISTANCE (pas une durée).',
      'Même relation que la vitesse : v = distance ÷ durée.',
    ],
    erreurs: [
      'Penser qu’une année-lumière est un temps.',
      'Inverser d et t dans v = d ÷ t.',
    ],
    exemple: 'Orage : on voit l’éclair, puis on entend le tonnerre → la lumière arrive avant le son.',
  },
};

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const modActifs = () => MODULES.filter((m) => !m.verrouille && EXOS[m.id]);

/* --------------------------------- Styles --------------------------------- */
function injecterStyles() {
  if ($('#rev-style')) return;
  const st = document.createElement('style');
  st.id = 'rev-style';
  st.textContent = `
  .rev-card{margin:14px 0 6px;background:var(--panel,#ffffff14);border:1.5px solid var(--border,#ffffff26);border-radius:var(--rad,18px);padding:14px 16px;backdrop-filter:blur(8px)}
  .rev-card h3{font-family:var(--round,sans-serif);margin:0 0 4px;color:#fff;font-size:1.02rem}
  .rev-card p{margin:0 0 10px;color:var(--txt2,#cdd6e6);font-size:.9rem}
  .rev-actions{display:flex;gap:8px;flex-wrap:wrap}
  .rev-btn{font-family:var(--round,sans-serif);font-weight:700;font-size:.92rem;padding:10px 15px;border-radius:999px;border:1.5px solid var(--border,#ffffff30);background:var(--panel-2,#ffffff1f);color:#fff;cursor:pointer}
  .rev-btn.primary{background:var(--accent,#e0a83e);border-color:transparent;color:#20140a}
  .rev-btn:hover{filter:brightness(1.08)}
  .rev-modale{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,12,24,.6);backdrop-filter:blur(4px)}
  .rev-modale[hidden]{display:none}
  .rev-carte{width:min(680px,96vw);max-height:92vh;overflow:auto;background:#141b2e;border:1.5px solid #ffffff26;border-radius:20px;padding:20px}
  .rev-carte h2{font-family:var(--round,sans-serif);color:#fff;margin:0 0 12px;font-size:1.25rem}
  .rev-close{position:absolute;top:14px;right:16px;background:none;border:0;color:#cbd5e8;font-size:1.5rem;cursor:pointer;line-height:1}
  .rev-pick{display:flex;flex-direction:column;gap:8px}
  .rev-pick button{text-align:left;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;border:1.5px solid #ffffff22;background:#ffffff12;color:#fff;font-family:var(--round,sans-serif);font-weight:600;cursor:pointer}
  .rev-pick button:hover{background:#ffffff1e}
  .rev-pick .rev-emo{font-size:1.2rem}
  .rev-q{background:#ffffff0e;border:1.5px solid #ffffff1c;border-radius:14px;padding:12px 14px;margin:0 0 10px}
  .rev-q .rev-num{color:#9fb0cc;font-size:.8rem;font-weight:700}
  .rev-q .rev-en{color:#fff;margin:2px 0 10px;line-height:1.4}
  .rev-opt{display:block;width:100%;text-align:left;padding:9px 12px;border-radius:10px;border:1.5px solid #ffffff22;background:#ffffff10;color:#eaf0fb;margin:0 0 6px;cursor:pointer;font-size:.92rem}
  .rev-opt.sel{border-color:var(--accent,#e0a83e);background:#e0a83e26}
  .rev-num-in{width:130px;padding:9px 12px;border-radius:10px;border:1.5px solid #ffffff2a;background:#0e1524;color:#fff;font-size:1rem}
  .rev-timer{float:right;font-family:var(--round,sans-serif);font-weight:700;color:#ffd98a}
  .rev-res .ok{color:#61d38a}.rev-res .ko{color:#ff8f8f}
  .rev-bilan{text-align:center;padding:6px 0 4px}
  .rev-score{font-family:var(--round,sans-serif);font-size:2.4rem;font-weight:700;color:var(--accent,#e0a83e)}
  .rev-corr{font-size:.85rem;margin-top:6px;color:#cdd6e6}
  .rev-corr b{color:#ffd98a}
  /* Fiche */
  .fiche{background:#fbf7ee;color:#2a2118;border-radius:14px;padding:18px 20px}
  .fiche h3{font-family:var(--round,sans-serif);margin:0 0 2px;color:#8a4e2a;font-size:1.3rem}
  .fiche .f-form{display:inline-block;background:#fff;border:2px solid #e0a83e;border-radius:10px;padding:6px 14px;font-size:1.2rem;font-weight:700;margin:8px 0}
  .fiche .f-unites{font-size:.85rem;color:#6b5a45;margin:0 0 12px}
  .fiche h4{margin:12px 0 4px;font-size:.98rem;color:#3a2f22}
  .fiche ul{margin:0 0 4px;padding-left:20px}.fiche li{margin:3px 0;line-height:1.4}
  .fiche .f-err li{color:#a3402c}
  .fiche .f-ex{background:#fff;border-left:4px solid #3fae8f;padding:8px 12px;border-radius:0 8px 8px 0;margin-top:6px}
  @media print{
    body>*{display:none !important}
    .rev-modale{position:static !important;background:none !important;display:block !important;padding:0 !important}
    .rev-modale[hidden]{display:none !important}
    .rev-carte{width:auto !important;max-height:none !important;border:0 !important;background:#fff !important;padding:0 !important}
    .rev-close,.rev-print,.rev-carte h2{display:none !important}
    .fiche{border:0 !important}
  }`;
  document.head.appendChild(st);
}

/* ------------------------------- Modale shell ----------------------------- */
let modale;
function assurerModale() {
  if (modale) return modale;
  modale = document.createElement('div');
  modale.className = 'rev-modale';
  modale.hidden = true;
  modale.innerHTML = '<div class="rev-carte" role="dialog" aria-modal="true"><button class="rev-close" aria-label="Fermer">×</button><div class="rev-body"></div></div>';
  modale.addEventListener('click', (e) => { if (e.target === modale || e.target.classList.contains('rev-close')) fermer(); });
  document.body.appendChild(modale);
  return modale;
}
function ouvrir(html) { assurerModale(); $('.rev-body', modale).innerHTML = html; modale.hidden = false; }
function fermer() { if (modale) modale.hidden = true; }

/* -------------------------------- Menu / choix ---------------------------- */
function menuRevision() {
  const items = modActifs().map((m) =>
    `<button data-mod="${m.id}"><span>${m.icone} ${esc(m.titre)}</span><span class="rev-emo">›</span></button>`).join('');
  ouvrir(
    '<h2>🗂️ Fiche de révision</h2>' +
    '<p style="color:#9fb0cc;margin:-6px 0 12px">Choisis une notion à réviser (imprimable pour la veille du contrôle).</p>' +
    `<div class="rev-pick">${items}</div>`);
  modale.querySelectorAll('[data-mod]').forEach((b) => b.addEventListener('click', () => afficherFiche(b.dataset.mod)));
}
function menuControle() {
  const items = modActifs().map((m) =>
    `<button data-mod="${m.id}"><span>${m.icone} ${esc(m.titre)}</span><span class="rev-emo">›</span></button>`).join('');
  ouvrir(
    '<h2>📝 Contrôle blanc</h2>' +
    '<p style="color:#9fb0cc;margin:-6px 0 12px">Comme un vrai contrôle : tu réponds à tout, puis tu as ton bilan.</p>' +
    '<div class="rev-pick">' +
      '<button data-mod="__mix"><span>🎲 Tout le programme (mélangé)</span><span class="rev-emo">›</span></button>' +
      items +
    '</div>');
  modale.querySelectorAll('[data-mod]').forEach((b) => b.addEventListener('click', () => lancerControle(b.dataset.mod)));
}

/* ---------------------------------- Fiche --------------------------------- */
function afficherFiche(modId) {
  const m = MODULES.find((x) => x.id === modId); const f = FICHES[modId];
  if (!m || !f) return;
  ouvrir(
    '<h2>Fiche de révision</h2>' +
    '<div class="fiche">' +
      `<h3>${m.icone} ${esc(m.titre)}</h3>` +
      `<div class="f-form">${esc(f.formule)}</div>` +
      `<div class="f-unites">${esc(f.unites)}</div>` +
      '<h4>À retenir</h4><ul>' + f.cles.map((c) => `<li>${esc(c)}</li>`).join('') + '</ul>' +
      '<h4>Pièges fréquents</h4><ul class="f-err">' + f.erreurs.map((e) => `<li>${esc(e)}</li>`).join('') + '</ul>' +
      '<h4>Exemple résolu</h4><div class="f-ex">' + esc(f.exemple) + '</div>' +
    '</div>' +
    '<div class="rev-actions" style="margin-top:14px">' +
      '<button class="rev-btn primary rev-print">🖨️ Imprimer</button>' +
      '<button class="rev-btn rev-back">← Autres notions</button>' +
    '</div>');
  $('.rev-print', modale).addEventListener('click', () => window.print());
  $('.rev-back', modale).addEventListener('click', menuRevision);
}

/* ------------------------------ Contrôle blanc ---------------------------- */
function piocher(modId) {
  // sélectionne QCM + calculs (corrigés déterministes), pas les "ouvert".
  if (modId === '__mix') {
    const tout = [];
    for (const m of modActifs()) for (const e of (EXOS[m.id] || [])) if (e.t !== 'ouvert') tout.push({ ...e, mod: m.id });
    // mélange (Fisher–Yates) puis 8 questions
    for (let i = tout.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [tout[i], tout[j]] = [tout[j], tout[i]]; }
    return tout.slice(0, 8);
  }
  return (EXOS[modId] || []).filter((e) => e.t !== 'ouvert').map((e) => ({ ...e, mod: modId }));
}

function lancerControle(modId) {
  const qs = piocher(modId);
  if (!qs.length) return;
  const titre = modId === '__mix' ? '🎲 Tout le programme' : (MODULES.find((x) => x.id === modId)?.titre ?? 'Contrôle');
  const corps = qs.map((q, i) => {
    let champ = '';
    if (q.t === 'qcm') {
      champ = q.options.map((o, k) =>
        `<button type="button" class="rev-opt" data-q="${i}" data-k="${k}">${esc(o.txt)}</button>`).join('');
    } else { // num
      champ = `<input class="rev-num-in" data-q="${i}" type="text" inputmode="decimal" placeholder="Nombre…"> <span style="color:#9fb0cc">${esc(q.unite || '')}</span>`;
    }
    return `<div class="rev-q"><div class="rev-num">Question ${i + 1}</div><div class="rev-en">${esc(q.enonce)}</div>${champ}</div>`;
  }).join('');
  ouvrir(
    `<h2>📝 ${esc(titre)} <span class="rev-timer" id="revTimer">0:00</span></h2>` +
    corps +
    '<div class="rev-actions" style="margin-top:6px"><button class="rev-btn primary rev-fin">Terminer le contrôle</button></div>');

  const rep = {};
  modale.querySelectorAll('.rev-opt').forEach((b) => b.addEventListener('click', () => {
    const qi = b.dataset.q;
    modale.querySelectorAll(`.rev-opt[data-q="${qi}"]`).forEach((x) => x.classList.remove('sel'));
    b.classList.add('sel'); rep[qi] = Number(b.dataset.k);
  }));
  modale.querySelectorAll('.rev-num-in').forEach((inp) => inp.addEventListener('input', () => { rep[inp.dataset.q] = inp.value; }));

  const t0 = Date.now();
  const timerEl = $('#revTimer', modale);
  const iv = setInterval(() => {
    if (!timerEl.isConnected) return clearInterval(iv);
    const s = Math.floor((Date.now() - t0) / 1000);
    timerEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }, 1000);

  $('.rev-fin', modale).addEventListener('click', () => { clearInterval(iv); corriger(qs, rep, titre, Math.floor((Date.now() - t0) / 1000)); });
}

function bonNum(q, val) {
  const x = parseFloat(String(val).replace(',', '.').replace(/\s/g, ''));
  if (!isFinite(x)) return false;
  const tol = q.tol ?? Math.max(0.05, Math.abs(q.valeur) * 0.001);
  return Math.abs(x - q.valeur) <= tol;
}

function corriger(qs, rep, titre, secondes) {
  let bons = 0;
  const parMod = {};
  const detail = qs.map((q, i) => {
    let ok, bonne;
    if (q.t === 'qcm') {
      const ki = q.options.findIndex((o) => o.ok);
      ok = rep[i] === ki; bonne = q.options[ki]?.txt ?? '';
    } else {
      ok = rep[i] != null && bonNum(q, rep[i]); bonne = `${q.valeur} ${q.unite || ''}`.trim();
    }
    if (ok) bons++;
    (parMod[q.mod] ??= { ok: 0, n: 0 }); parMod[q.mod].n++; if (ok) parMod[q.mod].ok++;
    return `<div class="rev-q rev-res"><div class="rev-num ${ok ? 'ok' : 'ko'}">Q${i + 1} — ${ok ? '✔ juste' : '✗ à revoir'}</div>` +
      `<div class="rev-en">${esc(q.enonce)}</div>` +
      (ok ? '' : `<div class="rev-corr">Bonne réponse : <b>${esc(bonne)}</b></div>`) + '</div>';
  }).join('');

  const pct = Math.round((bons / qs.length) * 100);
  const faibles = Object.entries(parMod).filter(([, v]) => v.ok / v.n < 0.6).map(([id]) => id);
  const conseils = faibles.length
    ? '<p style="color:#cdd6e6">À revoir en priorité : ' + faibles.map((id) =>
        `<button class="rev-btn" style="padding:4px 10px;margin:3px" data-fiche="${id}">${MODULES.find((m) => m.id === id)?.icone || ''} ${esc(MODULES.find((m) => m.id === id)?.titre || id)}</button>`).join(' ') + '</p>'
    : '<p style="color:#61d38a">Bravo, tout est solide 💪</p>';

  ouvrir(
    `<h2>Bilan — ${esc(titre)}</h2>` +
    `<div class="rev-bilan"><div class="rev-score">${pct}%</div>` +
    `<div style="color:#9fb0cc">${bons}/${qs.length} justes · ${Math.floor(secondes / 60)} min ${secondes % 60}s</div></div>` +
    conseils +
    '<div style="margin:12px 0 6px;font-weight:700;color:#fff;font-family:var(--round,sans-serif)">Corrigé</div>' +
    detail +
    '<div class="rev-actions" style="margin-top:8px"><button class="rev-btn primary rev-rejouer">↻ Refaire</button><button class="rev-btn rev-fermer2">Fermer</button></div>');

  modale.querySelectorAll('[data-fiche]').forEach((b) => b.addEventListener('click', () => afficherFiche(b.dataset.fiche)));
  $('.rev-rejouer', modale).addEventListener('click', menuControle);
  $('.rev-fermer2', modale).addEventListener('click', fermer);
}

/* --------------------------- Point d'entrée (accueil) --------------------- */
function injecterCarte() {
  const accueil = $('#accueil'); if (!accueil || $('#rev-card')) return;
  const card = document.createElement('div');
  card.className = 'rev-card'; card.id = 'rev-card';
  card.innerHTML =
    '<h3>🎯 Réviser avant un contrôle</h3>' +
    '<p>Entraîne-toi comme le jour J, ou imprime une fiche de révision.</p>' +
    '<div class="rev-actions">' +
      '<button class="rev-btn primary" id="rev-open-ctrl">📝 Contrôle blanc</button>' +
      '<button class="rev-btn" id="rev-open-fiche">🗂️ Fiche de révision</button>' +
    '</div>';
  const ancre = accueil.querySelector('p.note'); // avant le lien "tableau de bord"
  if (ancre) accueil.insertBefore(card, ancre); else accueil.appendChild(card);
  $('#rev-open-ctrl').addEventListener('click', menuControle);
  $('#rev-open-fiche').addEventListener('click', menuRevision);
}

function init() {
  injecterStyles();
  injecterCarte();
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermer(); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
