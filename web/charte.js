// Léa — « Charte de l'École » : les VALEURS / l'éthique communes à TOUS les
// profs, sorties du code et éditables dans l'admin. Elles s'ajoutent au « soul »
// de chaque prof (souls.js) dans le prompt du tuteur.
//
// ⚠️ Ce n'est PAS un blanc-seing : le périmètre programme (physique), le filet
// de sécurité (détresse/violence) et le format restent des garde-fous DURS, en
// dur côté serveur. La charte ne peut que préciser le TON et les valeurs.
//
// Résolution (du plus fort au plus faible) :
//   1) surcharge LOCALE (localStorage, éditée dans l'admin sur cet appareil)
//   2) surcharge PARTAGÉE (window.LEA_CHARTE dans config.js, vaut pour tous)
//   3) charte par défaut ci-dessous

const CLE = 'lea.charte.v1';

export const CHARTE_DEFAUT =
  'À l’École de Léa, on croit que chaque élève peut réussir. Nos valeurs :\n' +
  '- Bienveillance avant tout : on encourage, on ne juge jamais, on ne se moque jamais. L’erreur est une étape normale de l’apprentissage.\n' +
  '- On corrige les idées fausses avec douceur, sans jamais valider une erreur.\n' +
  '- On explique clairement et concrètement : phrases courtes, exemples de la vie quotidienne, on va à l’essentiel (2 à 5 phrases).\n' +
  '- On respecte le rythme de l’élève et on valorise ses efforts.\n' +
  '- Sécurité : jamais d’expérience dangereuse ; on n’expérimente qu’avec des piles et sous la supervision d’un adulte.\n' +
  '- On reste dans le programme de physique : si la question sort du sujet, on le dit gentiment et on ramène au cours.';

/** Charte partagée (config.js → window.LEA_CHARTE), sinon ''. */
function chartePartagee() {
  const c = typeof window !== 'undefined' ? window.LEA_CHARTE : null;
  return typeof c === 'string' ? c : '';
}

/** Surcharge locale de CET appareil (éditée dans l'admin), sinon ''. */
export function charteLocale() {
  try { return localStorage.getItem(CLE) || ''; } catch { return ''; }
}

/** Charte EFFECTIVE envoyée au tuteur : locale > partagée > défaut. */
export function charteEffective() {
  return charteLocale().trim() || chartePartagee().trim() || CHARTE_DEFAUT;
}

/** Enregistre la charte locale (admin). Vide → retour au défaut. */
export function definirCharte(texte) {
  const t = String(texte ?? '').trim();
  try { if (t) localStorage.setItem(CLE, t); else localStorage.removeItem(CLE); } catch { /* indispo */ }
}

/** Supprime la surcharge locale (retour au défaut / partagé). */
export function reinitialiserCharte() {
  try { localStorage.removeItem(CLE); } catch { /* indispo */ }
}

/** Vrai si la charte a été personnalisée sur cet appareil. */
export function chartePersonnalisee() {
  return !!charteLocale().trim();
}

/** Bloc à coller dans web/config.js pour appliquer la charte à tous les testeurs. */
export function exporterCharte() {
  return 'window.LEA_CHARTE = ' + JSON.stringify(charteEffective()) + ';';
}
