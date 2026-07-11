// Léa — NOYAU DES LABOS : chrome commun aux mini-jeux d'expérimentation
// (modale plein écran, barre d'XP/niveaux, badges, parcours de missions
// « prédis puis vérifie »). 100 % ADDITIF : n'injecte que ses propres styles
// (préfixe .lk-) et ne touche à rien d'existant. Le labo gravité garde sa
// mécanique propre ; les labos circuit / densité / vitesse s'appuient ici.
//
// Un labo = une SCÈNE interactive (canvas + réglages) + des MISSIONS. La scène
// remplit un objet `api` (getters/setters) que les missions interrogent.

const niveau = (xp) => Math.floor(xp / 100) + 1;

export function Store(key) {
  const lire = () => { try { return { xp: 0, missions: {}, badges: [], ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return { xp: 0, missions: {}, badges: [] }; } };
  const ecrire = (d) => { try { localStorage.setItem(key, JSON.stringify(d)); } catch { /* stockage indispo */ } };
  return { lire, ecrire };
}

let stylesInjectes = false;
function injecterStyles() {
  if (stylesInjectes || document.getElementById('lk-style')) { stylesInjectes = true; return; }
  stylesInjectes = true;
  const st = document.createElement('style'); st.id = 'lk-style';
  st.textContent = `
  .lk-modale{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(4,6,16,.72);backdrop-filter:blur(4px)}
  .lk-modale[hidden]{display:none}
  .lk-wrap{width:min(560px,97vw);max-height:95vh;overflow:auto;background:#0e1424;border:1.5px solid #ffffff24;border-radius:22px}
  .lk-top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px 8px}
  .lk-top h2{font-family:var(--round,sans-serif);font-size:1.15rem;margin:0;color:#fff}
  .lk-x{background:none;border:0;color:#cbd5e8;font-size:1.6rem;line-height:1;cursor:pointer}
  .lk-xp{padding:0 16px 8px}
  .lk-xpbar{height:9px;border-radius:999px;background:#ffffff18;overflow:hidden}
  .lk-xpbar>span{display:block;height:100%;background:linear-gradient(90deg,#14c8d4,#ffd24a);transition:width .5s}
  .lk-xpline{display:flex;justify-content:space-between;font-size:.76rem;color:#9fb0cc;margin-top:4px;font-family:var(--round,sans-serif);font-weight:600}
  .lk-badges{display:flex;gap:6px;flex-wrap:wrap;padding:0 14px 6px}
  .lk-badge{font-size:.76rem;background:#ffd24a1c;border:1.5px solid #ffd24a66;color:#ffe6a0;border-radius:999px;padding:4px 10px;font-weight:600}
  canvas.lk-cv{display:block;width:100%;height:220px;border-top:1px solid #ffffff14;border-bottom:1px solid #ffffff14;background:#05060f}
  .lk-read{display:flex;gap:8px;padding:10px 12px;justify-content:center;flex-wrap:wrap}
  .lk-read div{background:#ffffff10;border:1.5px solid #ffffff1e;border-radius:12px;padding:7px 12px;text-align:center;min-width:78px}
  .lk-read .k{font-size:.68rem;color:#9fb0cc;text-transform:uppercase;letter-spacing:.06em}
  .lk-read .v{font-family:var(--round,sans-serif);font-weight:700;font-size:1.12rem}
  .lk-read .v.a{color:#14c8d4}.lk-read .v.b{color:#7fe0a8}.lk-read .v.c{color:#ffd24a}
  .lk-ctrl{padding:4px 14px 12px}
  .lk-line{font-family:var(--round,sans-serif);font-weight:600;font-size:.82rem;color:#dfe4ff;margin:6px 0 6px}
  .lk-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;justify-content:center}
  .lk-chip{display:flex;align-items:center;gap:5px;font-family:var(--round,sans-serif);font-weight:600;font-size:.8rem;padding:6px 11px;border-radius:12px;border:1.5px solid #ffffff20;background:#ffffff0e;color:#fff;cursor:pointer}
  .lk-chip .mk{font-size:.68rem;color:#9fb0cc}
  .lk-chip.on{border-color:#14c8d4;background:#14c8d422}
  .lk-chip:hover{filter:brightness(1.1)}
  .lk-slide{display:flex;align-items:center;gap:10px;margin:6px 0 8px}
  .lk-slide label{font-family:var(--round,sans-serif);font-weight:600;font-size:.82rem;color:#dfe4ff;white-space:nowrap}
  .lk-slide input[type=range]{flex:1;accent-color:#14c8d4}
  .lk-slide .val{font-family:var(--round,sans-serif);font-weight:700;color:#14c8d4;min-width:56px;text-align:right}
  .lk-note{text-align:center;font-size:.86rem;color:#dfe4ff;background:#ffffff0d;border:1px solid #ffffff16;border-radius:12px;padding:7px 10px;margin:6px 0 2px;line-height:1.35}
  .lk-note b{color:#ffd98a}
  .lk-act{text-align:center;margin-top:8px}
  .lk-btn{font-family:var(--round,sans-serif);font-weight:700;font-size:.9rem;padding:9px 16px;border-radius:999px;border:1.5px solid #ffffff2e;background:#ffffff16;color:#fff;cursor:pointer}
  .lk-btn.gold{background:#ffd24a;color:#3a2400;border-color:transparent}
  .lk-btn:hover{filter:brightness(1.08)}
  .lk-fait{text-align:center;font-size:.82rem;color:#bcae86;padding:2px 14px 10px}
  .lk-miss{margin:6px 12px 14px;background:#12203c;border:1.5px solid #ffffff20;border-radius:16px;padding:14px}
  .lk-miss .tag{font-family:var(--round,sans-serif);font-weight:700;font-size:.72rem;color:#7fe0a8;text-transform:uppercase;letter-spacing:.08em}
  .lk-miss h4{font-family:var(--round,sans-serif);margin:2px 0 8px;color:#fff;font-size:1.05rem}
  .lk-miss .q{color:#dfe4ff;font-size:.92rem;line-height:1.45;margin:0 0 10px}
  .lk-miss .q b{color:#ffd98a}
  .lk-choix{display:flex;flex-direction:column;gap:7px}
  .lk-choix button{text-align:left;padding:10px 13px;border-radius:12px;border:1.5px solid #ffffff22;background:#ffffff10;color:#fff;cursor:pointer;font-size:.92rem}
  .lk-choix button.sel{border-color:#14c8d4;background:#14c8d422}
  .lk-numin{width:120px;padding:9px 12px;border-radius:10px;border:1.5px solid #ffffff2a;background:#0a1120;color:#fff;font-size:1rem}
  .lk-hint{color:#9fb0cc;font-size:.84rem;margin:0}
  .lk-fb{margin-top:10px;padding:10px 12px;border-radius:12px;font-size:.9rem;line-height:1.4;display:none}
  .lk-fb.show{display:block}
  .lk-fb.good{background:#14c8d41f;border:1.5px solid #14c8d4aa;color:#c9fff6}
  .lk-fb.bad{background:#ff8f8f1c;border:1.5px solid #ff8f8f88;color:#ffd9d9}
  .lk-fb .sol{display:block;margin-top:6px;color:#dfe4ff}
  .lk-next{margin-top:10px;display:flex;gap:8px;justify-content:flex-end}
  .lk-fin{text-align:center;padding:6px 14px 16px}
  .lk-fin .big{font-size:2.6rem}
  .lk-fin h4{font-family:var(--round,sans-serif);color:#fff;margin:6px 0 4px}
  .lk-fin p{color:#dfe4ff;font-size:.9rem;margin:0 0 10px}

  .lk-card{margin:14px 0 6px;border-radius:var(--rad,18px);padding:16px;color:#fff;position:relative;overflow:hidden;border:1.5px solid #ffffff2e}
  .lk-card h3{font-family:var(--round,sans-serif);margin:0 0 4px;font-size:1.08rem}
  .lk-card p{margin:0 0 12px;color:#eef1ff;font-size:.9rem;max-width:86%}
  .lk-cta{font-family:var(--round,sans-serif);font-weight:700;font-size:.95rem;padding:11px 18px;border-radius:999px;border:0;background:#ffd24a;color:#3a2400;cursor:pointer;box-shadow:0 4px 14px #0004}
  .lk-cta:hover{filter:brightness(1.06)}
  .lk-mini{display:inline-block;margin-left:10px;font-size:.82rem;color:#ffe9a8}
  `;
  document.head.appendChild(st);
}

/**
 * Crée un labo complet (modale + XP + missions) à partir d'une scène.
 * @param {object} o
 *  - key: clé localStorage
 *  - titre: titre de la modale
 *  - badges: { premier, final } libellés
 *  - scene(stageEl, api): construit la scène; l'objet `api` (mutable) est
 *    partagé avec les missions (elles y lisent l'état courant).
 *  - missions: [{ id, titre, xp, q, ui:'num'|'choix'|'live', choix?, unite?,
 *      hint?, prep(api)?, check(rep, api)=>bool, sol }]
 * @returns {{ ouvrir():void, etat():object, nbMissions:number }}
 */
export function creerLabo(o) {
  injecterStyles();
  const store = Store(o.key);
  const api = {};
  let modale, missIdx = 0, monte = false;

  function construire() {
    if (modale) return;
    modale = document.createElement('div'); modale.className = 'lk-modale'; modale.hidden = true;
    modale.innerHTML = `
    <div class="lk-wrap" role="dialog" aria-modal="true" aria-label="${o.titre}">
      <div class="lk-top"><h2>${o.titre}</h2><button class="lk-x" aria-label="Fermer">×</button></div>
      <div class="lk-xp">
        <div class="lk-xpbar"><span class="lk-fill" style="width:0"></span></div>
        <div class="lk-xpline"><span class="lk-niv">Niveau 1</span><span class="lk-xptxt">0 XP</span></div>
      </div>
      <div class="lk-badges"></div>
      <div class="lk-stage"></div>
      <div class="lk-miss"></div>
    </div>`;
    modale.addEventListener('click', (e) => { if (e.target === modale || e.target.classList.contains('lk-x')) fermer(); });
    document.body.appendChild(modale);
    o.scene(modale.querySelector('.lk-stage'), api);
    monte = true;
  }

  const q = (s) => modale.querySelector(s);

  function majXP() {
    const d = store.lire();
    q('.lk-fill').style.width = (d.xp % 100) + '%';
    q('.lk-niv').textContent = 'Niveau ' + niveau(d.xp);
    q('.lk-xptxt').textContent = d.xp + ' XP';
    q('.lk-badges').innerHTML = (d.badges || []).map((b) => `<span class="lk-badge">${b}</span>`).join('');
  }

  function rendreMission() {
    const zone = q('.lk-miss');
    const d = store.lire();
    const total = o.missions.length;
    const faites = o.missions.filter((m) => d.missions[m.id]).length;

    if (missIdx >= total) {
      zone.innerHTML =
        '<div class="lk-fin"><div class="big">🏆</div>' +
        `<h4>Parcours terminé — ${faites}/${total} missions&nbsp;!</h4>` +
        '<p>Continue à expérimenter librement : change les réglages et observe. C’est en jouant qu’on comprend vraiment.</p>' +
        '<button class="lk-btn gold lk-rejouer">↻ Rejouer les missions</button></div>';
      q('.lk-rejouer').addEventListener('click', () => { const dd = store.lire(); dd.missions = {}; store.ecrire(dd); missIdx = 0; rendreMission(); });
      return;
    }

    const m = o.missions[missIdx];
    if (m.prep) try { m.prep(api); } catch { /* scène pas prête */ }

    let corps = '';
    if (m.ui === 'num') corps = `<input class="lk-numin" type="text" inputmode="decimal" placeholder="Réponse…"> <span style="color:#9fb0cc">${m.unite || ''}</span>`;
    else if (m.ui === 'choix') corps = '<div class="lk-choix">' + m.choix.map((c, i) => `<button data-i="${i}">${c}</button>`).join('') + '</div>';
    else corps = `<p class="lk-hint">👉 ${m.hint || 'Manipule la scène ci-dessus, puis valide.'}</p>`;

    zone.innerHTML =
      `<div class="tag">Mission ${missIdx + 1} / ${total} · +${m.xp} XP</div>` +
      `<h4>${m.titre}</h4><p class="q">${m.q}</p>${corps}` +
      '<div class="lk-fb"></div><div class="lk-next"><button class="lk-btn gold lk-val">Valider</button></div>';

    let sel = null;
    if (m.ui === 'choix') zone.querySelectorAll('.lk-choix button').forEach((b) => b.addEventListener('click', () => {
      zone.querySelectorAll('.lk-choix button').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); sel = +b.dataset.i;
    }));

    q('.lk-val').addEventListener('click', () => {
      let rep = null;
      if (m.ui === 'num') { rep = parseFloat(String(q('.lk-numin').value).replace(',', '.')); if (!isFinite(rep)) rep = NaN; }
      else if (m.ui === 'choix') rep = sel;
      let bon = false; try { bon = !!m.check(rep, api); } catch { bon = false; }
      const fb = q('.lk-fb'); fb.className = 'lk-fb show ' + (bon ? 'good' : 'bad');
      fb.innerHTML = (bon ? '✅ Bravo !' : '❌ Pas encore.') + ` <span class="sol">💡 ${m.sol}</span>`;
      const btn = q('.lk-val');
      if (bon) {
        const dd = store.lire();
        if (!dd.missions[m.id]) {
          dd.missions[m.id] = 1; dd.xp += m.xp;
          if (o.badges?.premier && !dd.badges.includes(o.badges.premier)) dd.badges.push(o.badges.premier);
          if (o.badges?.final && o.missions.every((x) => dd.missions[x.id]) && !dd.badges.includes(o.badges.final)) dd.badges.push(o.badges.final);
          store.ecrire(dd); majXP();
        }
        const clone = btn.cloneNode(true); clone.textContent = missIdx + 1 >= total ? 'Voir le bilan →' : 'Mission suivante →';
        btn.replaceWith(clone); clone.addEventListener('click', () => { missIdx++; rendreMission(); });
      } else { btn.textContent = 'Réessayer'; }
    });
  }

  function ouvrir() {
    construire();
    modale.hidden = false;
    if (api.onOpen) try { api.onOpen(); } catch { /* noop */ }
    majXP();
    const d = store.lire();
    missIdx = o.missions.findIndex((m) => !d.missions[m.id]);
    if (missIdx < 0) missIdx = o.missions.length;
    rendreMission();
  }
  function fermer() { if (modale) { modale.hidden = true; if (api.onClose) try { api.onClose(); } catch { /* noop */ } } }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modale && !modale.hidden) fermer(); });

  return { ouvrir, etat: () => store.lire(), nbMissions: o.missions.length, niveau };
}

export { niveau };
