// Léa — APPRENDS EN ENSEIGNANT : l'élève EXPLIQUE une notion à Léa, qui joue
// l'élève qui n'a pas compris (contexte.mode='enseigner' → Edge). Effet très
// efficace : pour expliquer, il faut avoir compris. 100 % ADDITIF, hors-ligne OK.

import { ouvrirChat, carteLea } from './chat-lea.js';

const NOTIONS = [
  { mod: 'mouvement', label: '🏃 La vitesse', notion: 'la vitesse (v = d ÷ t)' },
  { mod: 'poids', label: '⚖️ Masse et poids', notion: 'la différence entre la masse et le poids' },
  { mod: 'electricite', label: '⚡ La loi d’Ohm', notion: 'la loi d’Ohm (U = R × I)' },
  { mod: 'matiere', label: '🌊 Flotte ou coule', notion: 'la masse volumique et pourquoi un objet flotte ou coule' },
  { mod: 'energie', label: '🔥 Puissance & énergie', notion: 'la puissance et l’énergie (P = U × I, E = P × t)' },
  { mod: 'signaux', label: '📡 Lumière et son', notion: 'la différence entre la lumière et le son' },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function lancer(n) {
  ouvrirChat({
    titre: '🎓 Tu expliques à Léa',
    couleur: '#8b6cf6',
    fig: '◦ Léa joue l’élève — à toi de lui expliquer',
    contexte: { mode: 'enseigner', notion_a_enseigner: n.notion, moduleId: n.mod },
    intro: `Oh chouette, tu vas m’expliquer ${n.notion} ? Je n’ai pas tout compris… vas-y, explique-moi avec tes mots, comme si j’étais l’élève 🙂`,
    placeholder: 'Explique avec tes propres mots…',
  });
}

function choisir() {
  const m = document.createElement('div'); m.className = 'cl-modale';
  m.innerHTML = `
  <div class="cl-wrap" role="dialog" aria-modal="true" style="--c:#8b6cf6">
    <header class="hud"><button class="hud-retour cl-x" aria-label="Fermer">←</button>
      <div class="hud-centre"><div class="hud-titre">🎓 Explique à Léa</div><div class="hud-barre-fond"><div class="hud-barre" style="width:100%;background:#8b6cf6;box-shadow:0 0 10px #8b6cf6"></div></div></div></header>
    <div class="fig-label cl-fig">◦ Choisis la notion que tu veux expliquer</div>
    <div id="ens-list" style="display:flex;flex-direction:column;gap:8px;padding:6px 2px 4px"></div>
  </div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); document.removeEventListener('keydown', onk); };
  const onk = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onk);
  m.addEventListener('click', (e) => { if (e.target === m || e.target.classList.contains('cl-x')) close(); });
  const list = m.querySelector('#ens-list');
  list.innerHTML = NOTIONS.map((n, i) =>
    `<button type="button" data-i="${i}" style="text-align:left;padding:12px 14px;border-radius:13px;border:1.5px solid var(--border,#ffffff26);background:var(--panel,#ffffff10);color:#fff;font-family:var(--round,sans-serif);font-weight:600;font-size:.95rem;cursor:pointer">${esc(n.label)}</button>`).join('');
  list.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => { close(); lancer(NOTIONS[+b.dataset.i]); }));
}

function init() {
  carteLea({
    id: 'enseigner-card', couleur: '#8b6cf6', icone: '🎓',
    titre: 'Explique à Léa',
    sous: 'Deviens le prof ! Explique une notion à Léa qui n’a pas compris — le meilleur moyen de vérifier que TU as compris.',
    cta: '🎤 Je lui explique', ouvrir: choisir,
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
