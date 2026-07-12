// Léa — composant de CHAT partagé (modale verre, même langage que la séance).
// Utilisé par « Aide aux devoirs » (devoirs.js) et « Explique à Léa »
// (enseigner.js). Réutilise poserQuestion() : dégrade proprement hors-ligne.
// 100 % ADDITIF.

import { poserQuestion } from './tuteur-llm.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function profilBase() {
  try { const p = JSON.parse(localStorage.getItem('lea.profil.v1') || '{}'); return { prenom: p.prenom, sexe: p.sexe, classe: p.classe }; }
  catch { return {}; }
}

let stylesInjectes = false;
function injecterStyles() {
  if (stylesInjectes || document.getElementById('cl-style')) { stylesInjectes = true; return; }
  stylesInjectes = true;
  const st = document.createElement('style'); st.id = 'cl-style';
  st.textContent = `
  .cl-modale{position:fixed;inset:0;z-index:72;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(4,10,24,.66);backdrop-filter:blur(5px)}
  .cl-modale[hidden]{display:none}
  .cl-wrap{--c:#14c8d4;width:min(540px,97vw);max-height:94vh;display:flex;flex-direction:column;padding:14px 14px 12px;box-sizing:border-box;
    background:var(--panel-2,#0b1a2fdd);border:1.5px solid var(--border,#ffffff26);border-radius:22px;backdrop-filter:blur(12px);box-shadow:0 22px 60px rgba(4,12,30,.55)}
  .cl-wrap .hud-barre{background:var(--c);box-shadow:0 0 10px var(--c)}
  .cl-fig{margin:8px 2px 6px}
  .cl-fil{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:9px;padding:8px 2px;min-height:180px}
  .cl-msg{max-width:82%;padding:9px 13px;border-radius:16px;font-size:.94rem;line-height:1.4;white-space:pre-wrap}
  .cl-msg.lea{align-self:flex-start;background:var(--panel,#ffffff14);border:1.5px solid var(--border,#ffffff26);border-bottom-left-radius:5px;color:var(--txt,#eaf0fb)}
  .cl-msg.moi{align-self:flex-end;background:color-mix(in srgb,var(--c) 24%,#0b1a2f);border:1.5px solid color-mix(in srgb,var(--c) 55%,transparent);border-bottom-right-radius:5px;color:#fff}
  .cl-msg img{max-width:150px;border-radius:10px;margin-top:6px;display:block}
  .cl-msg.pense{opacity:.7;font-style:italic}
  .cl-src{font-size:.7rem;color:var(--txt2,#9fb0cc);margin-top:2px;align-self:flex-start}
  .cl-form{display:flex;gap:8px;align-items:flex-end;margin-top:8px}
  .cl-ta{flex:1;min-height:44px;max-height:120px;resize:none;padding:11px 13px;border-radius:14px;border:1.5px solid var(--border,#ffffff2a);background:rgba(0,0,0,.22);color:#fff;font:inherit;font-size:.95rem}
  .cl-photo{flex:0 0 auto;width:44px;height:44px;border-radius:14px;border:1.5px solid var(--border,#ffffff2e);background:var(--panel,#ffffff16);color:#fff;font-size:1.2rem;cursor:pointer}
  .cl-send{flex:0 0 auto;font-family:var(--round,sans-serif);font-weight:700;padding:0 18px;height:44px;border:none;border-radius:14px;background:linear-gradient(120deg,var(--or,#ffd24a),#ffd166);color:#4a2f00;cursor:pointer;box-shadow:0 6px 18px rgba(255,194,60,.35)}
  .cl-send:disabled,.cl-photo:disabled{opacity:.5;cursor:default}
  .cl-thumb{position:relative;align-self:flex-end;margin-top:4px}
  .cl-thumb img{max-width:90px;border-radius:10px;border:1.5px solid var(--border)}
  .cl-thumb button{position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;border:none;background:#e05252;color:#fff;cursor:pointer;font-weight:700}
  /* carte d'accueil (point d'entrée d'une feature Léa) */
  .cl-card{--c:#14c8d4;margin:12px 0 6px;border-radius:var(--rad,18px);padding:14px 16px;color:#fff;display:flex;align-items:center;gap:13px;
    background:var(--panel,#ffffff14);border:1.5px solid var(--border,#ffffff26);backdrop-filter:blur(10px)}
  .cl-card .ci{flex:0 0 auto;width:46px;height:46px;border-radius:13px;display:grid;place-items:center;font-size:1.5rem;
    background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 35%,#000));box-shadow:0 5px 14px color-mix(in srgb,var(--c) 42%,transparent)}
  .cl-card .ct{flex:1;min-width:0}
  .cl-card h3{font-family:var(--round,sans-serif);margin:0;font-size:1.02rem;color:#fff}
  .cl-card p{margin:2px 0 0;color:var(--txt2,#9fb0cc);font-size:.84rem;line-height:1.3}
  .cl-card .cta{flex:0 0 auto;font-family:var(--round,sans-serif);font-weight:700;font-size:.85rem;padding:9px 15px;border-radius:999px;border:none;
    background:linear-gradient(120deg,var(--or,#ffd24a),#ffd166);color:#3a2400;cursor:pointer;white-space:nowrap}
  .cl-card .cta:hover{filter:brightness(1.06)}
  @media (max-width:460px){.cl-card{flex-wrap:wrap}.cl-card .cta{width:100%}}
  `;
  document.head.appendChild(st);
}

