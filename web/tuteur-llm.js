// Léa — client de la fonction Edge « tuteur » (phase LLM, « lever la main »).
// Q&R libre ancrée au programme. Dégrade proprement SANS backend : le mode
// hors-ligne renvoie une aide déterministe qui ramène au cours. Le même filet
// de détresse qu'au serveur est appliqué ici (défense en profondeur, mineurs).

const CLE_URL = 'lea.tuteur.url';
const CLE_KEY = 'lea.tuteur.key';

function lireConfig() {
  const meta = (n) => document.querySelector(`meta[name="${n}"]`)?.content?.trim() || '';
  let url = '';
  let key = '';
  try {
    url = localStorage.getItem(CLE_URL) || '';
    key = localStorage.getItem(CLE_KEY) || '';
  } catch { /* localStorage indisponible */ }
  url = url || window.LEA_TUTEUR_URL || meta('lea-tuteur-url');
  key = key || window.LEA_TUTEUR_KEY || meta('lea-tuteur-key');
  return { url, key };
}

/** Vrai si un backend est configuré (sinon on tourne en mode hors-ligne). */
export function tuteurConfigure() {
  return !!lireConfig().url;
}

// Filet de détresse identique au serveur (au cas où l'appli tourne hors-ligne).
const MOTS_DETRESSE =
  /\b(suicid|me tuer|me suicider|envie de mourir|plus envie de vivre|en finir|me faire du mal|automutil|scarif|je veux mourir)\b/i;

function reponseDetresse() {
  return {
    reponse:
      'Je vois que ce n’est peut-être pas facile en ce moment, et je tiens à toi. Je ne suis ' +
      'qu’une aide pour la physique, alors s’il te plaît parle vite à un adulte de confiance ' +
      '(un parent, un professeur, l’infirmerie). En France, tu peux aussi appeler le 3114 ' +
      '(gratuit, 24h/24). Tu n’es pas seul·e.',
    tableau: [],
    dans_programme: true,
    alerte: { categorie: 'detresse', severite: 'critique', escalade_requise: true },
    source: 'securite',
  };
}

// Aide hors-ligne : on s'appuie sur ce que l'élève vient de voir. En exercice,
// on n'donne pas la réponse — on rappelle la méthode et la relation.
function reponseHorsLigne(question, contexte) {
  const pts = contexte?.points_vus ?? [];
  const rappel = pts.length ? ` Rappelle-toi : ${pts.slice(0, 2).join(' ; ')}.` : '';
  const rel = contexte?.relation ? ` La relation en jeu : ${contexte.relation}.` : '';
  const reponse = contexte?.en_exercice
    ? `Je ne te donne pas la réponse, mais voici la méthode : écris la relation, remplace par les valeurs de l’énoncé, puis calcule.${rel}${rappel} Vérifie aussi tes unités.`
    : `Bonne question ! Pour l’instant je réponds à partir du cours.${rappel}${rel} ` +
      'Reprends l’exemple résolu de la leçon, puis réessaie — et tu peux cliquer « Revoir le cours ».';
  return { reponse, tableau: [], dans_programme: true, source: 'hors-ligne' };
}

/**
 * Pose une question au tuteur.
 * @param {string} question
 * @param {object} contexte { module, moduleId, notion, relation, points_vus, en_exercice }
 * @returns {Promise<{reponse, tableau, dans_programme, alerte?, source}>}
 */
export async function poserQuestion(question, contexte = {}) {
  const q = String(question ?? '').trim();
  if (!q) return { reponse: 'Pose-moi ta question 🙂', tableau: [], dans_programme: true, source: 'vide' };
  if (MOTS_DETRESSE.test(q)) return reponseDetresse();

  const { url, key } = lireConfig();
  if (!url) return reponseHorsLigne(q, contexte);

  try {
    const headers = { 'content-type': 'application/json' };
    if (key) { headers.apikey = key; headers.authorization = `Bearer ${key}`; }
    const r = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question: q, contexte }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    return {
      reponse: String(data.reponse ?? '').slice(0, 1500) || reponseHorsLigne(q, contexte).reponse,
      tableau: Array.isArray(data.tableau) ? data.tableau : [],
      dans_programme: data.dans_programme !== false,
      ...(data.alerte ? { alerte: data.alerte } : {}),
      source: 'llm',
    };
  } catch {
    // Réseau/serveur KO → on ne laisse jamais l'élève sans réponse.
    return { ...reponseHorsLigne(q, contexte), source: 'erreur' };
  }
}
