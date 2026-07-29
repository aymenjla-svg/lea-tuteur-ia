// Léa — DÉFI DU JOUR : mini-quiz quotidien (5 questions mélangées) pour créer
// une habitude, avec une série (streak) de jours.
//
// 100 % ADDITIF et autonome (comme revision.js) : injecte sa carte, ses styles
// et sa modale ; réutilise EXOS/MODULES ; ne modifie aucun fichier existant.
// Branché par une seule ligne <script> dans index.html.
//
// - Les 5 questions du jour sont TIRÉES de façon déterministe selon la date
//   (même défi toute la journée, nouveau chaque jour), en mélangeant les
//   notions (interleaving = meilleur pour la mémoire).
// - Série : +1 par jour consécutif fait ; repart à 1 après un jour manqué.

import { MODULES } from './modules.js';
import { EXOS } from './exos.js';

const CLE = 'lea.defi.v1';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const jourStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function lire() { try { return JSON.parse(localStorage.getItem(CLE) ?? '{}') || {}; } catch { return {}; } }
function ecrire(o) { try { localStorage.setItem(CLE, JSON.stringify(o)); } catch { /* stockage indispo */ } }

// PRNG déterministe (mulberry32) initialisé par la date → défi stable du jour.
function seedDepuisDate(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function questionsDuJour() {
  const pool = [];
  for (const m of MODULES) if (!m.verrouille && EXOS[m.id]) for (const e of EXOS[m.id]) if (e.t !== 'ouvert') pool.push({ ...e, mod: m.id });
  const rnd = mulberry32(seedDepuisDate(jourStr()));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 5);
}

/* --------------------------------- Styles --------------------------------- */
function injecterStyles() {
  if ($('#defi-style')) return;
  const st = document.createElement('style'); st.id = 'defi-style';
  st.textContent = `
  .defi-card{margin:14px 0 0;background:linear-gradient(120deg,#ff8a3d22,#ffd23d1a);border:1.5px solid #ffb45e55;border-radius:var(--rad,18px);padding:12px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
  .defi-flamme{font-size:1.9rem;line-height:1}
  .defi-txt{flex:1;min-width:150px}
  .defi-txt h3{font-family:var(--round,sans-serif);margin:0;color:#fff;font-size:1rem}
  .defi-txt p{margin:2px 0 0;color:var(--txt2,#e7d9c2);font-size:.85rem}
  .defi-serie{font-weight:700;color:#ffd98a}
  .defi-go{font-family:var(--round,sans-serif);font-weight:700;font-size:.92rem;padding:10px 18px;border-radius:999px;border:0;background:#ff9f43;color:#3a1f06;cursor:pointer}
  .defi-go:hover{filter:brightness(1.07)}.defi-go[disabled]{opacity:.55;cursor:default;filter:none}
  .defi-modale{position:fixed;inset:0;z-index:61;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,12,24,.6);backdrop-filter:blur(4px)}
  .defi-modale[hidden]{display:none}
  .defi-carte{width:min(560px,96vw);max-height:92vh;overflow:auto;background:#141b2e;border:1.5px solid #ffffff26;border-radius:20px;padding:20px;position:relative}
  .defi-carte h2{font-family:var(--round,sans-serif);color:#fff;margin:0 0 12px;font-size:1.2rem}
  .defi-close{position:absolute;top:12px;right:14px;background:none;border:0;color:#cbd5e8;font-size:1.5rem;cursor:pointer}
  .defi-q{background:#ffffff0e;border:1.5px solid #ffffff1c;border-radius:14px;padding:12px 14px;margin:0 0 10px}
  .defi-q .n{color:#ffb86b;font-size:.8rem;font-weight:700}
  .defi-q .en{color:#fff;margin:2px 0 10px;line-height:1.4}
  .defi-opt{display:block;width:100%;text-align:left;padding:9px 12px;border-radius:10px;border:1.5px solid #ffffff22;background:#ffffff10;color:#eaf0fb;margin:0 0 6px;cursor:pointer;font-size:.92rem}
  .defi-opt.sel{border-color:#ff9f43;background:#ff9f4326}
  .defi-in{width:130px;padding:9px 12px;border-radius:10px;border:1.5px solid #ffffff2a;background:#0e1524;color:#fff;font-size:1rem}
  .defi-go2{font-family:var(--round,sans-serif);font-weight:700;padding:10px 18px;border-radius:999px;border:0;background:#ff9f43;color:#3a1f06;cursor:pointer}
  .defi-bilan{text-align:center;padding:10px 0}
  .defi-score{font-family:var(--round,sans-serif);font-size:2.4rem;font-weight:700;color:#ff9f43}
  .defi-serie-big{font-size:1.1rem;color:#ffd98a;margin-top:4px}
  `;
  document.head.appendChild(st);
}

/* -------------------------------- Modale ---------------------------------- */
let modale;
function assurerModale() {
  if (modale) return modale;
  modale = document.createElement('div'); modale.className = 'defi-modale'; modale.hidden = true;
  modale.innerHTML = '<div class="defi-carte" role="dialog" aria-modal="true"><button class="defi-close" aria-label="Fermer">×</button><div class="defi-body"></div></div>';
  modale.addEventListener('click', (e) => { if (e.target === modale || e.target.classList.contains('defi-close')) modale.hidden = true; });
  document.body.appendChild(modale);
  return modale;
}
function ouvrir(html) { assurerModale(); $('.defi-body', modale).innerHTML = html; modale.hidden = false; }

