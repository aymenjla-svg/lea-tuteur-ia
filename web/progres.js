// Léa — HISTORIQUE de progression : enregistre chaque jour un instantané de la
// maîtrise (global + par module) pour montrer plus tard « avant → maintenant ».
//
// 100 % ADDITIF : un seul instantané par jour dans `lea.histo.v1`. Ne modifie
// aucun contenu ; se contente de LIRE la progression existante (modules.js).
// Chargé par index.html (une ligne). La vue de restitution est dans le
// tableau de bord (progres-dash.js).

import { MODULES, chargerProgress, progressModule, progressGlobal } from './modules.js';

const CLE = 'lea.histo.v1';
const MAX = 120; // ~4 mois d'instantanés quotidiens

const jour = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function lireHisto() { try { const a = JSON.parse(localStorage.getItem(CLE) ?? '[]'); return Array.isArray(a) ? a : []; } catch { return []; } }

/** Enregistre l'instantané du jour (une fois par jour). Renvoie l'historique. */
export function enregistrerInstantane() {
  const histo = lireHisto();
  const auj = jour();
  if (histo.length && histo[histo.length - 1].date === auj) return histo; // déjà fait aujourd'hui
  const prog = chargerProgress();
  const mods = {};
  for (const m of MODULES) if (!m.verrouille) mods[m.id] = progressModule(m, prog);
  histo.push({ date: auj, global: progressGlobal(prog), mods });
  while (histo.length > MAX) histo.shift();
  try { localStorage.setItem(CLE, JSON.stringify(histo)); } catch { /* stockage indispo */ }
  return histo;
}

function init() { try { enregistrerInstantane(); } catch { /* non bloquant */ } }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
