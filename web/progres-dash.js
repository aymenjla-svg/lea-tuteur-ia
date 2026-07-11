// Léa — vue « Progression dans le temps » pour le tableau de bord.
// 100 % ADDITIF : lit l'historique (lea.histo.v1) posé par progres.js et injecte
// une section dans le dashboard. Chargé par dashboard.html (une ligne).

import { MODULES } from './modules.js';

const CLE = 'lea.histo.v1';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lire = () => { try { const a = JSON.parse(localStorage.getItem(CLE) ?? '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };

function injecterStyles() {
  if ($('#pg-style')) return;
  const st = document.createElement('style'); st.id = 'pg-style';
  st.textContent = `
  .pg-vide{color:var(--txt2,#aab);font-size:.9rem}
  .pg-now{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin:2px 0 12px}
  .pg-now .g{font-family:var(--round,sans-serif);font-size:2.2rem;font-weight:700;color:var(--accent,#e0a83e)}
  .pg-now .d{font-weight:700}.pg-now .up{color:#61d38a}.pg-now .flat{color:var(--txt2,#aab)}
  .pg-spark{width:100%;height:64px;display:block;margin:2px 0 14px}
  .pg-row{display:flex;align-items:center;gap:10px;font-size:.9rem;color:var(--txt,#e7edf7);padding:5px 0;border-top:1px solid var(--border,#ffffff14)}
  .pg-row .nm{flex:1}
  .pg-row .av{color:var(--txt2,#9fb0cc)}
  .pg-row .mn{font-weight:700}
  .pg-row .dl{font-weight:700;color:#61d38a;min-width:52px;text-align:right}
  .pg-row .dl.zero{color:var(--txt2,#9fb0cc)}
  `;
  document.head.appendChild(st);
}

function sparkline(vals) {
  if (vals.length < 2) return '';
  const W = 300, H = 60, pad = 4;
  const max = 100, min = 0;
  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (W - 2 * pad);
    const y = H - pad - ((v - min) / (max - min || 1)) * (H - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `<svg class="pg-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">` +
    `<polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent,#e0a83e)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${pts[pts.length - 1].split(',')[0]}" cy="${pts[pts.length - 1].split(',')[1]}" r="3.5" fill="var(--accent,#e0a83e)"/>` +
    `</svg>`;
}

function rendre(section) {
  const histo = lire();
  if (histo.length < 2) {
    section.innerHTML = '<h2>Progression dans le temps</h2>' +
      '<p class="pg-vide">On commence à suivre tes progrès 📈 Reviens après quelques jours d’activité pour voir ton évolution « avant → maintenant ».</p>';
    return;
  }
  const prem = histo[0], dern = histo[histo.length - 1];
  const dG = dern.global - prem.global;
  const rows = MODULES.filter((m) => !m.verrouille).map((m) => {
    const av = prem.mods?.[m.id] ?? 0, mn = dern.mods?.[m.id] ?? 0, d = mn - av;
    return { m, av, mn, d };
  }).filter((r) => r.mn > 0 || r.av > 0).sort((a, b) => b.d - a.d);

  section.innerHTML =
    '<h2>Progression dans le temps</h2>' +
    '<div class="pg-now"><span class="g">' + dern.global + ' %</span>' +
      `<span class="d ${dG > 0 ? 'up' : 'flat'}">${dG > 0 ? '▲ +' + dG + ' pts' : '— stable'}</span>` +
      `<span class="pg-vide">depuis le ${esc(prem.date)}</span></div>` +
    sparkline(histo.map((h) => h.global)) +
    rows.map((r) =>
      `<div class="pg-row"><span class="nm">${r.m.icone} ${esc(r.m.titre)}</span>` +
      `<span class="av">${r.av}%</span><span>→</span><span class="mn">${r.mn}%</span>` +
      `<span class="dl ${r.d > 0 ? '' : 'zero'}">${r.d > 0 ? '+' + r.d : '='}</span></div>`).join('');
}

function injecter() {
  const app = $('.app'); if (!app || $('#pg-section')) return;
  injecterStyles();
  const section = document.createElement('section');
  section.className = 'bloc'; section.id = 'pg-section';
  rendre(section);
  // insère juste après les cartes de stats si présentes, sinon en tête des blocs
  const cartes = $('#cartes');
  if (cartes && cartes.parentElement === app) cartes.after(section);
  else { const b = app.querySelector('.bloc'); if (b) app.insertBefore(section, b); else app.appendChild(section); }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injecter);
else injecter();
