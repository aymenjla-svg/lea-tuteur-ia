// Tableau de bord éducateur — lit /dashboard (projection télémétrie, D13).

const $ = (s) => document.querySelector(s);

function carte(valeur, libelle) {
  return `<div class="carte"><div class="val">${valeur}</div><div class="lib">${libelle}</div></div>`;
}

function lignes(conteneur, entrees, max) {
  const el = $(conteneur);
  if (entrees.length === 0) {
    el.innerHTML = '<p class="vide">Aucune donnée pour l’instant.</p>';
    return;
  }
  const plafond = Math.max(1, max ?? Math.max(...entrees.map(([, n]) => n)));
  el.innerHTML = entrees
    .map(
      ([nom, n]) =>
        `<div class="ligne"><span class="nom">${nom}</span>` +
        `<span class="jauge"><span style="width:${Math.round((n / plafond) * 100)}%"></span></span>` +
        `<span class="n">${n}</span></div>`,
    )
    .join('');
}

// Moteur embarqué (GitHub Pages) ou API HTTP (backend) — cf. app.js.
const EMBARQUE = typeof window !== 'undefined' && window.LeaEngine;

async function charger() {
  let tb;
  try {
    if (EMBARQUE) {
      // Sans backend, on amorce une session de démo pour peupler la télémétrie.
      await window.LeaEngine.amorcerDemo();
      tb = window.LeaEngine.dashboard();
    } else {
      tb = await (await fetch('/dashboard')).json();
    }
  } catch (e) {
    $('#cartes').innerHTML = `<p class="vide">Erreur : ${e.message}</p>`;
    return;
  }
  $('#cartes').innerHTML = [
    carte(tb.tentatives_total, 'tentatives'),
    carte(`${Math.round((tb.taux_reussite ?? 0) * 100)} %`, 'taux de réussite'),
    carte(tb.sessions, 'sessions'),
    carte(tb.tours_dialogue, 'tours de dialogue'),
    carte(tb.alertes, 'alertes'),
    carte(tb.alertes_critiques, 'dont critiques'),
  ].join('');

  lignes('#erreurs', Object.entries(tb.erreurs_types ?? {}).sort((a, b) => b[1] - a[1]));
  lignes('#events', Object.entries(tb.evenements ?? {}).sort((a, b) => b[1] - a[1]));
}

$('#rafraichir').addEventListener('click', charger);
charger();
