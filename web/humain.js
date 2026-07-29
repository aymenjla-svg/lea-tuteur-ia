// Léa — « le grain d'humanité » : phrases variées, contextuelles, jamais
// robotiques. But : que l'élève ait l'impression d'un vrai prof en face —
// accueil parlé selon l'heure, ouverture/clôture de cours, encouragements.
// Tout est tiré au hasard pour que ça change à chaque fois.

const pick = (a) => a[Math.floor(Math.random() * a.length)];

/**
 * Accorde en genre les mots écrits en forme inclusive « base·suffixe »
 * (ex. « prêt·e », « bloqué·e », « courageux·se », « bon·ne ») selon le sexe
 * de l'élève. 'f' → base+suffixe (prête) ; sinon → base seule (prêt). Ainsi la
 * voix ne lit jamais le point médian et le prof s'adresse correctement à l'élève.
 */
export function genrer(texte, sexe) {
  if (!texte) return texte;
  return String(texte).replace(/(\p{L}+)·(\p{L}+)/gu, (_, base, suf) => {
    if (sexe !== 'f') return base; // masculin / non précisé → forme de base
    // Féminin : on applique le suffixe en gérant les alternances courantes.
    if (suf === 'se' && /x$/i.test(base)) return base.replace(/x$/i, '') + 'se';      // -eux → -euse
    if (suf === 've' && /f$/i.test(base)) return base.replace(/f$/i, '') + 've';        // -if → -ive
    if (suf === 'ère' && /er$/i.test(base)) return base.replace(/er$/i, '') + 'ère';    // -er → -ère
    if (suf === 'rice' && /eur$/i.test(base)) return base.replace(/eur$/i, '') + 'rice'; // -eur → -rice
    return base + suf;                                                                   // régulier : prêt·e → prête, bon·ne → bonne
  });
}

/** matin / aprem / soir / nuit selon l'heure locale. */
export function momentJournee(h = new Date().getHours()) {
  return h < 5 ? 'nuit' : h < 12 ? 'matin' : h < 18 ? 'aprem' : h < 22 ? 'soir' : 'nuit';
}

const SALUTS = {
  matin: [
    'Bonjour {n} ! Bien dormi ?',
    'Salut {n} ! Prêt·e à réviser de bonne heure ?',
    'Coucou {n} ! En forme ce matin ?',
    'Bonjour {n} ! Une petite session avant les cours ?',
    'Hey {n} ! Le café est chaud, on s’y met ?',
  ],
  aprem: [
    'Bonjour {n} ! Tu passes une bonne après-midi ?',
    'Salut {n} ! L’école est finie, on enchaîne un peu de physique ?',
    'Re {n} ! Bien mangé ce midi ? On révise un coup ?',
    'Coucou {n} ! Prêt·e pour un petit défi cet après-midi ?',
    'Hey {n} ! On profite de l’aprèm pour progresser ?',
  ],
  soir: [
    'Bonsoir {n} ! On fait une session du soir ?',
    'Bonsoir {n} ! Après le dîner, un peu de physique, ça te dit ?',
    'Salut {n} ! Encore un peu d’énergie pour réviser ce soir ?',
    'Bonsoir {n} ! On termine la journée en beauté ?',
    'Coucou {n} ! Une dernière révision avant de souffler ?',
  ],
  nuit: [
    'Il se fait tard, {n} ! Une petite révision avant de dormir ?',
    'Coucou {n} ! Séance nocturne ? Je suis là, tranquille.',
    'Bonsoir {n} ! Courageux·se de réviser à cette heure — j’aime ça !',
    'Encore debout, {n} ? Allez, un petit coup et au lit.',
  ],
};

/** Salutation de retour, variée et adaptée à l'heure. */
export function salutRetour(prenom, h) {
  const n = prenom || 'toi';
  return pick(SALUTS[momentJournee(h)]).replaceAll('{n}', n);
}

const REPRISES = [
  'On reprend « {t} » là où tu t’étais arrêté·e ?',
  'Tu veux qu’on continue « {t} » ?',
  'Prêt·e à replonger dans « {t} » ?',
  'On retourne voir « {t} » ensemble ?',
];
const REPRISES_NEUF = [
  'Par quelle porte on commence ?',
  'Choisis ta classe, je te suis.',
  'Alors, on ouvre quelle porte aujourd’hui ?',
];
export function reprise(titre) {
  return titre ? pick(REPRISES).replaceAll('{t}', titre) : pick(REPRISES_NEUF);
}

const INTROS = [
  'Allez {n}, aujourd’hui on attaque « {t} ». Prêt·e ? C’est parti !',
  'Installe-toi bien {n}. On va voir « {t} » ensemble, tranquillement.',
  'Ça fait plaisir de t’avoir en cours, {n} ! Au programme : « {t} ». On y va.',
  '{n}, respire un coup… et on plonge dans « {t} ». Je t’explique tout, pas à pas.',
  'Prêt·e {n} ? « {t} », ça peut faire peur, mais tu vas voir, c’est logique.',
  'Salut {n} ! Ferme les onglets, sors une feuille : on démarre « {t} ».',
];
export function introCours(prenom, titre) {
  return pick(INTROS).replaceAll('{n}', prenom || 'toi').replaceAll('{t}', titre || 'ce cours');
}

const CLOTURES = [
  'Voilà {n}, tu as fini le cours sur « {t} ». Franchement, bien joué !',
  'Et hop, « {t} », c’est dans la poche {n}. Beau boulot ! On s’entraîne ?',
  'Super travail {n} ! Maintenant on met tout ça en pratique avec quelques exercices.',
  'Tu as tenu jusqu’au bout {n} — c’est ça qui compte. On passe aux exercices ?',
  'Beau parcours {n} ! Le cours « {t} » est bouclé. À toi de jouer maintenant.',
];
export function clotureCours(prenom, titre) {
  return pick(CLOTURES).replaceAll('{n}', prenom || 'toi').replaceAll('{t}', titre || 'ce cours');
}

const BRAVOS = ['Bravo {n} !', 'Exact, {n} !', 'Bien joué {n} !', 'Parfait, {n} !', 'Tu gères, {n} !', 'Nickel {n} !', 'Yes {n}, c’est ça !'];
export function felicite(prenom) {
  return pick(BRAVOS).replaceAll('{n}', prenom || '');
}

const COURAGE = ['Pas grave {n}, on réessaie.', 'Presque {n} ! Regarde encore.', 'T’inquiète {n}, c’est en se trompant qu’on apprend.', 'Doucement {n}, reprends étape par étape.'];
export function courage(prenom) {
  return pick(COURAGE).replaceAll('{n}', prenom || '');
}

const AUREVOIRS = [
  'À bientôt {n} ! Repose-toi bien.',
  'Bravo pour aujourd’hui {n}. Reviens quand tu veux, je serai là.',
  'C’était chouette {n} ! À très vite.',
  'Trop bien joué {n} ! On continue la prochaine fois.',
];
export function auRevoir(prenom) {
  return pick(AUREVOIRS).replaceAll('{n}', prenom || 'toi');
}
