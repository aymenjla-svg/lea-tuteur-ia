// Léa — banque d'exercices VARIÉS (v1, en attendant l'échantillon du prof).
//
// But : sortir du « tout calcul de calculette ». Chaque module mélange :
//   - qcm       : QCM conceptuel, comparaison, vrai/faux, « trouve l'erreur »
//                 (une seule option `ok`), corrigé de façon déterministe.
//   - num       : petit calcul numérique (réponse = un nombre, unité optionnelle).
//   - ouvert    : question ouverte, la réponse (non déterministe) est analysée
//                 par le LLM (le prof réagit avec ses mots). Formatif : ça
//                 n'est pas « noté », ça fait réfléchir.
//
// Tout reste STRICTEMENT dans le programme (physique, cycle 4). Contenu
// facilement remplaçable quand le prof fournira ses propres exercices.

/** @typedef {{t:'qcm', enonce:string, options:{txt:string, ok?:boolean, retour?:string}[], aide?:string}} ExoQcm */
/** @typedef {{t:'num', enonce:string, valeur:number, tol?:number, unite?:string, choixUnite?:string[], aide?:string}} ExoNum */
/** @typedef {{t:'ouvert', enonce:string, attendu:string, aide?:string}} ExoOuvert */

export const EXOS = {
  // ---------------------------------------------------------------- Mouvement
  mouvement: [
    { t: 'qcm', enonce: 'Deux mobiles avancent : l’un à 50 km/h, l’autre à 50 m/s. Lequel va le plus vite ?',
      options: [
        { txt: 'Celui à 50 m/s', ok: true, retour: '50 m/s = 180 km/h, bien plus rapide !' },
        { txt: 'Celui à 50 km/h', retour: 'Attention aux unités : 50 m/s vaut 180 km/h.' },
        { txt: 'Ils vont à la même vitesse', retour: 'Non : les unités ne sont pas les mêmes.' },
      ] },
    { t: 'qcm', enonce: 'Vrai ou faux ? Si je double la distance parcourue dans la même durée, la vitesse double.',
      options: [
        { txt: 'Vrai', ok: true, retour: 'Oui : v = d/t, si d double et t reste, v double.' },
        { txt: 'Faux', retour: 'Reprends v = d/t : à durée égale, plus de distance = plus de vitesse.' },
      ] },
    { t: 'qcm', enonce: 'Un élève calcule la vitesse d’un coureur qui fait 100 m en 20 s : « v = 20 ÷ 100 = 0,2 m/s ». Où est l’erreur ?',
      options: [
        { txt: 'Il a inversé : v = d/t = 100 ÷ 20 = 5 m/s', ok: true, retour: 'Exact : la distance est en haut, la durée en bas.' },
        { txt: 'Il a oublié de convertir en km/h', retour: 'Non, le vrai souci c’est le calcul lui-même.' },
        { txt: 'Aucune erreur, 0,2 m/s est correct', retour: 'Si : il a divisé à l’envers.' },
      ] },
    { t: 'num', enonce: 'Un cycliste parcourt 60 m en 5 s. Quelle est sa vitesse ?', valeur: 12, unite: 'm/s', choixUnite: ['m/s', 'km/h', 'm', 's'], aide: 'v = d ÷ t = 60 ÷ 5.' },
    { t: 'ouvert', enonce: 'Avec tes mots : pourquoi une vitesse en km/h et une distance en km ne sont-elles pas la même chose ?',
      attendu: 'km/h est une vitesse (une distance divisée par une durée) ; km est une distance. Ce sont deux grandeurs différentes.' },
  ],

  // -------------------------------------------------------------------- Poids
  poids: [
    { t: 'qcm', enonce: 'Un astronaute part sur la Lune. Sa MASSE :',
      options: [
        { txt: 'reste la même', ok: true, retour: 'Oui : la masse (kg) ne dépend pas de l’astre.' },
        { txt: 'diminue', retour: 'C’est le poids qui diminue, pas la masse.' },
        { txt: 'augmente', retour: 'Non : la masse ne change pas en changeant d’astre.' },
      ] },
    { t: 'qcm', enonce: 'Sur la Lune, g ≈ 1,6 N/kg (contre 10 sur Terre). Le POIDS de l’astronaute :',
      options: [
        { txt: 'diminue', ok: true, retour: 'Oui : P = m × g, et g est plus petit sur la Lune.' },
        { txt: 'reste le même', retour: 'Non : P dépend de g, qui change.' },
        { txt: 'augmente', retour: 'Au contraire : g est plus faible, donc P plus petit.' },
      ] },
    { t: 'qcm', enonce: 'Vrai ou faux ? La masse se mesure en newtons.',
      options: [
        { txt: 'Faux', ok: true, retour: 'La masse est en kg ; le newton (N) mesure le poids (une force).' },
        { txt: 'Vrai', retour: 'Non : kg pour la masse, N pour le poids.' },
      ] },
    { t: 'num', enonce: 'Une valise a une masse de 3 kg. Sur Terre, g = 10 N/kg. Quel est son poids ?', valeur: 30, unite: 'N', choixUnite: ['N', 'kg', 'g', 'N/kg'], aide: 'P = m × g = 3 × 10.' },
    { t: 'ouvert', enonce: 'Explique à un camarade la différence entre la masse et le poids.',
      attendu: 'La masse est la quantité de matière (en kg), la même partout. Le poids est la force d’attraction (en N) qui dépend de l’astre (g).' },
  ],

  // -------------------------------------------------------------- Électricité
  electricite: [
    { t: 'qcm', enonce: 'Loi d’Ohm : U = R × I. Si on garde U constante et qu’on AUGMENTE R, l’intensité I :',
      options: [
        { txt: 'diminue', ok: true, retour: 'Oui : plus de résistance freine le courant.' },
        { txt: 'augmente', retour: 'Non : une grande résistance laisse passer moins de courant.' },
        { txt: 'ne change pas', retour: 'Si : I dépend de R quand U est fixée.' },
      ] },
    { t: 'qcm', enonce: 'L’intensité d’un courant électrique se mesure en :',
      options: [
        { txt: 'ampères (A)', ok: true, retour: 'Exact.' },
        { txt: 'volts (V)', retour: 'Le volt mesure la tension, pas l’intensité.' },
        { txt: 'ohms (Ω)', retour: 'L’ohm mesure la résistance.' },
        { txt: 'watts (W)', retour: 'Le watt mesure la puissance.' },
      ] },
    { t: 'qcm', enonce: 'Un élève calcule U avec R = 10 Ω et I = 2 A : « U = 10 + 2 = 12 V ». Où est l’erreur ?',
      options: [
        { txt: 'Il additionne au lieu de multiplier : U = 10 × 2 = 20 V', ok: true, retour: 'Oui : U = R × I.' },
        { txt: 'Il a pris la mauvaise unité', retour: 'Le vrai souci, c’est l’opération.' },
        { txt: 'Aucune erreur', retour: 'Si : c’est une multiplication, pas une addition.' },
      ] },
    { t: 'num', enonce: 'Une résistance de 5 Ω est traversée par une intensité de 3 A. Quelle est la tension à ses bornes ?', valeur: 15, unite: 'V', choixUnite: ['V', 'Ω', 'A', 'W'], aide: 'U = R × I = 5 × 3.' },
    { t: 'ouvert', enonce: 'À quoi sert une résistance dans un circuit électrique ?',
      attendu: 'Elle limite (freine) l’intensité du courant ; elle peut aussi transformer de l’énergie électrique en chaleur.' },
  ],

  // ------------------------------------------------------- États & ρ (matière)
  matiere: [
    { t: 'qcm', enonce: 'Un bloc de masse volumique 0,8 g/cm³ est plongé dans l’eau (1 g/cm³). Il :',
      options: [
        { txt: 'flotte', ok: true, retour: 'Oui : moins dense que l’eau → il flotte.' },
        { txt: 'coule', retour: 'Non : il est moins dense que l’eau.' },
        { txt: 'reste entre deux eaux', retour: 'Non : il remonte, il flotte.' },
      ] },
    { t: 'qcm', enonce: 'Quand l’eau liquide se transforme en vapeur, ce changement d’état s’appelle :',
      options: [
        { txt: 'la vaporisation', ok: true, retour: 'Exact (liquide → gaz).' },
        { txt: 'la fusion', retour: 'La fusion, c’est solide → liquide.' },
        { txt: 'la solidification', retour: 'Non : ça, c’est liquide → solide.' },
        { txt: 'la liquéfaction', retour: 'Non : ça, c’est gaz → liquide.' },
      ] },
    { t: 'qcm', enonce: 'Vrai ou faux ? Quand de l’eau gèle, sa masse augmente.',
      options: [
        { txt: 'Faux', ok: true, retour: 'Oui : la masse se conserve lors d’un changement d’état.' },
        { txt: 'Vrai', retour: 'Non : la masse ne change pas (elle se conserve).' },
      ] },
    { t: 'num', enonce: 'Un bloc a une masse de 300 g pour un volume de 100 cm³. Quelle est sa masse volumique ?', valeur: 3, unite: 'g/cm³', choixUnite: ['g/cm³', 'cm³', 'g', 'kg/L'], aide: 'ρ = m ÷ V = 300 ÷ 100.' },
    { t: 'ouvert', enonce: 'Un énorme bateau en acier flotte, alors qu’un simple clou en acier coule. Comment l’expliques-tu ?',
      attendu: 'Le bateau contient beaucoup d’air : sa masse volumique moyenne (acier + air) est plus faible que celle de l’eau, donc il flotte.' },
  ],

  // ------------------------------------------------------- Énergie & puissance
  energie: [
    { t: 'qcm', enonce: 'Une lampe de 60 W reste allumée 2 h. L’énergie consommée est :',
      options: [
        { txt: '120 Wh', ok: true, retour: 'Oui : E = P × t = 60 × 2.' },
        { txt: '30 Wh', retour: 'Non : on multiplie, E = P × t.' },
        { txt: '62 Wh', retour: 'Non : ce n’est pas une addition.' },
      ] },
    { t: 'qcm', enonce: 'Pendant 1 heure, quel appareil consomme le plus d’énergie ?',
      options: [
        { txt: 'Un radiateur de 2000 W', ok: true, retour: 'Oui : plus la puissance est grande, plus il consomme.' },
        { txt: 'Une lampe de 100 W', retour: 'Non : 100 W, c’est bien moins que 2000 W.' },
        { txt: 'Les deux pareil', retour: 'Non : la puissance diffère beaucoup.' },
      ] },
    { t: 'qcm', enonce: 'Vrai ou faux ? Débrancher les appareils en veille permet d’économiser de l’énergie.',
      options: [
        { txt: 'Vrai', ok: true, retour: 'Oui : la veille consomme en continu.' },
        { txt: 'Faux', retour: 'Si : même en veille, un appareil consomme.' },
      ] },
    { t: 'num', enonce: 'Un appareil fonctionne sous 230 V et est traversé par 0,5 A. Quelle est sa puissance ?', valeur: 115, unite: 'W', choixUnite: ['W', 'V', 'A', 'J'], aide: 'P = U × I = 230 × 0,5.' },
    { t: 'ouvert', enonce: 'Cite deux gestes simples, chez toi, pour réduire la consommation d’énergie.',
      attendu: 'Par exemple : éteindre les lumières/les veilles, utiliser des ampoules LED, baisser un peu le chauffage, ne pas laisser les chargeurs branchés.' },
  ],

  // ----------------------------------------------------------- Signaux & lumière
  signaux: [
    { t: 'qcm', enonce: 'Qu’est-ce qui se propage le plus vite ?',
      options: [
        { txt: 'La lumière', ok: true, retour: 'Oui : ≈ 300 000 km/s, bien plus que le son.' },
        { txt: 'Le son', retour: 'Le son ≈ 340 m/s, bien plus lent que la lumière.' },
        { txt: 'Les deux à la même vitesse', retour: 'Non : la lumière est bien plus rapide.' },
      ] },
    { t: 'qcm', enonce: 'Vrai ou faux ? Une année-lumière est une durée.',
      options: [
        { txt: 'Faux', ok: true, retour: 'Oui : c’est une DISTANCE (celle parcourue par la lumière en 1 an).' },
        { txt: 'Vrai', retour: 'Non : malgré son nom, c’est une distance.' },
      ] },
    { t: 'qcm', enonce: 'Un élève calcule la vitesse d’un son qui parcourt 680 m en 2 s : « v = 2 ÷ 680 ». Où est l’erreur ?',
      options: [
        { txt: 'Il a inversé : v = d/t = 680 ÷ 2 = 340 m/s', ok: true, retour: 'Exact : distance ÷ durée.' },
        { txt: 'Il devait multiplier', retour: 'Non : v = d ÷ t, mais dans le bon sens.' },
        { txt: 'Aucune erreur', retour: 'Si : il a divisé à l’envers.' },
      ] },
    { t: 'num', enonce: 'Un son parcourt 1700 m en 5 s. Quelle est sa vitesse ?', valeur: 340, unite: 'm/s', choixUnite: ['m/s', 'km/h', 'm', 's'], aide: 'v = d ÷ t = 1700 ÷ 5.' },
    { t: 'ouvert', enonce: 'Pendant un orage, on voit l’éclair puis, quelques secondes plus tard, on entend le tonnerre. Pourquoi ?',
      attendu: 'Parce que la lumière (l’éclair) va beaucoup plus vite que le son (le tonnerre) : la lumière arrive presque instantanément, le son met plus de temps.' },
  ],
};

/** Renvoie la liste d'exercices variés d'un module (ou null si aucune). */
export function exosDuModule(moduleId) {
  const l = EXOS[moduleId];
  return Array.isArray(l) && l.length ? l : null;
}
