// Léa — VISITE GUIDÉE. Au premier passage (et à la demande via un bouton),
// Léa fait le tour du propriétaire : sa TÊTE navigue d'une rubrique à l'autre,
// éclaire (spotlight) la section concernée et l'explique À HAUTE VOIX (voix.js).
// 100 % ADDITIF : un seul module autonome, aucune modification du cœur.

import { voix } from './voix.js';
import { personaParId } from './personas.js';
import { lireA11y } from './accessibilite.js';

const $ = (s, r = document) => r.querySelector(s);
const LEA = personaParId('persona-lea');
const CLE = 'lea.visite.v1';
const TETE = 'avatars/persona-lea.png';

// Étapes du tour : chaque étape éclaire une rubrique et Léa la commente.
// `sel` peut cibler plusieurs candidats (le premier présent gagne).
const ETAPES = [
  { sel: ['.logo'],
    txt: "Salut, moi c'est Léa, ta prof de physique&nbsp;! Installe-toi, je te fais visiter mon école en une minute." },
  { sel: ['#salleProfs'],
    txt: "Ici, c'est la salle des profs. Tu peux choisir qui t'accompagne&nbsp;: moi, ou l'un de mes collègues. On a chacun notre petit style." },
  { sel: ['#niveauSeg'],
    txt: "Là, tu choisis ta classe. Comme ça, je te propose pile les notions de ton niveau, ni trop faciles, ni trop dures." },
  { sel: ['.t-cours', '#modulesGrille'],
    txt: "Voici la cour des cours. Chaque porte, c'est une notion de physique. Tu entres, je t'explique au tableau, puis on s'entraîne ensemble." },
  { sel: ['.t-labos', '#labosGrille'],
    txt: "Et ça, ce sont mes labos&nbsp;! Ici tu ne fais pas que répondre&nbsp;: tu manipules, tu expérimentes, tu joues avec la physique pour la comprendre pour de vrai." },
  { sel: ['#devoirs-card'],
    txt: "Un devoir te bloque&nbsp;? Prends-le en photo et je t'aide à le comprendre, pas à pas, sans jamais te donner la réponse toute faite." },
  { sel: ['#enseigner-card'],
    txt: "Et mon préféré&nbsp;: ici, c'est toi le prof&nbsp;! Tu m'expliques une notion et je te pose des questions. Expliquer, c'est la meilleure façon d'apprendre." },
  { sel: ['#int-card'],
    txt: "Dis-moi ce que tu aimes, et je glisserai tes passions dans mes exemples. La physique, c'est plus sympa avec ce qui te plaît." },
  { sel: ['p.note', '.note'],
    txt: "Enfin, tes parents ou ton prof peuvent suivre tes progrès depuis le tableau de bord. Voilà, la visite est finie&nbsp;: à toi de jouer&nbsp;!" },
];

let etape = 0, actives = [], sur = null, poseTimer = 0;

