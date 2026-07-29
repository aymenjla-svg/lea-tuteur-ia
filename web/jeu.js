// Léa — gamification légère + adaptation à l'âge (classe). Tout est local
// (localStorage) : XP, niveau, série de jours, étoiles par module, et le
// « vibe » d'interface selon la classe choisie (5ᵉ plus ludique → 3ᵉ plus sobre).

const CLE_JEU = 'lea.jeu.v1';
const CLE_NIVEAU = 'lea.niveau.v1';

/** Niveaux scolaires (cycle 4) + « vibe » d'UI + couleur de badge (façon manuel). */
export const NIVEAUX = [
  { id: '6e', label: '6ᵉ', age: 11, vibe: 'jeune', couleur: '#14c8d4' },
  { id: '5e', label: '5ᵉ', age: 12, vibe: 'jeune', couleur: '#43c463' },
  { id: '4e', label: '4ᵉ', age: 13, vibe: 'moyen', couleur: '#f5b400' },
  { id: '3e', label: '3ᵉ', age: 14, vibe: 'grand', couleur: '#a855f7' },
];

export function niveauCourant() {
  const id = localStorage.getItem(CLE_NIVEAU);
  return NIVEAUX.find((n) => n.id === id) ?? null;
}
export function definirNiveau(id) {
  localStorage.setItem(CLE_NIVEAU, id);
  appliquerVibe();
}
/** Pose le `data-vibe` sur <html> (pilote l'échelle/rondeur/ludique en CSS). */
export function appliquerVibe() {
  const n = niveauCourant();
  document.documentElement.dataset.vibe = n?.vibe ?? 'moyen';
}

function lire() {
  try {
    return JSON.parse(localStorage.getItem(CLE_JEU) ?? '{}') || {};
  } catch {
    return {};
  }
}
function ecrire(o) {
  try {
    localStorage.setItem(CLE_JEU, JSON.stringify(o));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

export function xp() {
  return lire().xp ?? 0;
}
export function ajouterXp(n) {
  if (n <= 0) return;
  const o = lire();
  o.xp = (o.xp ?? 0) + Math.round(n);
  ecrire(o);
}
/** Niveau de jeu : 1 niveau tous les 100 XP. */
export function niveauJeu() {
  return 1 + Math.floor(xp() / 100);
}
/** Progression [0..1] dans le niveau de jeu courant (pour une barre). */
export function progNiveauJeu() {
  return (xp() % 100) / 100;
}

/** Met à jour la série de jours consécutifs. Renvoie la série courante. */
export function majSerie(aujourdhui = isoJour(new Date())) {
  const o = lire();
  const hier = isoJour(new Date(Date.parse(aujourdhui) - 86400000));
  if (o.dernierJour === aujourdhui) {
    // déjà compté aujourd'hui
  } else if (o.dernierJour === hier) {
    o.serie = (o.serie ?? 0) + 1;
  } else {
    o.serie = 1;
  }
  o.dernierJour = aujourdhui;
  ecrire(o);
  return o.serie ?? 1;
}
export function serie() {
  return lire().serie ?? 0;
}

function isoJour(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Nombre d'étoiles (0..3) d'un module selon son pourcentage. */
export function etoiles(pct) {
  if (pct >= 100) return 3;
  if (pct >= 80) return 2;
  if (pct > 0) return 1;
  return 0;
}
