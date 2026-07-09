// Tableau de bord éducateur — activité RÉELLE de l'appareil (localStorage).
// v1 mono-appareil : reflète la pratique de l'élève sur ce navigateur. Le
// multi-élèves (comptes, agrégation classe) viendra avec le backend.

import { MODULES, progressModule } from './modules.js';
import { lireSuivi, ERREUR_LIB, effacerSuivi } from './suivi.js';
import { serie } from './jeu.js';
import { appliquerA11y } from './accessibilite.js';

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