/* ------------------------------ styles --------------------------------- */
function injecterStyles() {
  if ($('#lv-style')) return;
  const st = document.createElement('style'); st.id = 'lv-style';
  st.textContent = `
  .lv-overlay{position:fixed;inset:0;z-index:6000;display:none}
  .lv-overlay.on{display:block}
  .lv-hole{position:absolute;border-radius:16px;
    box-shadow:0 0 0 9999px rgba(8,12,24,.72),0 0 0 3px rgba(255,206,92,.85),0 0 24px 5px rgba(255,206,92,.28);
    transition:top .5s cubic-bezier(.34,1.1,.4,1),left .5s cubic-bezier(.34,1.1,.4,1),
      width .5s cubic-bezier(.34,1.1,.4,1),height .5s cubic-bezier(.34,1.1,.4,1),opacity .3s ease;
    pointer-events:none}
  .lv-caravane{position:absolute;left:50%;top:60%;display:flex;gap:10px;align-items:flex-start;
    width:min(342px,calc(100vw - 24px));
    transition:top .6s cubic-bezier(.34,1.15,.4,1),left .6s cubic-bezier(.34,1.15,.4,1);
    will-change:top,left}
  .lv-tete{flex:0 0 auto;width:74px;height:74px;border-radius:50%;object-fit:cover;object-position:50% 6%;
    border:3px solid #ffce5c;background:#17203a;
    box-shadow:0 8px 22px rgba(0,0,0,.5),0 0 0 4px rgba(255,206,92,.18);
    animation:lv-flott 3.2s ease-in-out infinite}
  .lv-tete.parle{animation:lv-flott 3.2s ease-in-out infinite,lv-parle .5s ease-in-out infinite}
  .lv-emoji{flex:0 0 auto;width:74px;height:74px;border-radius:50%;display:grid;place-items:center;
    font-size:38px;border:3px solid #ffce5c;background:#17203a}
  @keyframes lv-flott{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  @keyframes lv-parle{0%,100%{box-shadow:0 8px 22px rgba(0,0,0,.5),0 0 0 4px rgba(255,206,92,.18)}
    50%{box-shadow:0 8px 22px rgba(0,0,0,.5),0 0 0 8px rgba(255,206,92,.42)}}
  .lv-bulle{position:relative;flex:1 1 auto;background:linear-gradient(180deg,#1b2440,#141b30);
    border:1.5px solid rgba(255,255,255,.14);border-radius:16px;padding:13px 14px 11px;
    box-shadow:0 12px 30px rgba(0,0,0,.5);color:#eaf0ff;font-family:var(--round,"Lexend",sans-serif)}
  .lv-bulle::before{content:"";position:absolute;left:-8px;top:24px;width:14px;height:14px;
    background:#1b2440;border-left:1.5px solid rgba(255,255,255,.14);border-bottom:1.5px solid rgba(255,255,255,.14);
    transform:rotate(45deg)}
  .lv-nom{font-weight:700;font-size:.74rem;letter-spacing:.04em;text-transform:uppercase;
    color:#ffce5c;margin:0 0 3px}
  .lv-txt{margin:0;font-size:.96rem;line-height:1.42;font-weight:500}
  .lv-actions{display:flex;align-items:center;gap:8px;margin-top:11px}
  .lv-dots{display:flex;gap:5px;margin-right:auto}
  .lv-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.24)}
  .lv-dot.on{background:#ffce5c;box-shadow:0 0 8px rgba(255,206,92,.7)}
  .lv-skip{background:none;border:0;color:#9fb0cc;font:inherit;font-size:.82rem;cursor:pointer;padding:6px 4px}
  .lv-skip:hover{color:#eaf0ff}
  .lv-next{background:linear-gradient(180deg,#ffd873,#ffb638);border:0;border-radius:11px;
    padding:8px 15px;font:inherit;font-weight:700;font-size:.9rem;color:#3a2600;cursor:pointer;
    box-shadow:0 6px 16px rgba(255,182,56,.4)}
  .lv-next:active{transform:translateY(1px)}
  /* Carte de départ (geste requis pour la voix) */
  .lv-start{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    width:min(360px,calc(100vw - 32px));text-align:center;
    background:linear-gradient(180deg,#1b2440,#141b30);border:1.5px solid rgba(255,255,255,.14);
    border-radius:22px;padding:24px 22px 20px;box-shadow:0 20px 50px rgba(0,0,0,.55)}
  .lv-start .lv-tete,.lv-start .lv-emoji{margin:0 auto 12px;width:88px;height:88px}
  .lv-start h3{margin:0 0 6px;font-family:var(--round,"Lexend",sans-serif);font-size:1.18rem;color:#fff}
  .lv-start p{margin:0 0 16px;color:#b8c4dc;font-size:.94rem;line-height:1.4}
  .lv-go{display:block;width:100%;background:linear-gradient(180deg,#ffd873,#ffb638);border:0;
    border-radius:14px;padding:13px;font-family:var(--round,"Lexend",sans-serif);font-weight:700;
    font-size:1rem;color:#3a2600;cursor:pointer;box-shadow:0 8px 20px rgba(255,182,56,.4)}
  .lv-go:active{transform:translateY(1px)}
  .lv-later{margin-top:10px;background:none;border:0;color:#9fb0cc;font-family:var(--round,"Lexend",sans-serif);
    font-size:.86rem;cursor:pointer}
  .lv-later:hover{color:#eaf0ff}
  /* Bouton « visite guidée » (haut de l'accueil, dans le héros) */
  .lv-replay{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;margin:14px 0 0;
    background:linear-gradient(180deg,#ffd873,#ffb638);border:0;border-radius:13px;
    padding:11px 18px;font-family:var(--round,"Lexend",sans-serif);font-weight:700;font-size:.95rem;
    color:#3a2600;cursor:pointer;box-shadow:0 8px 20px rgba(255,182,56,.32)}
  .lv-replay:hover{filter:brightness(1.05)}
  .lv-replay:active{transform:translateY(1px)}
  @media (max-width:430px){.lv-caravane{flex-direction:column;align-items:center;width:min(300px,calc(100vw - 20px))}
    .lv-bulle::before{display:none}.lv-tete,.lv-emoji{width:64px;height:64px}}
  @media (prefers-reduced-motion:reduce){.lv-tete,.lv-tete.parle{animation:none}
    .lv-caravane,.lv-hole{transition:opacity .3s ease}}
  `;
  document.head.appendChild(st);
}

