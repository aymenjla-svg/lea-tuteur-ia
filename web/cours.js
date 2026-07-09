// Léa — CONTENU des cours (déterministe, écrit depuis le programme cycle 4).
// Un cours = une séquence de scènes. Le tableau change à chaque scène : un
// visuel animé (figures.js) se construit, le prof raconte (voix + sous-titres),
// et des mini-exos d'application ponctuent le parcours. À la fin → la série.
//
// Chaque scène : { titre, figure, focus, points[], narration, checkpoint? }.
// checkpoint (mini-exo) : { enonce, valeur, tolerance, unite, pieges? } — vérifié
// localement (même logique numérique que le moteur : virgule ↔ point, pièges).

export const COURS = {
  // ------------------------------------------------------------ Mouvement ---
  mouvement: {
    figure: 'vitesse',
    scenes: [
      {
        titre: 'La vitesse, c’est comparer',
        focus: 'mobile',
        points: ['On regarde une distance…', '…et le temps mis pour la parcourir.'],
        narration:
          'Regarde ce mobile qui avance. Pour savoir s’il va vite, on ne regarde pas ' +
          'qu’une seule chose : on compare la distance parcourue au temps qu’il a fallu.',
      },
      {
        titre: 'La distance (d)',
        focus: 'd',
        points: ['Distance = le chemin parcouru.', 'En mètres (m) ou kilomètres (km).'],
        narration:
          'La distance, c’est la longueur du trajet. On la mesure en mètres, ou en ' +
          'kilomètres pour les longs trajets.',
      },
      {
        titre: 'Le temps (t)',
        focus: 't',
        points: ['Durée = le temps écoulé.', 'En secondes (s) ou heures (h).'],
        narration:
          'Le temps, c’est la durée du déplacement. En secondes, ou en heures pour ' +
          'les longs voyages. Même distance mais moins de temps : c’est plus rapide !',
      },
      {
        titre: 'La relation : v = d / t',
        focus: 'vitesse',
        points: ['Vitesse = distance ÷ temps.', 'Grande distance en peu de temps → grande vitesse.'],
        narration:
          'La vitesse relie les deux : on divise la distance par le temps. Beaucoup de ' +
          'distance en peu de temps, ça fait une grande vitesse.',
      },
      {
        titre: 'À toi de jouer',
        focus: 'vitesse',
        points: ['Applique v = d / t.'],
        narration: 'Essaie celui-ci. Prends ton temps, tu peux recommencer autant que tu veux.',
        checkpoint: {
          enonce: 'Un vélo parcourt 20 m en 5 s. Quelle est sa vitesse, en m/s ?',
          valeur: 4, tolerance: 0, unite: 'm/s',
          pieges: [{ valeur: 100, indice: 'Ici il faut diviser, pas multiplier.' }],
        },
      },
    ],
  },

  // ---------------------------------------------------------------- Poids ---
  poids: {
    figure: 'poids',
    scenes: [
      {
        titre: 'La masse (m)',
        focus: 'masse',
        points: ['Masse = quantité de matière.', 'En kilogrammes (kg). Elle ne change pas.'],
        narration:
          'La masse, c’est la quantité de matière d’un objet. On la mesure en kilogrammes. ' +
          'Où que tu ailles, sur Terre ou sur la Lune, ta masse reste la même.',
      },
      {
        titre: 'Le poids (P)',
        focus: 'poids',
        points: ['Poids = force d’attraction.', 'En newtons (N). Dirigé vers le bas.'],
        narration:
          'Le poids, lui, c’est une force : l’astre attire l’objet vers lui. C’est une ' +
          'force, donc en newtons, et elle est dirigée vers le bas.',
      },
      {
        titre: 'Terre ou Lune ?',
        focus: 'astre',
        points: ['La Terre attire fort (g = 10 N/kg).', 'La Lune, 6 fois moins.'],
        narration:
          'Voilà l’idée-clé : même objet, même masse, mais la Terre tire bien plus fort ' +
          'que la Lune. Le poids dépend de l’astre ; la masse, non.',
      },
      {
        titre: 'La relation : P = m × g',
        focus: 'relation',
        points: ['Poids = masse × intensité de pesanteur.', 'Sur Terre, g = 10 N/kg.'],
        narration:
          'On relie tout : le poids est la masse multipliée par g, l’intensité de la ' +
          'pesanteur. Sur Terre, g vaut environ 10 newtons par kilogramme.',
      },
      {
        titre: 'À toi de jouer',
        focus: 'relation',
        points: ['Applique P = m × g (g = 10).'],
        narration: 'À toi. Souviens-toi : la masse est en kg, le poids en newtons.',
        checkpoint: {
          enonce: 'Sur Terre (g = 10 N/kg), quel est le poids d’une masse de 3 kg, en newtons ?',
          valeur: 30, tolerance: 0, unite: 'N',
          pieges: [
            { valeur: 3, indice: 'Attention : 3 kg, c’est la masse, pas le poids.' },
            { valeur: 0.3, indice: 'Ici on multiplie par g, on ne divise pas.' },
          ],
        },
      },
    ],
  },

  // ---------------------------------------------------------- Électricité ---
  electricite: {
    figure: 'ohm',
    scenes: [
      {
        titre: 'Un circuit, comme de l’eau',
        focus: 'circuit',
        points: ['Le courant tourne en boucle.', 'Imagine de l’eau dans des tuyaux.'],
        narration:
          'Un circuit électrique, c’est une boucle fermée. Pour bien le comprendre, ' +
          'imagine de l’eau qui circule dans des tuyaux. Tout va découler de cette image.',
      },
      {
        titre: 'La tension (U) : la pompe',
        focus: 'U',
        points: ['Tension = ce qui pousse le courant.', 'En volts (V).'],
        narration:
          'La pile, c’est la pompe : c’est elle qui pousse l’eau, qui met le courant en ' +
          'mouvement. Cette « poussée », c’est la tension, mesurée en volts.',
      },
      {
        titre: 'L’intensité (I) : le débit',
        focus: 'I',
        points: ['Intensité = quantité de courant qui passe.', 'En ampères (A).'],
        narration:
          'L’intensité, c’est le débit : la quantité d’eau qui passe chaque seconde. ' +
          'Plus il passe de courant, plus l’intensité est grande. On la mesure en ampères.',
      },
      {
        titre: 'La résistance (R) : le rétrécissement',
        focus: 'R',
        points: ['Résistance = ce qui freine le courant.', 'En ohms (Ω).'],
        narration:
          'La résistance, c’est un rétrécissement du tuyau : elle freine le débit. Plus ' +
          'la résistance est grande, plus le courant est gêné. On la mesure en ohms.',
      },
      {
        titre: 'La loi d’Ohm : U = R × I',
        focus: 'loi',
        points: ['Tension = résistance × intensité.', 'Les trois grandeurs sont liées.'],
        narration:
          'Voici la loi d’Ohm : la tension est égale à la résistance multipliée par ' +
          'l’intensité. Ces trois grandeurs sont reliées pour toujours.',
      },
      {
        titre: 'À toi de jouer',
        focus: 'loi',
        points: ['Applique U = R × I.'],
        narration: 'Dernier effort : applique la loi d’Ohm sur cet exemple.',
        checkpoint: {
          enonce: 'Une résistance de 10 Ω est parcourue par un courant de 3 A. Quelle tension, en volts ?',
          valeur: 30, tolerance: 0, unite: 'V',
          pieges: [{ valeur: 13, indice: 'On multiplie R et I, on ne les additionne pas.' }],
        },
      },
    ],
  },

  // ------------------------------------------------------------- Matière ---
  matiere: {
    figure: 'matiere',
    scenes: [
      {
        titre: 'La masse (m)',
        focus: 'masse',
        points: ['Masse = quantité de matière.', 'Mesurée à la balance, en grammes (g).'],
        narration:
          'On part d’un bloc de matière. Sa masse, c’est la quantité de matière qu’il contient : ' +
          'on la mesure à la balance, en grammes.',
      },
      {
        titre: 'Le volume (V)',
        focus: 'volume',
        points: ['Volume = la place occupée.', 'En centimètres cubes (cm³).'],
        narration:
          'Son volume, c’est la place qu’il occupe dans l’espace. Pour un solide, on peut le ' +
          'mesurer en le plongeant dans l’eau. On l’exprime en centimètres cubes.',
      },
      {
        titre: 'La masse volumique : ρ = m / V',
        focus: 'relation',
        points: ['ρ = masse ÷ volume.', 'Elle identifie le matériau (fer, or, bois…).'],
        narration:
          'La masse volumique relie les deux : on divise la masse par le volume. Sa valeur est ' +
          'la carte d’identité du matériau : le fer, l’or ou le bois n’ont pas la même.',
      },
      {
        titre: 'À toi de jouer',
        focus: 'relation',
        points: ['Applique ρ = m ÷ V.'],
        narration: 'À toi. Divise bien la masse par le volume.',
        checkpoint: {
          enonce: 'Un caillou a une masse de 50 g et un volume de 20 cm³. Sa masse volumique, en g/cm³ ?',
          valeur: 2.5, tolerance: 0, unite: 'g/cm³',
          pieges: [{ valeur: 1000, indice: 'Ici on divise la masse par le volume, on ne multiplie pas.' }],
        },
      },
    ],
  },

  // -------------------------------------------------------------- Énergie ---
  energie: {
    figure: 'energie',
    scenes: [
      {
        titre: 'La tension (U)',
        focus: 'tension',
        points: ['Le générateur fournit une tension U.', 'En volts (V).'],
        narration:
          'Un appareil électrique est alimenté par un générateur, qui impose une tension : ' +
          'la « poussée » électrique, mesurée en volts.',
      },
      {
        titre: 'L’intensité (I)',
        focus: 'intensite',
        points: ['Le courant qui traverse l’appareil.', 'En ampères (A).'],
        narration:
          'À travers l’appareil circule un courant électrique, dont l’intensité se mesure en ampères.',
      },
      {
        titre: 'La puissance (P)',
        focus: 'puissance',
        points: ['Puissance = énergie consommée chaque seconde.', 'En watts (W).'],
        narration:
          'La puissance, c’est l’énergie que l’appareil consomme chaque seconde — ici, la chaleur ' +
          'du radiateur. On la mesure en watts.',
      },
      {
        titre: 'La relation : P = U × I',
        focus: 'loi',
        points: ['Puissance = tension × intensité.'],
        narration:
          'On relie tout : la puissance électrique est le produit de la tension par l’intensité. ' +
          'Plus l’une ou l’autre est grande, plus l’appareil est puissant.',
      },
      {
        titre: 'À toi de jouer',
        focus: 'loi',
        points: ['Applique P = U × I.'],
        narration: 'À toi. Multiplie la tension par l’intensité.',
        checkpoint: {
          enonce: 'Une lampe fonctionne sous 6 V et est parcourue par 0,5 A. Sa puissance, en watts ?',
          valeur: 3, tolerance: 0, unite: 'W',
          pieges: [{ valeur: 12, indice: 'On multiplie U et I : 6 × 0,5.' }],
        },
      },
    ],
  },

  // -------------------------------------------------------------- Signaux ---
  signaux: {
    figure: 'signaux',
    scenes: [
      {
        titre: 'Un signal se propage',
        focus: 'distance',
        points: ['Son ou lumière parcourt une distance d.', 'En mètres (m).'],
        narration:
          'Un signal — un son, une lumière — part d’une source et se propage. Il parcourt une ' +
          'distance jusqu’à nous.',
      },
      {
        titre: 'Le temps de trajet (t)',
        focus: 'temps',
        points: ['Il met un certain temps t.', 'En secondes (s).'],
        narration:
          'Ce trajet prend du temps. Le son est lent : c’est pourquoi on voit l’éclair avant ' +
          'd’entendre le tonnerre. La lumière, elle, va beaucoup plus vite.',
      },
      {
        titre: 'La vitesse : v = d / t',
        focus: 'vitesse',
        points: ['v = distance ÷ temps.', 'Son ≈ 340 m/s, lumière ≈ 300 000 km/s.'],
        narration:
          'La vitesse du signal, c’est la distance divisée par le temps. Dans l’air, le son file ' +
          'à environ 340 mètres par seconde ; la lumière, à 300 000 kilomètres par seconde !',
      },
      {
        titre: 'À toi de jouer',
        focus: 'vitesse',
        points: ['Applique v = d ÷ t.'],
        narration: 'À toi. Divise la distance par le temps.',
        checkpoint: {
          enonce: 'Un son parcourt 1700 m en 5 s. Quelle est sa vitesse, en m/s ?',
          valeur: 340, tolerance: 0, unite: 'm/s',
          pieges: [{ valeur: 8500, indice: 'Ici on divise la distance par le temps, on ne multiplie pas.' }],
        },
      },
    ],
  },
};

/** Vérifie un mini-exo (même logique numérique que le moteur). */
export function verifierCheckpoint(cp, texte) {
  const brut = (texte ?? '').trim().replace(',', '.');
  const valeur = Number(brut);
  if (brut === '' || !Number.isFinite(valeur)) {
    return { correct: false, message: 'Écris un nombre pour répondre.' };
  }
  if (Math.abs(valeur - cp.valeur) <= cp.tolerance) {
    return { correct: true, message: 'Exact, bravo ! On continue.' };
  }
  const piege = (cp.pieges ?? []).find((p) => Math.abs(valeur - p.valeur) <= (p.tolerance ?? 0));
  return {
    correct: false,
    message: piege?.indice ?? 'Pas tout à fait. Reprends ton calcul étape par étape.',
  };
}
