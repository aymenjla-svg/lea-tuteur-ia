// Tableau de bord éducateur — activité RÉELLE de l'appareil (localStorage).
// v1 mono-appareil : reflète la pratique de l'élève sur ce navigateur. Le
// multi-élèves (comptes, agrégation classe) viendra avec le backend.

import { MODULES, progressModule } from './modules.js';
import { lireSuivi, ERREUR_LIB, effacerSuivi } from './suivi.js';
import { serie } from './jeu.js';
import { appliquerA11y } from './accessibilite.js';
import { PERSONAS } from './personas.js';
import { soulEffectif, definirSoul, reinitialiserSoul, soulPersonnalise, exporterSouls } from './souls.js';
import { charteEffective, definirCharte, reinitialiserCharte, chartePersonnalisee, exporterCharte } from './charte.js';
import { poserQuestion } from './tuteur-llm.js';

appliquerA11y();

const $ = (s) => document.querySelector(s);
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

function carte(valeur, libelle) {
  return `<div class="carte"><div class="val">${valeur}</div><div class="lib">${libelle}</div></div>`;
}

/** Map objectif → module (via MODULES.objectifs). */
function mapObjectifModule() {
  const map = {};
  for (const m of MODULES) for (const o of m.objectifs ?? []) map[o] = m;
  return map;
}

/** Agrège le suivi par module (somme des objectifs du module). */
function parModule(suivi) {
  const mapo = mapObjectifModule();
  const acc = {};
  for (const [obj, e] of Object.entries(suivi)) {
    const m = mapo[obj];
    if (!m) continue;
    const a = (acc[m.id] ??= { module: m, tentatives: 0, reussis: 0, erreurs: {}, derniere: '' });
    a.tentatives += e.tentatives ?? 0;
    a.reussis += e.reussis ?? 0;
    for (const [t, n] of Object.entries(e.erreurs ?? {})) a.erreurs[t] = (a.erreurs[t] ?? 0) + n;
    if ((e.derniere ?? '') > a.derniere) a.derniere = e.derniere;
  }
  return Object.values(acc);
}

function barres(conteneur, entrees) {
  const el = $(conteneur);
  if (!entrees.length) {
    el.innerHTML = '<p class="vide">Aucune erreur enregistrée.</p>';
    return;
  }
  const max = Math.max(...entrees.map(([, n]) => n));
  el.innerHTML = entrees
    .map(
      ([t, n]) =>
        `<div class="ligne"><span class="nom">${ERREUR_LIB[t] ?? t}</span>` +
        `<span class="jauge"><span style="width:${Math.round((n / max) * 100)}%"></span></span>` +
        `<span class="n">${n}×</span></div>`,
    )
    .join('');
}

function charger() {
  const mods = parModule(lireSuivi());
  const totalT = mods.reduce((s, a) => s + a.tentatives, 0);
  const totalR = mods.reduce((s, a) => s + a.reussis, 0);
  const errG = {};
  for (const a of mods) for (const [t, n] of Object.entries(a.erreurs)) errG[t] = (errG[t] ?? 0) + n;

  $('#cartes').innerHTML = [
    carte(totalT, 'exercices faits'),
    carte(pct(totalR, totalT) + ' %', 'réussite'),
    carte(mods.length, 'notions travaillées'),
    carte(serie(), 'jours de série'),
  ].join('');

  if (!mods.length) {
    $('#notions').innerHTML =
      '<p class="vide">Aucune activité pour l’instant. Fais quelques exercices dans l’app, puis reviens ici.</p>';
  } else {
    $('#notions').innerHTML = mods
      .sort((a, b) => b.tentatives - a.tentatives)
      .map((a) => {
        const m = progressModule(a.module);
        const top = Object.entries(a.erreurs).sort((x, y) => y[1] - x[1])[0];
        const err = top
          ? `Erreur fréquente : <b>${ERREUR_LIB[top[0]] ?? top[0]}</b> (${top[1]}×)`
          : 'Aucune erreur ✨';
        const faible = m < 50 || pct(a.reussis, a.tentatives) < 60;
        return (
          `<div class="notion${faible ? ' a-revoir' : ''}">` +
          `<div class="notion-tete"><span class="notion-nom">${a.module.icone} ${a.module.titre}</span>` +
          `<span class="notion-m">${m} %</span></div>` +
          `<div class="jauge"><span style="width:${m}%"></span></div>` +
          `<div class="notion-det">${a.reussis}/${a.tentatives} réussis · ${pct(a.reussis, a.tentatives)} % de réussite · ${err}</div>` +
          `</div>`
        );
      })
      .join('');
  }

  barres('#erreurs', Object.entries(errG).sort((a, b) => b[1] - a[1]));
}

$('#rafraichir').addEventListener('click', charger);
$('#reset').addEventListener('click', () => {
  if (confirm('Effacer les données de suivi de cet appareil ?')) {
    effacerSuivi();
    charger();
  }
});
charger();

/* --- Personnalité (« soul ») des profs ------------------------------------ */

let soulSel = PERSONAS[0].id;

