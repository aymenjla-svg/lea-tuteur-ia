// Léa — « soul » (personnalité éditable) de chaque prof.
//
// La personnalité qui influence les réponses du LLM est SORTIE du code : chaque
// prof a un défaut (personas.js → `soul`), qu'on peut surcharger depuis l'espace
// admin (Tableau de bord → « Personnalité des profs »). Le soul effectif est
// envoyé au tuteur et injecté dans le prompt côté serveur.
//
// Priorité de résolution (du plus fort au plus faible) :
//   1) surcharge LOCALE (localStorage, éditée dans l'admin sur cet appareil)
//   2) surcharge PARTAGÉE (window.LEA_SOULS dans config.js, vaut pour tous)
//   3) défaut du persona (personas.js)

import { PERSONAS, personaParId } from './personas.js';

const CLE = 'lea.souls.v1';

function lireTous() {
  try { return JSON.parse(localStorage.getItem(CLE) || '{}') || {}; } catch { return {}; }
}

/** Soul par défaut (codé dans le persona). */
export function soulDefaut(id) {
  return personaParId(id)?.soul || '';
}

/** Soul partagé pour tous (config.js → window.LEA_SOULS), sinon ''. */
export function soulPartage(id) {
  const s = typeof window !== 'undefined' ? window.LEA_SOULS : null;
  return (s && typeof s[id] === 'string') ? s[id] : '';
}

/** Surcharge locale de CET appareil (éditée dans l'admin), sinon ''. */
export function soulLocal(id) {
  const o = lireTous();
  return typeof o[id] === 'string' ? o[id] : '';
}

/** Soul EFFECTIF utilisé pour répondre : local > partagé > défaut. */
export function soulEffectif(id) {
  return soulLocal(id) || soulPartage(id) || soulDefaut(id);
}

/** Enregistre une surcharge locale (admin). Vide → on revient au défaut. */
export function definirSoul(id, texte) {
  const o = lireTous();
  const t = String(texte ?? '').trim();
  if (t) o[id] = t; else delete o[id];
  try { localStorage.setItem(CLE, JSON.stringify(o)); } catch { /* stockage indispo */ }
}

/** Supprime la surcharge locale d'un prof (retour au défaut). */
export function reinitialiserSoul(id) {
  const o = lireTous();
  delete o[id];
  try { localStorage.setItem(CLE, JSON.stringify(o)); } catch { /* indispo */ }
}

/** Vrai si ce prof a une personnalité personnalisée sur cet appareil. */
export function soulPersonnalise(id) {
  return !!soulLocal(id);
}

/**
 * Bloc à coller dans web/config.js pour appliquer les souls à TOUS les testeurs
 * (comme l'URL du tuteur). Reprend l'état effectif de chaque prof.
 */
export function exporterSouls() {
  const out = {};
  for (const p of PERSONAS) out[p.id] = soulEffectif(p.id);
  return 'window.LEA_SOULS = ' + JSON.stringify(out, null, 2) + ';';
}