/* ------------------------------ voix ----------------------------------- */
function paramsVoixLea() {
  const base = LEA?.voix ?? {};
  const v = Math.min(1.6, Math.max(0.8, Number(lireA11y().vitesseVoix) || 1));
  let lecture = Math.max((LEA?.voixN?.lecture ?? 1) * v, 1.02);
  return { ...base, rate: (base.rate ?? 1) * v, sexe: LEA?.sexe, lecture, voixNeurale: LEA?.voixN?.openai };
}

// Le sous-titre garde le HTML (&nbsp;) ; la voix reçoit du texte propre.
function pourVoix(html) {
  const d = document.createElement('div'); d.innerHTML = html;
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

function dire(html) {
  voix.interrompre();
  const tete = $('.lv-tete', sur) || $('.lv-emoji', sur);
  if (!voix.tts) return;
  voix.parler(pourVoix(html), {
    params: paramsVoixLea(),
    onStart: () => tete?.classList.add('parle'),
    onEnd: () => tete?.classList.remove('parle'),
  });
}

/* --------------------------- construction ------------------------------ */
function teteHTML(cls = 'lv-tete') {
  return `<img class="${cls}" src="${TETE}" alt="Léa"
    onerror="this.outerHTML='<span class=\\'lv-emoji\\'>🌸</span>'">`;
}

function construireOverlay() {
  if (sur) return sur;
  injecterStyles();
  sur = document.createElement('div');
  sur.className = 'lv-overlay';
  sur.innerHTML = `
    <div class="lv-hole" style="opacity:0"></div>
    <div class="lv-caravane" hidden>
      ${teteHTML()}
      <div class="lv-bulle">
        <p class="lv-nom">Léa</p>
        <p class="lv-txt"></p>
        <div class="lv-actions">
          <div class="lv-dots" aria-hidden="true"></div>
          <button type="button" class="lv-skip">Passer</button>
          <button type="button" class="lv-next">Suivant →</button>
        </div>
      </div>
    </div>
    <div class="lv-start" hidden>
      ${teteHTML()}
      <h3>Je te fais visiter&nbsp;?</h3>
      <p>En une minute, je te montre où trouver les cours, les labos et tout le reste.</p>
      <button type="button" class="lv-go">▶ Démarrer la visite</button>
      <button type="button" class="lv-later">Plus tard</button>
    </div>`;
  document.body.appendChild(sur);

  $('.lv-next', sur).addEventListener('click', suivant);
  $('.lv-skip', sur).addEventListener('click', () => terminer(true));
  $('.lv-go', sur).addEventListener('click', () => { $('.lv-start', sur).hidden = true; demarrerEtapes(); });
  $('.lv-later', sur).addEventListener('click', () => terminer(true));
  return sur;
}

/* --------------------------- positionnement ---------------------------- */
function cibleDe(etp) {
  for (const s of etp.sel) { const el = $(s); if (el) return el; }
  return null;
}

function placer() {
  const etp = actives[etape];
  const cible = cibleDe(etp);
  const hole = $('.lv-hole', sur), car = $('.lv-caravane', sur);
  if (!cible) { hole.style.opacity = '0'; centrer(car); return; }
  // Défilement INSTANTANÉ (pas 'smooth') : sinon on mesure la position pendant
  // que la page bouge encore et la bulle atterrit hors de l'écran.
  cible.scrollIntoView({ block: 'center', behavior: 'auto' });
  clearTimeout(poseTimer);
  poseTimer = setTimeout(() => {
    const r = cible.getBoundingClientRect(), pad = 10;
    const vw = window.innerWidth, vh = window.innerHeight;
    hole.style.opacity = '1';
    hole.style.left = (r.left - pad) + 'px';
    hole.style.top = (r.top - pad) + 'px';
    hole.style.width = (r.width + pad * 2) + 'px';
    hole.style.height = (r.height + pad * 2) + 'px';
    // La caravane (tête + bulle) se pose sous la zone, sinon au-dessus —
    // et TOUJOURS bornée à l'écran pour que la bulle reste visible.
    const carW = Math.min(342, vw - 24);
    const left = Math.max(12, Math.min(r.left + r.width / 2 - carW / 2, vw - carW - 12));
    car.style.transform = 'none';
    car.style.width = carW + 'px';
    car.style.left = left + 'px';
    const carH = car.offsetHeight || 190;
    const bas = r.bottom + pad + 14;
    let top = (bas + carH < vh - 12) ? bas : (r.top - pad - 14 - carH);
    top = Math.max(12, Math.min(top, vh - carH - 12));
    car.style.top = top + 'px';
  }, 130);
}

function centrer(car) {
  car.style.transform = 'translate(-50%,-50%)';
  car.style.left = '50%'; car.style.top = '50%';
}

/* ------------------------------ pilotage ------------------------------- */
function majDots() {
  const box = $('.lv-dots', sur);
  box.innerHTML = actives.map((_, i) => `<span class="lv-dot${i === etape ? ' on' : ''}"></span>`).join('');
}

function montrerEtape() {
  const etp = actives[etape];
  $('.lv-txt', sur).innerHTML = etp.txt;
  $('.lv-next', sur).textContent = etape >= actives.length - 1 ? 'Terminer ✓' : 'Suivant →';
  majDots();
  placer();
  dire(etp.txt);
}

function suivant() {
  if (etape >= actives.length - 1) { terminer(true); return; }
  etape++; montrerEtape();
}

function demarrerEtapes() {
  etape = 0;
  $('.lv-caravane', sur).hidden = false;
  montrerEtape();
}

function terminer(marquer) {
  voix.interrompre();
  clearTimeout(poseTimer);
  if (sur) sur.classList.remove('on');
  if (marquer) { try { localStorage.setItem(CLE, '1'); } catch { /* indispo */ } }
}

/** Lance la visite. `auto` = déclenchement premier passage (montre la carte de départ). */
export function lancerVisite() {
  construireOverlay();
  actives = ETAPES.filter((e) => cibleDe(e));
  if (!actives.length) return;
  etape = 0;
  sur.classList.add('on');
  $('.lv-caravane', sur).hidden = true;
  $('.lv-hole', sur).style.opacity = '0';
  $('.lv-start', sur).hidden = false;
}

/* ----------------------------- intégration ----------------------------- */
function injecterBouton() {
  if ($('#lv-replay')) return;
  const accueil = $('#accueil'); if (!accueil) return;
  const btn = document.createElement('button');
  btn.id = 'lv-replay'; btn.className = 'lv-replay'; btn.type = 'button';
  btn.innerHTML = '🧭 Visite guidée';
  btn.addEventListener('click', lancerVisite);
  // En HAUT : dans le héros, juste sous le sélecteur de niveau.
  const seg = accueil.querySelector('#niveauSeg');
  if (seg) seg.insertAdjacentElement('afterend', btn);
  else accueil.insertBefore(btn, accueil.querySelector('.sec-titre'));
}

// Auto-lancement au tout premier passage — mais seulement une fois l'onboarding
// (création du profil) terminé, pour ne pas se chevaucher.
function autoLancer() {
  try { if (localStorage.getItem(CLE)) return; } catch { return; }
  const onb = $('#onboarding');
  const pret = () => !onb || onb.hidden;
  const go = () => setTimeout(lancerVisite, 500);
  if (pret()) { go(); return; }
  const obs = new MutationObserver(() => { if (pret()) { obs.disconnect(); go(); } });
  obs.observe(onb, { attributes: true, attributeFilter: ['hidden'] });
}

function init() { injecterBouton(); autoLancer(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