/** Injecte une carte-point d'entrée dans l'accueil (après la section labos). */
export function carteLea(o) {
  injecterStyles();
  const accueil = $('#accueil'); if (!accueil || $('#' + o.id)) return;
  const card = document.createElement('div');
  card.className = 'cl-card'; card.id = o.id; card.style.setProperty('--c', o.couleur || '#14c8d4');
  card.innerHTML =
    `<span class="ci">${o.icone}</span>` +
    `<div class="ct"><h3>${esc(o.titre)}</h3><p>${esc(o.sous)}</p></div>` +
    `<button class="cta" type="button">${esc(o.cta || 'Ouvrir')}</button>`;
  const ancre = accueil.querySelector('#labosGrille')?.nextElementSibling || accueil.querySelector('p.note');
  if (ancre) accueil.insertBefore(card, ancre); else accueil.appendChild(card);
  card.querySelector('.cta').addEventListener('click', o.ouvrir);
}

// Réduit une image (data URL) à ~1024 px de large, JPEG qualité 0.8.
function reduireImage(dataURL) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => {
      const max = 1024, sc = Math.min(1, max / Math.max(im.width, im.height));
      const c = document.createElement('canvas'); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      try { resolve(c.toDataURL('image/jpeg', 0.8)); } catch { resolve(dataURL); }
    };
    im.onerror = () => resolve(dataURL);
    im.src = dataURL;
  });
}

/**
 * Ouvre une modale de chat avec Léa.
 * @param {object} o { titre, couleur, fig, contexte (base), intro (1re réplique de Léa|null),
 *                      placeholder, photo (bool autoriser une photo) }
 */