/* --------------------------------- Quiz ----------------------------------- */
function bonNum(q, val) { const x = parseFloat(String(val).replace(',', '.').replace(/\s/g, '')); if (!isFinite(x)) return false; const tol = q.tol ?? Math.max(0.05, Math.abs(q.valeur) * 0.001); return Math.abs(x - q.valeur) <= tol; }

function lancerDefi() {
  const st = lire();
  if (st.lastDate === jourStr()) { ecranFait(st, true); return; }
  const qs = questionsDuJour();
  const corps = qs.map((q, i) => {
    const champ = q.t === 'qcm'
      ? q.options.map((o, k) => `<button type="button" class="defi-opt" data-q="${i}" data-k="${k}">${esc(o.txt)}</button>`).join('')
      : `<input class="defi-in" data-q="${i}" type="text" inputmode="decimal" placeholder="Nombre…"> <span style="color:#9fb0cc">${esc(q.unite || '')}</span>`;
    return `<div class="defi-q"><div class="n">Question ${i + 1}/5</div><div class="en">${esc(q.enonce)}</div>${champ}</div>`;
  }).join('');
  ouvrir('<h2>🔥 Défi du jour</h2>' + corps + '<div style="text-align:center"><button class="defi-go2 defi-fin">Valider mon défi</button></div>');
  const rep = {};
  modale.querySelectorAll('.defi-opt').forEach((b) => b.addEventListener('click', () => { const qi = b.dataset.q; modale.querySelectorAll(`.defi-opt[data-q="${qi}"]`).forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); rep[qi] = Number(b.dataset.k); }));
  modale.querySelectorAll('.defi-in').forEach((inp) => inp.addEventListener('input', () => { rep[inp.dataset.q] = inp.value; }));
  $('.defi-fin', modale).addEventListener('click', () => terminer(qs, rep));
}

function terminer(qs, rep) {
  let bons = 0;
  qs.forEach((q, i) => {
    if (q.t === 'qcm') { if (rep[i] === q.options.findIndex((o) => o.ok)) bons++; }
    else if (rep[i] != null && bonNum(q, rep[i])) bons++;
  });
  // maj série
  const st = lire(); const hier = jourStr(new Date(Date.now() - 864e5));
  const serie = st.lastDate === hier ? (st.serie || 0) + 1 : 1;
  const nv = { lastDate: jourStr(), serie, best: Math.max(serie, st.best || 0) };
  ecrire(nv);
  ouvrir(
    '<h2>🔥 Défi relevé !</h2>' +
    `<div class="defi-bilan"><div class="defi-score">${bons}/5</div>` +
    `<div class="defi-serie-big">🔥 Série : ${serie} jour${serie > 1 ? 's' : ''} d’affilée${nv.best > serie ? ` · record ${nv.best}` : ''}</div>` +
    '<p style="color:#9fb0cc;margin-top:10px">Reviens demain pour continuer ta série 💪</p></div>' +
    '<div style="text-align:center"><button class="defi-go2 defi-ferme">Super !</button></div>');
  $('.defi-ferme', modale).addEventListener('click', () => { modale.hidden = true; majCarte(); });
}

function ecranFait(st, viaClick) {
  const s = st.serie || 1;
  ouvrir('<h2>🔥 Défi du jour</h2><div class="defi-bilan"><div class="defi-score">✅</div>' +
    `<div class="defi-serie-big">Déjà fait aujourd’hui · série de ${s} jour${s > 1 ? 's' : ''}</div>` +
    '<p style="color:#9fb0cc;margin-top:10px">Reviens demain pour un nouveau défi !</p></div>' +
    '<div style="text-align:center"><button class="defi-go2 defi-ferme">Fermer</button></div>');
  $('.defi-ferme', modale).addEventListener('click', () => { modale.hidden = true; });
  if (viaClick) return;
}

/* ------------------------------- Carte accueil ---------------------------- */
function majCarte() {
  const card = $('#defi-card'); if (!card) return;
  const st = lire(); const fait = st.lastDate === jourStr(); const serie = st.serie || 0;
  card.querySelector('.defi-serie').textContent = serie > 0 ? `🔥 ${serie} jour${serie > 1 ? 's' : ''}` : 'Nouvelle série';
  const go = card.querySelector('.defi-go');
  go.textContent = fait ? '✅ Fait' : 'Relever le défi';
  go.disabled = fait;
  card.querySelector('.defi-txt p').textContent = fait ? 'Reviens demain pour continuer ta série.' : '5 questions mélangées, 3 minutes chrono.';
}

function injecterCarte() {
  const accueil = $('#accueil'); if (!accueil || $('#defi-card')) return;
  const card = document.createElement('div'); card.className = 'defi-card'; card.id = 'defi-card';
  card.innerHTML =
    '<span class="defi-flamme">🔥</span>' +
    '<div class="defi-txt"><h3>Défi du jour <span class="defi-serie"></span></h3><p>5 questions mélangées, 3 minutes chrono.</p></div>' +
    '<button class="defi-go" type="button">Relever le défi</button>';
  const ancre = $('#rev-card', accueil) || accueil.querySelector('p.note');
  if (ancre) accueil.insertBefore(card, ancre); else accueil.appendChild(card);
  card.querySelector('.defi-go').addEventListener('click', lancerDefi);
  majCarte();
}

function init() { injecterStyles(); injecterCarte(); document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modale) modale.hidden = true; }); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
