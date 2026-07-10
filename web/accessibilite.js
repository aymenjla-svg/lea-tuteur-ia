// Léa — réglages d'accessibilité (localStorage), appliqués sur <html>.
// Trois leviers concrets et robustes pour le collège (dont élèves à PAP/DYS) :
//  - taille du texte (petit / normal / grand)
//  - « lecture facilitée » (police standard + espacement lettres/mots/lignes)
//  - contraste élevé
// La lecture à voix haute est déjà assurée par la synthèse vocale (voix.js).

const CLE = 'lea.a11y.v1';
// vitesseVoix : multiplicateur global de débit de la voix du prof (1 = normal).
// Défaut légèrement relevé (1.15) — le prof parle un peu plus vite ; réglable.
const DEFAUT = { taille: 'normal', lecture: 'off', contraste: 'off', vitesseVoix: 1.15 };

export function lireA11y() {
  try {
    return { ...DEFAUT, ...(JSON.parse(localStorage.getItem(CLE) ?? '{}') || {}) };
  } catch {
    return { ...DEFAUT };
  }
}

/** Pose les attributs data-* sur <html> (pilotent le CSS). */
export function appliquerA11y(s = lireA11y()) {
  const r = document.documentElement;
  r.dataset.taille = s.taille;
  r.dataset.lecture = s.lecture;
  r.dataset.contraste = s.contraste;
}

/** Met à jour un ou plusieurs réglages, persiste et applique. */
export function definirA11y(patch) {
  const s = { ...lireA11y(), ...patch };
  try {
    localStorage.setItem(CLE, JSON.stringify(s));
  } catch {
    /* stockage indisponible : on applique quand même */
  }
  appliquerA11y(s);
  return s;
}
