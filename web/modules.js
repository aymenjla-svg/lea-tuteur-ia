// Léa — modules d'apprentissage (page d'accueil). Chaque module regroupe un ou
// plusieurs objectifs du curriculum de physique (cycle 4, BO) et porte son
// pourcentage d'avancement, calculé depuis la maîtrise persistée (localStorage).
//
// v1 : 3 modules « actifs » (contenu moteur prêt) + des modules « à venir »
// (verrouillés) pour donner à voir l'architecture modulaire et la largeur du
// programme. Le % d'un module actif = maîtrise de son objectif principal.

export const MODULES = [
  {
    id: 'mouvement',
    titre: 'Mouvement & vitesse',
    icone: '🏃',
    couleur: '#4a90d9',
    resume: 'Relier distance, durée et vitesse. Calculer une vitesse moyenne.',
    theme: 'Mouvements et interactions',
    objectifPrincipal: 'obj-vitesse',
    objectifs: ['obj-vitesse-relation', 'obj-vitesse'],
  },
  {
    id: 'poids',
    titre: 'Poids & masse',
    icone: '⚖️',
    couleur: '#e0a83e',
    resume: 'Distinguer le poids de la masse et calculer un poids (P = m·g).',
    theme: 'Mouvements et interactions',
    objectifPrincipal: 'obj-poids',
    objectifs: ['obj-poids'],
  },
  {
    id: 'electricite',
    titre: 'Électricité — loi d’Ohm',
    icone: '⚡',
    couleur: '#8e5bd0',
    resume: 'Relier tension, résistance et intensité avec la loi d’Ohm.',
    theme: 'L’énergie, ses transferts et ses conversions',
    objectifPrincipal: 'obj-ohm',
    objectifs: ['obj-ohm'],
  },
  {
    id: 'matiere',
    titre: 'États & masse volumique',
    icone: '🧪',
    couleur: '#3fae8f',
    resume: 'Distinguer les matériaux et calculer une masse volumique (ρ = m/V).',
    theme: 'Organisation et transformations de la matière',
    objectifPrincipal: 'obj-masse-volumique',
    objectifs: ['obj-masse-volumique'],
  },
  {
    id: 'energie',
    titre: 'Énergie & puissance',
    icone: '🔋',
    couleur: '#e5744d',
    resume: 'Relier tension, intensité et puissance électrique (P = U·I).',
    theme: 'L’énergie, ses transferts et ses conversions',
    objectifPrincipal: 'obj-puissance',
    objectifs: ['obj-puissance'],
  },
  {
    id: 'signaux',
    titre: 'Signaux & lumière',
    icone: '🔦',
    couleur: '#d15ea0',
    resume: 'Son et lumière : propagation et vitesse d’un signal (v = d/t).',
    theme: 'Des signaux pour observer et communiquer',
    objectifPrincipal: 'obj-signaux',
    objectifs: ['obj-signaux'],
  },
];

const CLE = 'lea.progress.v1';

/** Charge la table {objectif_id: pourcentage 0..100} depuis localStorage. */
export function chargerProgress() {
  try {
    return JSON.parse(localStorage.getItem(CLE) ?? '{}') || {};
  } catch {
    return {};
  }
}

/**
 * Enregistre le meilleur pourcentage atteint pour un objectif (jamais
 * régressif). Renvoie le GAIN de points (0 si pas de progrès) — sert à l'XP.
 */
export function majProgress(objectifId, pct) {
  if (!objectifId) return 0;
  const p = chargerProgress();
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  const ancien = p[objectifId] ?? 0;
  if (v > ancien) {
    p[objectifId] = v;
    try {
      localStorage.setItem(CLE, JSON.stringify(p));
    } catch {
      /* stockage indisponible : on ignore, la session reste fonctionnelle */
    }
    return v - ancien;
  }
  return 0;
}

/** Pourcentage d'avancement d'un module (0..100). */
export function progressModule(module, progress = chargerProgress()) {
  if (module.verrouille) return 0;
  return progress[module.objectifPrincipal] ?? 0;
}

/** Avancement global (moyenne des modules actifs), pour l'en-tête d'accueil. */
export function progressGlobal(progress = chargerProgress()) {
  const actifs = MODULES.filter((m) => !m.verrouille);
  if (!actifs.length) return 0;
  const somme = actifs.reduce((s, m) => s + progressModule(m, progress), 0);
  return Math.round(somme / actifs.length);
}
