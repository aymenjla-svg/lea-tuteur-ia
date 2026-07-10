// Léa — profil élève (local à l'appareil, aucune donnée envoyée). Sert à
// l'accueil personnalisé « l'École de Léa » : Léa connaît l'élève, l'appelle
// par son prénom, le retrouve à chaque visite. (Comptes serveur = étape future.)

const CLE = 'lea.profil.v1';

export function lireProfil() {
  try { return JSON.parse(localStorage.getItem(CLE) || 'null'); } catch { return null; }
}

export function profilExiste() {
  return !!lireProfil()?.prenom;
}

function ecrire(p) {
  try { localStorage.setItem(CLE, JSON.stringify(p)); } catch { /* stockage indispo */ }
  return p;
}

/** Crée le profil à la fin de l'accueil interactif. */
export function creerProfil({ prenom, classe, interets }) {
  const now = Date.now();
  return ecrire({
    prenom: String(prenom || '').trim().slice(0, 24) || 'toi',
    classe: classe || '4e',
    interets: (interets || []).slice(0, 6),
    visites: 1,
    premierAcces: now,
    dernierAcces: now,
    avantDernierAcces: 0,
  });
}

/** Met à jour la fréquentation au chargement (retour de l'élève). */
export function enregistrerVisite() {
  const p = lireProfil();
  if (!p) return null;
  const now = Date.now();
  return ecrire({ ...p, visites: (p.visites || 1) + 1, avantDernierAcces: p.dernierAcces || now, dernierAcces: now });
}

/** Mémorise le dernier module ouvert (pour « tu es prêt à reprendre … ? »). */
export function memoriserModule(id, titre) {
  const p = lireProfil();
  if (p) ecrire({ ...p, dernierModuleId: id, dernierModuleTitre: titre });
}

export function effacerProfil() {
  try { localStorage.removeItem(CLE); } catch { /* indispo */ }
}

/** Nombre de jours calendaires écoulés depuis la visite précédente. */
export function joursDepuis(p) {
  if (!p?.avantDernierAcces) return 0;
  const j = (p.dernierAcces - p.avantDernierAcces) / 86_400_000;
  return Math.floor(j);
}
