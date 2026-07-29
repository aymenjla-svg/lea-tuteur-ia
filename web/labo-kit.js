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
  /* ==== Intérieur d'un labo : même langage que la SÉANCE de cours ==== */
  .lk-modale{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(4,10,24,.66);backdrop-filter:blur(5px)}
  .lk-modale[hidden]{display:none}
  .lk-wrap{--c:#14c8d4;width:min(560px,97vw);max-height:95vh;overflow:auto;padding:16px 16px 20px;box-sizing:border-box;
    background:var(--panel-2,#0b1a2fdd);border:1.5px solid var(--border,#ffffff26);border-radius:22px;backdrop-filter:blur(12px);box-shadow:0 22px 60px rgba(4,12,30,.55)}
  .lk-wrap .hud{margin-bottom:4px}
  .lk-wrap .hud-barre{background:var(--c);box-shadow:0 0 10px var(--c)}
  .lk-wrap .hud-pct{color:#ffd98a}
  .lk-x{cursor:pointer}
  .lk-fig{margin:10px 2px 8px}
  .lk-badges{display:flex;gap:6px;flex-wrap:wrap;padding:0 2px 6px}
  .lk-badge{font-size:.74rem;background:color-mix(in srgb,var(--or,#ffd24a) 14%,transparent);border:1.5px solid color-mix(in srgb,var(--or,#ffd24a) 45%,transparent);color:#ffe6a0;border-radius:999px;padding:4px 10px;font-weight:600;font-family:var(--round,sans-serif)}
  /* le simulateur = « l'écran de la salle », encadré comme le tableau de classe */
  canvas.lk-cv{display:block;width:100%;box-sizing:border-box;height:220px;border-radius:14px;border:5px solid #a9663e;
    background:#0a1428;box-shadow:0 10px 24px rgba(0,0,0,.35),inset 0 0 0 1px rgba(0,0,0,.2)}
  .lk-read{display:flex;gap:8px;padding:12px 2px 8px;justify-content:center;flex-wrap:wrap}
  .lk-read div{background:var(--panel,#ffffff14);border:1.5px solid var(--border,#ffffff26);border-radius:14px;padding:8px 14px;text-align:center;min-width:84px;backdrop-filter:blur(8px)}
  .lk-read .k{font-size:.66rem;color:var(--txt2,#9fb0cc);text-transform:uppercase;letter-spacing:.06em}
  .lk-read .v{font-family:var(--round,sans-serif);font-weight:700;font-size:1.12rem}
  .lk-read .v.a{color:var(--c)}.lk-read .v.b{color:var(--ok,#34e2a8)}.lk-read .v.c{color:var(--or,#ffd24a)}
  .lk-ctrl{padding:2px 2px 4px}
  .lk-line{font-family:var(--round,sans-serif);font-weight:600;font-size:.82rem;color:var(--txt,#e7edf7);margin:8px 0 6px}
  .lk-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;justify-content:center}
  .lk-chip{display:flex;align-items:center;gap:5px;font-family:var(--round,sans-serif);font-weight:600;font-size:.8rem;padding:7px 12px;border-radius:999px;border:1.5px solid var(--border,#ffffff26);background:var(--panel,#ffffff12);color:var(--txt,#fff);cursor:pointer;backdrop-filter:blur(8px)}
  .lk-chip .mk{font-size:.68rem;color:var(--txt2,#9fb0cc)}
  .lk-chip.on{border-color:var(--c);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--c) 45%,transparent)}
  .lk-chip:hover{background:var(--panel-2,#ffffff1f)}
  .lk-slide{display:flex;align-items:center;gap:10px;margin:6px 0 8px}
  .lk-slide label{font-family:var(--round,sans-serif);font-weight:600;font-size:.82rem;color:var(--txt,#dfe4ff);white-space:nowrap}
  .lk-slide input[type=range]{flex:1;accent-color:var(--c)}
  .lk-slide .val{font-family:var(--round,sans-serif);font-weight:700;color:var(--c);min-width:56px;text-align:right}
  .lk-note{text-align:center;font-size:.86rem;color:var(--txt,#dfe4ff);background:var(--panel,#ffffff12);border:1.5px solid var(--border,#ffffff26);border-radius:14px;padding:9px 12px;margin:8px 0 2px;line-height:1.4;backdrop-filter:blur(8px)}
  .lk-note b{color:#ffd98a}
  .lk-act{text-align:center;margin-top:10px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
  .lk-btn{font-family:var(--round,sans-serif);font-weight:700;font-size:.9rem;padding:10px 18px;border-radius:var(--rad,14px);border:1.5px solid var(--border,#ffffff2e);background:var(--panel,#ffffff16);color:#fff;cursor:pointer}
  .lk-btn:hover{background:var(--panel-2,#ffffff22)}
  .lk-btn.gold{border:none;background:linear-gradient(120deg,var(--or,#ffd24a),#ffd166);color:#4a2f00;box-shadow:0 6px 18px rgba(255,194,60,.4)}
  .lk-fait{text-align:center;font-size:.82rem;color:var(--txt2,#bcae86);padding:6px 2px 2px}
  /* mission = consigne façon « soustitre » de la séance */
  .lk-miss{margin:12px 0 4px;background:var(--panel-2,#ffffff1a);border:1.5px solid var(--border,#ffffff26);border-radius:var(--rad,16px);padding:14px 16px;backdrop-filter:blur(10px)}
  .lk-miss .tag{font-family:var(--round,sans-serif);font-weight:700;font-size:.72rem;color:var(--ok,#7fe0a8);text-transform:uppercase;letter-spacing:.08em}
  .lk-miss h4{font-family:var(--round,sans-serif);margin:2px 0 8px;color:#fff;font-size:1.05rem}
  .lk-miss .q{color:var(--txt,#dfe4ff);font-size:.95rem;line-height:1.45;margin:0 0 10px}
  .lk-miss .q b{color:#ffd98a}
  .lk-choix{display:flex;flex-direction:column;gap:7px}
  .lk-choix button{text-align:left;padding:11px 14px;border-radius:12px;border:1.5px solid var(--border,#ffffff26);background:var(--panel,#ffffff10);color:#fff;cursor:pointer;font-size:.92rem}
  .lk-choix button:hover{background:var(--panel-2,#ffffff1f)}
  .lk-choix button.sel{border-color:var(--c);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--c) 40%,transparent)}
  .lk-numin{width:130px;padding:11px 14px;border-radius:12px;border:1.5px solid var(--border,#ffffff2a);background:rgba(0,0,0,.22);color:#fff;font-size:1rem;font-family:var(--round,sans-serif)}
  .lk-hint{color:var(--txt2,#9fb0cc);font-size:.84rem;margin:0}
  .lk-fb{margin-top:10px;padding:11px 14px;border-radius:12px;font-size:.9rem;line-height:1.45;display:none}
  .lk-fb.show{display:block}
  .lk-fb.good{background:color-mix(in srgb,var(--ok,#34e2a8) 16%,transparent);border:1.5px solid color-mix(in srgb,var(--ok,#34e2a8) 60%,transparent);color:#d6fff0}
  .lk-fb.bad{background:#ff8f8f1c;border:1.5px solid #ff8f8f88;color:#ffd9d9}
  .lk-fb .sol{display:block;margin-top:6px;color:var(--txt,#dfe4ff)}
  .lk-next{margin-top:12px;display:flex;gap:8px;justify-content:flex-end}
  .lk-fin{text-align:center;padding:8px 2px 6px}
  .lk-fin .big{font-size:2.6rem}
  .lk-fin h4{font-family:var(--round,sans-serif);color:#fff;margin:6px 0 4px}
  .lk-fin p{color:var(--txt,#dfe4ff);font-size:.9rem;margin:0 0 10px}

  .lk-card{margin:14px 0 6px;border-radius:var(--rad,18px);padding:16px;color:#fff;position:relative;overflow:hidden;border:1.5px solid #ffffff2e}
  .lk-card h3{font-family:var(--round,sans-serif);margin:0 0 4px;font-size:1.08rem}
  .lk-card p{margin:0 0 12px;color:#eef1ff;font-size:.9rem;max-width:86%}
  .lk-cta{font-family:var(--round,sans-serif);font-weight:700;font-size:.95rem;padding:11px 18px;border-radius:999px;border:0;background:#ffd24a;color:#3a2400;cursor:pointer;box-shadow:0 4px 14px #0004}
  .lk-cta:hover{filter:brightness(1.06)}
  .lk-mini{display:inline-block;margin-left:10px;font-size:.82rem;color:#ffe9a8}

  /* ---- Portes des LABOS : MÊMES portes que les cours (.porte), matière labo.
         On réutilise toute l'architecture de styles.css et on ne surcharge que
         le battant (métallique) et le vitrail (hublot lumineux). ---- */
  .labos-head{margin-top:30px}
  .labos-grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:15px;align-items:start}
  .porte--labo .porte-battant{background:linear-gradient(180deg,#33415f,#161e33);border-color:#5a6a86}
  .porte--labo .porte-battant::before{content:"";position:absolute;inset:9px 15px;border-radius:64px 64px 6px 6px;border:1px solid #ffffff14;pointer-events:none}
  .porte--labo .porte-vitre{border:3px solid #ffffff42;
    background:radial-gradient(circle at 40% 34%,#ffffff33,color-mix(in srgb,var(--c) 80%,#000) 80%);
    box-shadow:0 0 22px color-mix(in srgb,var(--c) 60%,transparent),inset 0 0 18px #000a}
  .porte--labo .porte-pct{color:#ffd98a}
  .porte-tag{position:absolute;top:9px;left:13px;z-index:3;font-family:var(--round,sans-serif);font-weight:700;font-size:.56rem;letter-spacing:.15em;
    color:var(--c);border:1.5px solid color-mix(in srgb,var(--c) 55%,transparent);border-radius:999px;padding:2px 7px;background:#0b1428cc}
  .pl-bolt{position:absolute;width:6px;height:6px;border-radius:50%;background:#c7ccd6;box-shadow:inset 0 0 0 1px #0006;z-index:3}
  .pl-bolt.a{top:24px;left:calc(50% - 50px)}.pl-bolt.b{top:24px;left:calc(50% + 44px)}
  .pl-bolt.c{top:96px;left:calc(50% - 50px)}.pl-bolt.d{top:96px;left:calc(50% + 44px)}
  /* ---- Animation d'ouverture du sas au clic ---- */
  .pl-onde{position:absolute;top:16px;left:50%;transform:translateX(-50%);width:90px;height:90px;border-radius:50%;border:2px solid var(--c);opacity:0;pointer-events:none;z-index:2}
  .porte--labo.pl-ouvre .porte-cadre{animation:pl-lift .46s ease}
  .porte--labo.pl-ouvre .pl-onde{animation:pl-onde .46s ease-out}
  .porte--labo.pl-ouvre .porte-vitre{animation:pl-pop .46s ease-out}
  .porte--labo.pl-ouvre .porte-ico{animation:pl-icon .46s ease-out}
  @keyframes pl-onde{0%{opacity:.85;transform:translateX(-50%) scale(.6)}100%{opacity:0;transform:translateX(-50%) scale(2.4)}}
  @keyframes pl-pop{0%{filter:brightness(1)}42%{filter:brightness(1.65);box-shadow:0 0 30px var(--c),inset 0 0 20px #000a}100%{filter:brightness(1)}}
  @keyframes pl-icon{0%{transform:scale(1)}42%{transform:scale(1.32)}100%{transform:scale(1)}}
  @keyframes pl-lift{0%{transform:translateY(0)}30%{transform:translateY(-9px)}100%{transform:translateY(0)}}
  @media (prefers-reduced-motion: reduce){.porte--labo.pl-ouvre *{animation:none !important}}
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
    <div class="lk-wrap" role="dialog" aria-modal="true" aria-label="${o.titre}" style="--c:${o.couleur || '#14c8d4'}">
      <header class="hud">
        <button class="hud-retour lk-x" aria-label="Retour au sommaire">←</button>
        <div class="hud-centre">
          <div class="hud-titre">${o.titre}</div>
          <div class="hud-barre-fond"><div class="hud-barre lk-fill" style="width:0"></div></div>
        </div>
        <span class="hud-pct lk-stars">⭐ 0/${o.missions.length}</span>
      </header>
      <div class="fig-label lk-fig">◦ Salle d’expérience — en direct</div>
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
    const total = o.missions.length;
    const faites = o.missions.filter((m) => d.missions[m.id]).length;
    q('.lk-fill').style.width = (total ? (faites / total) * 100 : 0) + '%';
    q('.lk-stars').textContent = `⭐ ${faites}/${total}`;
    const fig = q('.lk-fig'); if (fig) fig.textContent = `◦ Salle d’expérience — en direct · niveau ${niveau(d.xp)}`;
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

/* Garantit la section « Les labos » dans l'accueil (créée si absente) et
 * renvoie la grille où déposer les portes. */
function assurerLabosGrille() {
  const accueil = document.querySelector('#accueil'); if (!accueil) return null;
  let grille = accueil.querySelector('#labosGrille');
  if (grille) return grille;
  // Repli : l'HTML ne contient pas encore la section → on la crée après les cours.
  const head = document.createElement('div');
  head.className = 'sec-head labos-head';
  head.innerHTML = '<span class="eyebrow">🔬 Les labos — expérimente et joue</span><span class="sec-count" id="labosCount"></span>';
  grille = document.createElement('div'); grille.className = 'labos-grille'; grille.id = 'labosGrille';
  const mods = accueil.querySelector('#modulesGrille');
  if (mods && mods.parentElement === accueil) { mods.after(grille); accueil.insertBefore(head, grille); }
  else { const note = accueil.querySelector('p.note'); if (note) { accueil.insertBefore(head, note); accueil.insertBefore(grille, note); } else { accueil.append(head, grille); } }
  return grille;
}

/**
 * Dépose une « porte de labo » dans la section Labos, insérée selon `ordre`.
 * Même architecture que les portes de cours (.porte) + modificateur .porte--labo
 * (battant métallique, vitrail → hublot lumineux, badge 🔬, progression = ⭐).
 * @param {object} o { id, ordre, icone, couleur, titre, faites, total, niv, ouvrir }
 */
export function porteLabo(o) {
  injecterStyles();
  const grille = assurerLabosGrille(); if (!grille || grille.querySelector('#' + o.id)) return;
  const total = o.total || 0, faites = o.faites || 0;
  const pct = total ? Math.round((faites / total) * 100) : 0;
  const label = faites === 0 ? 'Entrer' : (faites >= total ? 'Revoir' : 'Reprendre');
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'porte porte--labo' + (faites ? ' allumee' : ''); b.id = o.id;
  b.style.setProperty('--c', o.couleur || '#14c8d4');
  b.dataset.ordre = o.ordre || 0;
  b.setAttribute('aria-label', `${o.titre} — labo (${faites}/${total} missions)`);
  b.innerHTML =
    '<div class="porte-cadre">' +
      `<span class="porte-num">${String(o.ordre || 0).padStart(2, '0')}</span>` +
      '<span class="porte-tag">🔬 LABO</span>' +
      '<div class="porte-battant">' +
        '<span class="pl-bolt a"></span><span class="pl-bolt b"></span><span class="pl-bolt c"></span><span class="pl-bolt d"></span>' +
        '<span class="pl-onde"></span>' +
        `<div class="porte-vitre"><span class="porte-ico">${o.icone}</span></div>` +
        '<span class="porte-poignee"></span>' +
      '</div>' +
      '<span class="porte-base"></span>' +
    '</div>' +
    '<div class="porte-plaque">' +
      `<div class="porte-nom">${o.titre}</div>` +
      `<div class="porte-bar"><span style="width:${pct}%"></span></div>` +
      `<div class="porte-pied"><span class="porte-pct">⭐ ${faites}/${total}</span><span class="porte-go">${label} →</span></div>` +
    '</div>';
  b.addEventListener('click', () => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { o.ouvrir(); return; }
    if (b.classList.contains('pl-ouvre')) return; // anim déjà en cours
    b.classList.add('pl-ouvre');
    setTimeout(() => { b.classList.remove('pl-ouvre'); o.ouvrir(); }, 440);
  });
  // insertion triée par `ordre`
  const suivant = Array.from(grille.children).find((c) => Number(c.dataset.ordre) > Number(b.dataset.ordre));
  if (suivant) grille.insertBefore(b, suivant); else grille.appendChild(b);
  const cnt = document.querySelector('#labosCount'); if (cnt) cnt.textContent = `${grille.children.length} labos · joue et comprends`;
}

export { niveau };
