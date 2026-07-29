// Léa — client de la fonction Edge « tuteur » (phase LLM, « lever la main »).
// Q&R libre ancrée au programme. Dégrade proprement SANS backend : le mode
// hors-ligne renvoie une aide déterministe qui ramène au cours. Le même filet
// de détresse qu'au serveur est appliqué ici (défense en profondeur, mineurs).

const CLE_URL = 'lea.tuteur.url';
const CLE_KEY = 'lea.tuteur.key';
const CLE_ELEVE = 'lea.eleve.ref';

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'x' + Date.now() + Math.round(Math.random() * 1e9));
const SESSION_ID = uid(); // pseudonyme, régénéré à chaque chargement

// Référence élève pseudonyme et stable (aucune donnée personnelle).
function eleveRef() {
  try {
    let r = localStorage.getItem(CLE_ELEVE);
    if (!r) { r = uid(); localStorage.setItem(CLE_ELEVE, r); }
    return r;
  } catch { return SESSION_ID; }
}

// Centres d'intérêt de l'élève (posés par interets.js) — passés au tuteur pour
// personnaliser ses exemples. Lecture directe (aucune dépendance de module).
function lireInterets() {
  try { const a = JSON.parse(localStorage.getItem('lea.interets.v1') ?? '[]'); return Array.isArray(a) ? a.slice(0, 8) : []; }
  catch { return []; }
}

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
 * @param {object} contexte { module, moduleId, notion, relation, points_vus, en_exercice, prenom, sexe, prof }
 * @param {{role:'eleve'|'lea', texte:string}[]} historique tours précédents (mémoire courte)
 * @returns {Promise<{reponse, tableau, dans_programme, alerte?, source}>}
 */
export async function poserQuestion(question, contexte = {}, historique = []) {
  const q = String(question ?? '').trim();
  if (!q) return { reponse: 'Pose-moi ta question 🙂', tableau: [], dans_programme: true, source: 'vide' };
  if (MOTS_DETRESSE.test(q)) return reponseDetresse();

  const { url, key } = lireConfig();
  if (!url) return reponseHorsLigne(q, contexte);

  try {
    const headers = { 'content-type': 'application/json' };
    if (key) { headers.apikey = key; headers.authorization = `Bearer ${key}`; }
    // On ne renvoie que les derniers tours (mémoire courte, données minimisées).
    const hist = (Array.isArray(historique) ? historique : [])
      .filter((m) => m && (m.role === 'eleve' || m.role === 'lea') && m.texte)
      .slice(-8)
      .map((m) => ({ role: m.role, texte: String(m.texte).slice(0, 800) }));
    const r = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question: q,
        contexte: { ...contexte, interets: lireInterets(), session_id: SESSION_ID, eleve_ref: eleveRef() },
        historique: hist,
      }),
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
  } catch (e) {
    // Réseau/serveur KO → on ne laisse jamais l'élève sans réponse, mais on
    // remonte l'erreur pour le diagnostic.
    return { ...reponseHorsLigne(q, contexte), source: 'erreur', erreur: String(e?.message ?? e) };
  }
}

/** Teste la connexion au tuteur et renvoie un diagnostic clair. */
export async function testerTuteur() {
  const { url, key } = lireConfig();
  if (!url) return { ok: false, detail: 'Aucune URL enregistrée. Colle l’URL de la fonction puis « Connecter ».' };
  try {
    const headers = { 'content-type': 'application/json' };
    if (key) { headers.apikey = key; headers.authorization = `Bearer ${key}`; }
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ question: 'test', contexte: {} }) });
    if (!r.ok) {
      let t = '';
      try { t = (await r.text()).slice(0, 160); } catch { /* corps illisible */ }
      const aides = {
        401: 'Non autorisé → désactive « Verify JWT » sur la fonction, OU colle la clé anon.',
        403: 'Interdit → vérifie la clé anon / les réglages de la fonction.',
        404: 'Introuvable → l’URL est fausse (souvent il manque /functions/v1/tuteur).',
        500: 'La fonction plante → vérifie les secrets (clé Groq, LLM_MODEL) côté Supabase.',
      };
      return { ok: false, status: r.status, detail: `Erreur ${r.status}. ${aides[r.status] ?? ''} ${t}`.trim() };
    }
    const d = await r.json().catch(() => null);
    return { ok: true, status: r.status, detail: d?.reponse ? `OK ✅ Léa a répondu : « ${String(d.reponse).slice(0, 90)}… »` : 'Réponse reçue (format inattendu).' };
  } catch (e) {
    return { ok: false, detail: 'Injoignable (réseau ou CORS bloqué) : ' + String(e?.message ?? e) };
  }
}
