// Léa — CENTRES D'INTÉRÊT : l'élève choisit ce qu'il aime ; Léa s'en sert pour
// personnaliser ses exemples (« la vitesse de ton perso dans le jeu… »).
//
// 100 % ADDITIF : injecte une carte de sélection dans l'accueil + stocke les
// choix en localStorage (`lea.interets.v1`). La personnalisation côté tuteur se
// fait en passant ces centres d'intérêt dans le contexte (voir tuteur-llm.js,
// hook minimal) — le prompt serveur peut ensuite s'en servir (cf. docs).
// Ne modifie aucun contenu existant.

const CLE = 'lea.interets.v1';
const $ = (s, r = document) => r.querySelector(s);

export const INTERETS = [
  { id: 'foot', label: 'Foot', emo: '⚽' },
  { id: 'jeuxvideo', label: 'Jeux vidéo', emo: '🎮' },
  { id: 'basket', label: 'Basket', emo: '🏀' },
  { id: 'musique', label: 'Musique', emo: '🎧' },
  { id: 'danse', label: 'Danse', emo: '💃' },
  { id: 'espace', label: 'Espace', emo: '🚀' },
  { id: 'animaux', label: 'Animaux', emo: '🐾' },
  { id: 'nature', label: 'Nature', emo: '🌿' },
  { id: 'cuisine', label: 'Cuisine', emo: '🍳' },
  { id: 'velo', label: 'Vélo / skate', emo: '🚲' },
  { id: 'voitures', label: 'Voitures', emo: '🏎️' },
  { id: 'ciné', label: 'Ciné / séries', emo: '🎬' },
];

export function lireInterets() { try { return JSON.parse(localStorage.getItem(CLE) ?? '[]') || []; } catch { return []; } }
function ecrire(a) { try { localStorage.setItem(CLE, JSON.stringify(a)); } catch { /* stockage indispo */ } }
/** Libellés lisibles (pour injecter dans le contexte du tuteur). */
export function interetsLabels() { const s = new Set(lireInterets()); return INTERETS.filter((i) => s.has(i.id)).map((i) => i.label); }

function injecterStyles() {
  if ($('#int-style')) return;
  const st = document.createElement('style'); st.id = 'int-style';
  st.textContent = `
  .int-card{margin:14px 0 0;background:var(--panel,#ffffff12);border:1.5px solid var(--border,#ffffff26);border-radius:var(--rad,18px);padding:12px 16px}
  .int-card h3{font-family:var(--round,sans-serif);margin:0 0 2px;color:#fff;font-size:1rem}
  .int-card p{margin:0 0 10px;color:var(--txt2,#cdd6e6);font-size:.85rem}
  .int-chips{display:flex;flex-wrap:wrap;gap:8px}
  .int-chip{font-family:var(--round,sans-serif);font-weight:600;font-size:.88rem;padding:7px 12px;border-radius:999px;border:1.5px solid var(--border,#ffffff2a);background:var(--panel-2,#ffffff12);color:#eaf0fb;cursor:pointer;transition:transform .1s}
  .int-chip:hover{transform:translateY(-1px)}
  .int-chip.on{border-color:var(--accent,#e0a83e);background:color-mix(in srgb,var(--accent,#e0a83e) 26%,transparent);color:#fff}
  `;
  document.head.appendChild(st);
}

function injecterCarte() {
  const accueil = $('#accueil'); if (!accueil || $('#int-card')) return;
  const sel = new Set(lireInterets());
  const card = document.createElement('div'); card.className = 'int-card'; card.id = 'int-card';
  card.innerHTML =
    '<h3>🎨 Ce que tu aimes</h3>' +
    '<p>Léa s’en sert pour t’expliquer avec des exemples qui te parlent.</p>' +
    '<div class="int-chips">' +
      INTERETS.map((i) => `<button type="button" class="int-chip${sel.has(i.id) ? ' on' : ''}" data-id="${i.id}">${i.emo} ${i.label}</button>`).join('') +
    '</div>';
  const ancre = $('#defi-card', accueil) || $('#rev-card', accueil) || accueil.querySelector('p.note');
  if (ancre) accueil.insertBefore(card, ancre); else accueil.appendChild(card);
  card.querySelectorAll('.int-chip').forEach((b) => b.addEventListener('click', () => {
    const cur = new Set(lireInterets());
    if (cur.has(b.dataset.id)) cur.delete(b.dataset.id); else cur.add(b.dataset.id);
    ecrire([...cur]); b.classList.toggle('on');
  }));
}

function init() { injecterStyles(); injecterCarte(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
