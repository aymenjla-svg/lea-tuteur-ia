// Léa — « le grain d'humanité » : phrases variées, contextuelles, jamais
// robotiques. But : que l'élève ait l'impression d'un vrai prof en face —
// accueil parlé selon l'heure, ouverture/clôture de cours, encouragements.
// Tout est tiré au hasard pour que ça change à chaque fois.

const pick = (a) => a[Math.floor(Math.random() * a.length)];

/** matin / aprem / soir / nuit selon l'heure locale. */
export function momentJournee(h = new Date().getHours()) {
  return h < 5 ? 'nuit' : h < 12 ? 'matin' : h < 18 ? 'aprem' : h < 22 ? 'soir' : 'nuit';
}

const SALUTS = {
  matin: [
    'Bonjour {n} ! Bien dormi ?',
    'Salut {n} ! Prêt à réviser de bonne heure ?',
    'Coucou {n} ! En forme ce matin ?',
    'Bonjour {n} ! Une petite session avant les cours ?',
    'Hey {n} ! Le café est chaud, on s’y met ?',
  ],
  aprem: [
    'Bonjour {n} ! Tu passes une bonne après-midi ?',
    'Salut {n} ! L’école est finie, on enchaîne un peu de physique ?',
    'Re {n} ! Bien mangé ce midi ? On révise un coup ?',
    'Coucou {n} ! Prêt pour un petit défi cet après-midi ?',
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
    'Bonsoir {n} ! Courageux de réviser à cette heure — j’aime ça !',
    'Encore debout, {n} ? Allez, un petit coup et au lit.',
  ],
};

/** Salutation de retour, variée et adaptée à l'heure. */
export function salutRetour(prenom, h) {
  const n = prenom || 'toi';
  return pick(SALUTS[momentJournee(h)]).replaceAll('{n}', n);
}

const REPRISES = [
  'On reprend « {t} » là où tu t’étais arrêté ?',
  'Tu veux qu’on continue « {t} » ?',
  'Prêt à replonger dans « {t} » ?',
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
  'Allez {n}, aujourd’hui on attaque « {t} ». Prêt ? C’est parti !',
  'Installe-toi bien {n}. On va voir « {t} » ensemble, tranquillement.',
  'Content de t’avoir en cours, {n} ! Au programme : « {t} ». On y va.',
  '{n}, respire un coup… et on plonge dans « {t} ». Je t’explique tout, pas à pas.',
  'Prêt {n} ? « {t} », ça peut faire peur, mais tu vas voir, c’est logique.',
  'Salut {n} ! Ferme les onglets, sors une feuille : on démarre « {t} ».',
];
export function introCours(prenom, titre) {
  return pick(INTROS).replaceAll('{n}', prenom || 'toi').replaceAll('{t}', titre || 'ce cours');
}

const CLOTURES = [
  'Voilà {n}, tu as fini le cours sur « {t} ». Franchement, bien joué !',
  'Et hop, « {t} », c’est dans la poche {n}. Je suis fière de toi. On s’entraîne ?',
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
  'Fière de toi {n} ! On continue la prochaine fois.',
];
export function auRevoir(prenom) {
  return pick(AUREVOIRS).replaceAll('{n}', prenom || 'toi');
}