export function ouvrirChat(o) {
  injecterStyles();
  const modale = document.createElement('div'); modale.className = 'cl-modale';
  modale.innerHTML = `
  <div class="cl-wrap" role="dialog" aria-modal="true" aria-label="${esc(o.titre)}" style="--c:${o.couleur || '#14c8d4'}">
    <header class="hud">
      <button class="hud-retour cl-x" aria-label="Fermer">←</button>
      <div class="hud-centre"><div class="hud-titre">${esc(o.titre)}</div><div class="hud-barre-fond"><div class="hud-barre" style="width:100%"></div></div></div>
    </header>
    <div class="fig-label cl-fig">${esc(o.fig || '◦ Discussion avec Léa')}</div>
    <div class="cl-fil" id="cl-fil"></div>
    <form class="cl-form" id="cl-form">
      ${o.photo ? '<button type="button" class="cl-photo" id="cl-photo" title="Prendre/joindre une photo">📷</button><input type="file" accept="image/*" capture="environment" id="cl-file" hidden>' : ''}
      <textarea class="cl-ta" id="cl-ta" rows="1" placeholder="${esc(o.placeholder || 'Écris ici…')}"></textarea>
      <button type="submit" class="cl-send" id="cl-send">Envoyer</button>
    </form>
  </div>`;
  document.body.appendChild(modale);
  const fil = $('#cl-fil', modale), ta = $('#cl-ta', modale), send = $('#cl-send', modale);
  const historique = [];
  let pendingImage = null;

  const fermer = () => { modale.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') fermer(); };
  document.addEventListener('keydown', onKey);
  modale.addEventListener('click', (e) => { if (e.target === modale || e.target.classList.contains('cl-x')) fermer(); });

  function bulle(role, texte, imgURL) {
    const div = document.createElement('div'); div.className = 'cl-msg ' + (role === 'moi' ? 'moi' : 'lea');
    div.innerHTML = esc(texte) + (imgURL ? `<img src="${imgURL}" alt="photo">` : '');
    fil.appendChild(div); fil.scrollTop = fil.scrollHeight; return div;
  }

  if (o.intro) bulle('lea', o.intro);

  // auto-hauteur du textarea
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; });

  // photo (optionnelle)
  if (o.photo) {
    const file = $('#cl-file', modale);
    $('#cl-photo', modale).addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const f = file.files?.[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = async () => {
        pendingImage = await reduireImage(String(rd.result));
        // aperçu retirable
        const old = $('#cl-thumb', modale); if (old) old.remove();
        const t = document.createElement('div'); t.className = 'cl-thumb'; t.id = 'cl-thumb';
        t.innerHTML = `<img src="${pendingImage}" alt="aperçu"><button type="button" aria-label="Retirer">×</button>`;
        t.querySelector('button').addEventListener('click', () => { pendingImage = null; t.remove(); });
        fil.after(t);
      };
      rd.readAsDataURL(f); file.value = '';
    });
  }

  async function envoyer(texte) {
    const img = pendingImage;
    bulle('moi', texte || (img ? '📷 (photo de mon exercice)' : ''), img);
    if (img) { const th = $('#cl-thumb', modale); if (th) th.remove(); pendingImage = null; }
    historique.push({ role: 'eleve', texte: texte || 'Voici l’énoncé en photo.' });
    ta.value = ''; ta.style.height = 'auto'; send.disabled = true; ta.disabled = true;
    const pense = bulle('lea', 'Léa réfléchit…'); pense.classList.add('pense');
    const contexte = { ...profilBase(), ...(o.contexte || {}) };
    if (img) contexte.image = img;
    let rep;
    try { rep = await poserQuestion(texte || 'Voici mon exercice (photo).', contexte, historique.slice(0, -1)); }
    catch (e) { rep = { reponse: 'Oups, je n’ai pas réussi à répondre. Réessaie ?', source: 'erreur' }; }
    pense.remove();
    bulle('lea', rep.reponse);
    historique.push({ role: 'lea', texte: rep.reponse });
    if (rep.source && rep.source !== 'llm') { const s = document.createElement('div'); s.className = 'cl-src'; s.textContent = rep.source === 'hors-ligne' || rep.source === 'erreur' ? 'ℹ️ Mode hors-ligne (le tuteur en ligne n’est pas connecté).' : ''; if (s.textContent) fil.appendChild(s); }
    send.disabled = false; ta.disabled = false; ta.focus();
  }

  $('#cl-form', modale).addEventListener('submit', (e) => {
    e.preventDefault();
    const texte = ta.value.trim();
    if (!texte && !pendingImage) return;
    envoyer(texte);
  });
  setTimeout(() => ta.focus(), 50);
}
