// Léa — suivi d'activité (localStorage) pour le tableau de bord éducateur.
// Chaque réponse (réussie/ratée + erreur-type) est enregistrée par objectif,
// afin que le prof voie l'activité RÉELLE sur l'appareil (v1 mono-appareil ; le
// multi-élèves viendra avec le backend). Aucune donnée ne quitte l'appareil.

const CLE = 'lea.suivi.v1';

/** Libellés lisibles des erreurs-types (partagés app ↔ dashboard). */
export const ERREUR_LIB = {
  multiplie_au_lieu_de_diviser: 'multiplier au lieu de diviser',
  inverse_division: 'division inversée',
  inverse_relation: 'relation inversée',
  additionne_au_lieu_de_multiplier: 'additionner au lieu de multiplier',
  confond_masse_poids: 'confusion masse / poids',
  oubli_conversion_duree: 'durée non convertie',
  ecart_numerique: 'écart de calcul',
  reponse_non_numerique: 'réponse non numérique',
};

function lire() {
  try {
    return JSON.parse(localStorage.getItem(CLE) ?? '{}') || {};
  } catch {
    return {};
  }
}
function ecrire(o) {
  try {
    localStorage.setItem(CLE, JSON.stringify(o));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

/**
 * Enregistre une réponse pour un objectif.
 * @param {string} objectifId
 * @param {boolean} correct
 * @param {string=} erreurTypeId
 * @param {string=} jour  ISO (AAAA-MM-JJ) ; défaut = aujourd'hui.
 */
export function enregistrerReponse(objectifId, correct, erreurTypeId, jour) {
  if (!objectifId) return;
  const o = lire();
  const e = (o[objectifId] ??= { tentatives: 0, reussis: 0, erreurs: {}, derniere: '' });
  e.tentatives += 1;
  if (correct) e.reussis += 1;
  else if (erreurTypeId) e.erreurs[erreurTypeId] = (e.erreurs[erreurTypeId] ?? 0) + 1;
  e.derniere = jour ?? new Date().toISOString().slice(0, 10);
  ecrire(o);
}

/** Renvoie le suivi brut : { [objectifId]: {tentatives, reussis, erreurs, derniere} }. */
export function lireSuivi() {
  return lire();
}

/** Efface le suivi (bouton « réinitialiser » du tableau de bord). */
export function effacerSuivi() {
  ecrire({});
}