function rendreSoulProfs() {
  $('#soulProfs').innerHTML = PERSONAS.map((p) =>
    `<button type="button" class="soul-prof${p.id === soulSel ? ' actif' : ''}" data-id="${p.id}" style="--accent:${p.accent}">` +
      `<span class="dot" style="background:${p.accent}"></span>${p.nom}${soulPersonnalise(p.id) ? ' <span class="perso" title="Personnalisé">✎</span>' : ''}` +
    '</button>').join('');
  for (const b of $('#soulProfs').querySelectorAll('.soul-prof')) {
    b.addEventListener('click', () => { soulSel = b.dataset.id; chargerSoul(); });
  }
}

function chargerSoul() {
  const p = PERSONAS.find((x) => x.id === soulSel);
  $('#soulTexte').value = soulEffectif(soulSel);
  $('#soulEtat').textContent = soulPersonnalise(soulSel)
    ? `✎ Personnalité personnalisée pour ${p.nom} (sur cet appareil).`
    : `Personnalité par défaut de ${p.nom}.`;
  const ap = $('#apercuProf');
  if (ap) ap.textContent = p.nom;
  rendreSoulProfs();
}

$('#soulSave').addEventListener('click', () => {
  definirSoul(soulSel, $('#soulTexte').value);
  $('#soulEtat').textContent = 'Enregistré ✓';
  setTimeout(chargerSoul, 900);
});
$('#soulReset').addEventListener('click', () => { reinitialiserSoul(soulSel); chargerSoul(); });
$('#soulExport').addEventListener('click', async () => {
  const bloc = exporterSouls();
  try {
    await navigator.clipboard.writeText(bloc);
    $('#soulEtat').textContent = 'Copié ✓ — colle ce bloc dans web/config.js pour l’appliquer à tous les testeurs.';
  } catch {
    $('#soulTexte').value = bloc;
    $('#soulEtat').textContent = 'Copie auto impossible : sélectionne le texte ci-dessus et copie-le manuellement.';
  }
});

chargerSoul();

/* --- Onglet « Personnalité & valeurs » : bascule Charte / Soul ------------ */
for (const t of document.querySelectorAll('.pv-tab')) {
  t.addEventListener('click', () => {
    for (const x of document.querySelectorAll('.pv-tab')) x.classList.toggle('actif', x === t);
    for (const pn of document.querySelectorAll('.pv-panneau')) pn.hidden = pn.id !== t.dataset.cible;
  });
}

/* --- Charte / valeurs de l'école (tous les profs) ------------------------- */

function chargerCharte() {
  $('#charteTexte').value = charteEffective();
  $('#charteEtat').textContent = chartePersonnalisee()
    ? '✎ Charte personnalisée sur cet appareil.'
    : 'Charte par défaut de l’école.';
}
$('#charteSave').addEventListener('click', () => {
  definirCharte($('#charteTexte').value);
  $('#charteEtat').textContent = 'Enregistré ✓';
  setTimeout(chargerCharte, 900);
});
$('#charteReset').addEventListener('click', () => { reinitialiserCharte(); chargerCharte(); });

/* --- Tout réinitialiser (soul de tous les profs + charte) ----------------- */
$('#pvResetTout').addEventListener('click', () => {
  if (!confirm('Revenir aux réglages d’origine (personnalités de tous les profs + charte de l’école) sur cet appareil ?')) return;
  for (const p of PERSONAS) reinitialiserSoul(p.id);
  reinitialiserCharte();
  chargerSoul();
  chargerCharte();
});

/* --- Aperçu : envoie une question au tuteur avec soul + charte réglés ------ */
$('#apercuGo').addEventListener('click', async () => {
  const p = PERSONAS.find((x) => x.id === soulSel);
  const q = $('#apercuQ').value.trim();
  const rep = $('#apercuRep');
  const btn = $('#apercuGo');
  if (!q) { rep.hidden = false; rep.textContent = 'Écris d’abord une question à tester.'; return; }
  btn.disabled = true;
  const libelle = btn.textContent;
  btn.textContent = '…';
  rep.hidden = false;
  rep.textContent = `${p.nom} réfléchit…`;
  try {
    const data = await poserQuestion(q, {
      prof: { nom: p.nom, style: p.style, tagline: p.tagline, sexe: p.sexe, soul: soulEffectif(p.id) },
      charte: charteEffective(),
    });
    const src = data.source === 'llm' ? 'tuteur en ligne'
      : data.source === 'hors-ligne' ? 'hors-ligne (aucun tuteur branché — réponse générique)'
      : data.source === 'erreur' ? `erreur : ${data.erreur ?? 'injoignable'}`
      : data.source;
    rep.innerHTML = '';
    rep.append(document.createTextNode(data.reponse || '(réponse vide)'));
    const s = document.createElement('span');
    s.className = 'src';
    s.textContent = `— source : ${src}`;
    rep.append(s);
  } catch (e) {
    rep.textContent = 'Impossible d’obtenir une réponse : ' + String(e?.message ?? e);
  } finally {
    btn.disabled = false;
    btn.textContent = libelle;
  }
});
$('#charteExport').addEventListener('click', async () => {
  const bloc = exporterCharte();
  try {
    await navigator.clipboard.writeText(bloc);
    $('#charteEtat').textContent = 'Copié ✓ — colle ce bloc dans web/config.js pour l’appliquer à tous les testeurs.';
  } catch {
    $('#charteTexte').value = bloc;
    $('#charteEtat').textContent = 'Copie auto impossible : sélectionne le texte ci-dessus et copie-le manuellement.';
  }
});
chargerCharte();
