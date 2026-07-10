// Léa — CONTENU des cours (déterministe, écrit depuis le programme cycle 4).
// Le cours EST la leçon principale : chaque module se veut complet, comme un
// vrai prof qui explique tout (accroche, définitions + valeurs réelles, exemple
// résolu pas à pas, question conceptuelle, contexte/sécurité, puis application).
//
// Chaque scène : { titre, focus, points[], narration, qcm?, checkpoint? }.
// - qcm : { question, options:[{txt, ok?, retour?}] } — vérifié côté client.
// - checkpoint (mini-exo) : { enonce, valeur, tolerance, unite, pieges? }.

export const COURS = {
  // ------------------------------------------------------------ Mouvement ---
  mouvement: {
    figure: 'vitesse',
    scenes: [
      {
        titre: 'À quoi sert la vitesse ?',
        focus: 'mobile',
        points: ['Comparer qui va le plus vite.', 'Sécurité routière, sport, transports…'],
        narration:
          'La vitesse, on l’utilise tous les jours : pour savoir qui court le plus vite, combien ' +
          'de temps dure un trajet, ou respecter les limitations sur la route. On va apprendre à ' +
          'la calculer précisément.',
      },
      {
        titre: 'La vitesse, c’est comparer',
        focus: 'mobile',
        points: ['On regarde une distance…', '…et le temps mis pour la parcourir.'],
        narration:
          'Regarde ce mobile qui avance. Pour savoir s’il va vite, on ne regarde pas une seule ' +
          'chose : on compare la distance parcourue au temps qu’il a fallu. Deux informations, ' +
          'toujours.',
      },
      {
        titre: 'La distance (d)',
        focus: 'd',
        points: ['Distance = le chemin parcouru.', 'En mètres (m) ou kilomètres (km).', 'Terrain de foot ≈ 100 m · Paris-Lyon ≈ 400 km.'],
        narration:
          'La distance, c’est la longueur du trajet. On la mesure en mètres pour de petits ' +
          'déplacements, en kilomètres pour les longs trajets : un terrain de foot fait environ ' +
          '100 mètres, Paris-Lyon environ 400 kilomètres.',
      },
      {
        titre: 'Le temps (t)',
        focus: 't',
        points: ['Durée = le temps écoulé.', 'En secondes (s) ou heures (h).', '1 h = 60 min · 2 h 30 = 2,5 h.'],
        narration:
          'Le temps, c’est la durée du déplacement : en secondes, ou en heures pour les longs ' +
          'voyages. Attention, une durée comme 2 h 30 se convertit d’abord en heures : 2 h 30, ' +
          'c’est 2,5 heures, car une demi-heure vaut 0,5 heure.',
      },
      {
        titre: 'La relation : v = d / t',
        focus: 'vitesse',
        points: ['Vitesse = distance ÷ temps.', 'Grande distance en peu de temps → grande vitesse.'],
        narration:
          'La vitesse relie les deux : on divise la distance par le temps. Beaucoup de distance ' +
          'en peu de temps, ça fait une grande vitesse. Même distance mais moins de temps : c’est ' +
          'aller plus vite.',
      },
      {
        titre: 'Les unités de vitesse',
        focus: 'vitesse',
        points: ['m/s (mètres par seconde) ou km/h.', 'Marche ≈ 5 km/h · voiture 50→130 km/h · TGV ≈ 300 km/h.'],
        narration:
          'La vitesse s’exprime en mètres par seconde, ou en kilomètres par heure. Quelques ' +
          'repères : on marche à environ 5 kilomètres par heure, une voiture roule entre 50 et ' +
          '130, et un TGV file à près de 300 kilomètres par heure.',
      },
      {
        titre: 'Un exemple résolu ensemble',
        focus: 'vitesse',
        points: [
          'Données : d = 300 km, t = 4 h.',
          '1) On écrit la loi : v = d ÷ t.',
          '2) On remplace : v = 300 ÷ 4.',
          '3) Résultat : v = 75 km/h.',
        ],
        narration:
          'Regarde la méthode. Une voiture parcourt 300 kilomètres en 4 heures. On écrit la loi, ' +
          'v égale d divisé par t ; on remplace, 300 divisé par 4 ; on calcule : 75 kilomètres ' +
          'par heure. Toujours ces trois étapes : la loi, on remplace, on calcule.',
      },
      {
        titre: 'Vérifie que tu as compris',
        focus: 'vitesse',
        points: ['Une question rapide avant de calculer.'],
        narration: 'D’abord, une petite question de réflexion.',
        qcm: {
          question: 'Pour parcourir la même distance plus vite, il faut…',
          options: [
            { txt: 'mettre moins de temps', ok: true },
            { txt: 'mettre plus de temps', retour: 'Moins de temps pour la même distance, c’est aller plus vite.' },
            { txt: 'parcourir plus de distance', retour: 'Ici la distance est la même : ce qui change, c’est le temps.' },
          ],
        },
      },
      {
        titre: 'Attention aux unités',
        focus: 't',
        points: ['Convertis la durée AVANT de diviser.', '2 h 30 = 2,5 h (pas 2,30 !).'],
        narration:
          'Le piège le plus fréquent, c’est le temps. Avant de diviser, convertis toujours la ' +
          'durée en heures : 2 h 30, c’est 2,5 heures, pas 2,30. Si tu bloques sur un exercice, ' +
          'clique sur « je suis perdu » et je te guiderai étape par étape.',
      },
      {
        titre: 'À toi de jouer',
        focus: 'vitesse',
        points: ['Applique v = d ÷ t.'],
        narration: 'À toi. Prends ton temps, tu peux recommencer autant que tu veux.',
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
        titre: 'Masse ou poids ?',
        focus: 'masse',
        points: ['Deux mots que l’on confond souvent.', 'Ils ne mesurent pas la même chose.'],
        narration:
          'Dans la vie courante, on dit « je pèse 50 kilos ». Mais en physique, masse et poids ' +
          'sont deux choses différentes ! On va apprendre à les distinguer, puis à calculer un ' +
          'poids.',
      },
      {
        titre: 'La masse (m)',
        focus: 'masse',
        points: ['Masse = quantité de matière.', 'En kilogrammes (kg), à la balance.', 'Elle ne change JAMAIS.', 'Pomme ≈ 150 g · élève ≈ 50 kg.'],
        narration:
          'La masse, c’est la quantité de matière d’un objet. On la mesure à la balance, en ' +
          'kilogrammes. Point essentiel : où que tu ailles, sur Terre, sur la Lune ou dans ' +
          'l’espace, ta masse reste la même.',
      },
      {
        titre: 'Le poids (P)',
        focus: 'poids',
        points: ['Poids = force d’attraction.', 'En newtons (N), au dynamomètre.', 'Dirigé vers le bas.'],
        narration:
          'Le poids, lui, c’est une force : l’astre attire l’objet vers lui. Comme c’est une ' +
          'force, il se mesure en newtons, avec un dynamomètre, et il est toujours dirigé vers le ' +
          'bas, vers le centre de l’astre.',
      },
      {
        titre: 'Terre ou Lune ?',
        focus: 'astre',
        points: ['La Terre attire fort : g = 10 N/kg.', 'La Lune, environ 6 fois moins.'],
        narration:
          'Voilà l’idée-clé : même objet, même masse, mais la Terre tire bien plus fort que la ' +
          'Lune. C’est pour ça que les astronautes sautent haut sur la Lune ! Le poids dépend de ' +
          'l’astre ; la masse, jamais.',
      },
      {
        titre: 'La relation : P = m × g',
        focus: 'relation',
        points: ['Poids = masse × intensité de pesanteur.', 'Sur Terre, g = 10 N/kg.', 'Donc 1 kg pèse 10 N sur Terre.'],
        narration:
          'On relie tout : le poids est égal à la masse multipliée par g, l’intensité de la ' +
          'pesanteur. Sur Terre, g vaut environ 10 newtons par kilogramme : une masse de 1 ' +
          'kilogramme y pèse donc 10 newtons.',
      },
      {
        titre: 'Un exemple résolu ensemble',
        focus: 'relation',
        points: [
          'Données : m = 4 kg, g = 10 N/kg.',
          '1) On écrit la loi : P = m × g.',
          '2) On remplace : P = 4 × 10.',
          '3) Résultat : P = 40 N.',
        ],
        narration:
          'Regarde la méthode. Un objet a une masse de 4 kilogrammes, sur Terre. On écrit la loi, ' +
          'P égale m fois g ; on remplace, 4 fois 10 ; on calcule : son poids vaut 40 newtons. ' +
          'La loi, on remplace, on calcule.',
      },
      {
        titre: 'Vérifie que tu as compris',
        focus: 'astre',
        points: ['Une question rapide avant de calculer.'],
        narration: 'D’abord, une petite question de réflexion.',
        qcm: {
          question: 'Un objet de 6 kg est emmené sur la Lune. Sa masse…',
          options: [
            { txt: 'reste 6 kg', ok: true, retour: 'La masse ne change pas ; c’est le poids qui diminue.' },
            { txt: 'devient plus petite', retour: 'C’est le POIDS qui diminue sur la Lune, pas la masse.' },
            { txt: 'devient nulle', retour: 'La Lune attire aussi, environ 6 fois moins que la Terre.' },
          ],
        },
      },
      {
        titre: 'Ne confonds pas les unités',
        focus: 'poids',
        points: ['Masse en kilogrammes (kg).', 'Poids en newtons (N).'],
        narration:
          'Dernier réflexe à prendre : la masse se donne en kilogrammes, le poids en newtons. Si ' +
          'on te demande un poids et que tu réponds en kilogrammes, c’est que tu as confondu les ' +
          'deux grandeurs.',
      },
      {
        titre: 'À toi de jouer',
        focus: 'relation',
        points: ['Applique P = m × g (g = 10).'],
        narration: 'À toi. La masse est en kg, le poids en newtons.',
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
        titre: 'Pourquoi la loi d’Ohm ?',
        focus: 'circuit',
        points: ['L’électricité est partout : lampes, téléphone, voiture.', 'Une seule loi permet de la maîtriser.'],
        narration:
          'L’électricité alimente presque tout autour de toi. Pour la comprendre et l’utiliser ' +
          'sans danger, les scientifiques ont trouvé une relation très simple entre trois ' +
          'grandeurs. On va la construire ensemble, pas à pas.',
      },
      {
        titre: 'Un circuit, comme de l’eau',
        focus: 'circuit',
        points: ['Le courant tourne en boucle fermée.', 'Image utile : de l’eau dans des tuyaux.'],
        narration:
          'Un circuit électrique, c’est une boucle fermée : si on la coupe, plus rien ne passe. ' +
          'Pour bien le comprendre, imagine de l’eau qui circule dans des tuyaux — toute la ' +
          'leçon va découler de cette image.',
      },
      {
        titre: 'La tension (U) : la pompe',
        focus: 'U',
        points: ['Tension = ce qui « pousse » le courant.', 'En volts (V).', 'Pile plate : 4,5 V · prise : 230 V.'],
        narration:
          'Le générateur, c’est la pompe : c’est lui qui pousse l’eau et met le courant en ' +
          'mouvement. Cette poussée, c’est la tension, en volts. Une pile plate fait 4,5 volts, ' +
          'une prise de courant 230 volts — beaucoup plus.',
      },
      {
        titre: 'L’intensité (I) : le débit',
        focus: 'I',
        points: ['Intensité = quantité de courant qui passe.', 'En ampères (A).', 'Une petite lampe : environ 0,3 A.'],
        narration:
          'L’intensité, c’est le débit : la quantité d’électricité qui passe chaque seconde, ' +
          'comme l’eau qui traverse le tuyau. Plus il en passe, plus l’intensité est grande. ' +
          'On la mesure en ampères ; une petite lampe consomme environ 0,3 ampère.',
      },
      {
        titre: 'La résistance (R) : le rétrécissement',
        focus: 'R',
        points: ['Résistance = ce qui freine le courant.', 'En ohms (Ω).', 'R grand → courant plus faible.'],
        narration:
          'La résistance, c’est un rétrécissement du tuyau : elle freine le passage. Plus la ' +
          'résistance est grande, plus le courant a du mal à passer, donc plus l’intensité est ' +
          'faible. On la mesure en ohms.',
      },
      {
        titre: 'La loi d’Ohm : U = R × I',
        focus: 'loi',
        points: ['Tension = résistance × intensité.', 'Connaître deux grandeurs donne la troisième.'],
        narration:
          'Voici la loi d’Ohm : la tension aux bornes d’une résistance est égale à la ' +
          'résistance multipliée par l’intensité. C’est puissant : si tu connais deux des trois ' +
          'grandeurs, tu peux toujours calculer la troisième.',
      },
      {
        titre: 'Un exemple résolu ensemble',
        focus: 'loi',
        points: [
          'Données : R = 20 Ω et I = 0,5 A.',
          '1) On écrit la loi : U = R × I.',
          '2) On remplace : U = 20 × 0,5.',
          '3) Résultat : U = 10 V.',
        ],
        narration:
          'Regarde comment on procède. On a une résistance de 20 ohms parcourue par 0,5 ampère. ' +
          'On écrit la loi, U égale R fois I ; on remplace par les valeurs, 20 fois 0,5 ; et on ' +
          'calcule : la tension vaut 10 volts. Toujours ces trois étapes : la loi, on remplace, on calcule.',
      },
      {
        titre: 'Vérifie que tu as compris',
        focus: 'R',
        points: ['Une question rapide avant de calculer.'],
        narration: 'Avant de calculer, une petite question de réflexion.',
        qcm: {
          question: 'Dans un circuit, à quoi sert une résistance ?',
          options: [
            { txt: 'à freiner le courant', ok: true },
            { txt: 'à produire le courant', retour: 'C’est le générateur (la pile) qui fournit le courant.' },
            { txt: 'à augmenter le courant', retour: 'Au contraire, une résistance freine le courant.' },
          ],
        },
      },
      {
        titre: 'Attention au danger',
        focus: 'circuit',
        points: ['La tension du secteur (230 V) est dangereuse.', 'On n’expérimente qu’avec des piles.'],
        narration:
          'Un mot de sécurité : la tension d’une prise, 230 volts, peut être mortelle. En classe ' +
          'comme à la maison, on n’expérimente jamais avec le secteur — seulement avec des piles, ' +
          'sous basse tension.',
      },
      {
        titre: 'À toi de jouer',
        focus: 'loi',
        points: ['Applique les 3 étapes : la loi, on remplace, on calcule.'],
        narration: 'À toi maintenant, exactement comme dans l’exemple.',
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
        titre: 'Les trois états de la matière',
        figure: 'etats',
        focus: 'etats',
        points: ['Solide : forme propre.', 'Liquide : prend la forme du récipient.', 'Gaz : occupe tout l’espace.'],
        narration:
          'La matière existe sous trois états. Le solide a une forme bien à lui, comme un ' +
          'glaçon. Le liquide, comme l’eau, prend la forme de son récipient. Le gaz, comme la ' +
          'vapeur, se répand et occupe tout l’espace disponible.',
      },
      {
        titre: 'Les changements d’état',
        figure: 'etats',
        focus: 'changements',
        points: ['Solide → liquide : fusion.', 'Liquide → gaz : vaporisation.', 'Et les changements inverses.'],
        narration:
          'On passe d’un état à l’autre par un changement d’état. Un solide qui devient liquide, ' +
          'c’est la fusion ; un liquide qui devient gaz, la vaporisation. Dans l’autre sens, on ' +
          'parle de solidification et de liquéfaction.',
      },
      {
        titre: 'La masse se conserve',
        figure: 'etats',
        focus: 'changements',
        points: ['La masse ne change pas lors d’un changement d’état.', 'Mais le volume, lui, peut changer.'],
        narration:
          'Point important : quand un glaçon fond, il devient de l’eau liquide, mais sa masse ' +
          'reste exactement la même — la matière ne disparaît pas. En revanche, son volume peut ' +
          'varier : l’eau se dilate en gelant.',
      },
      {
        titre: 'La température de changement d’état',
        figure: 'etats',
        focus: 'changements',
        points: ['L’eau pure fond à 0 °C et bout à 100 °C.', 'Ces températures identifient un corps pur.'],
        narration:
          'Chaque corps pur change d’état à une température bien précise. L’eau pure fond à 0 ' +
          'degré et bout à 100 degrés. Mesurer cette température permet donc de reconnaître un ' +
          'corps pur.',
      },
      {
        titre: 'Vérifie que tu as compris',
        figure: 'etats',
        focus: 'changements',
        points: ['Une question rapide.'],
        narration: 'Une petite question sur les changements d’état.',
        qcm: {
          question: 'Quand un glaçon fond entièrement, sa masse…',
          options: [
            { txt: 'reste la même', ok: true },
            { txt: 'diminue', retour: 'La matière ne disparaît pas : la masse se conserve.' },
            { txt: 'augmente', retour: 'Rien ne s’ajoute : la masse reste identique.' },
          ],
        },
      },
      {
        titre: 'Pourquoi la masse volumique ?',
        focus: 'relation',
        points: ['Reconnaître un matériau sans le voir.', 'Comprendre pourquoi ça flotte ou coule.'],
        narration:
          'Pourquoi un morceau de bois flotte-t-il alors qu’un clou coule ? Comment savoir si un ' +
          'bijou est vraiment en or ? La réponse tient dans une grandeur : la masse volumique. On ' +
          'va la découvrir.',
      },
      {
        titre: 'La masse (m)',
        focus: 'masse',
        points: ['Masse = quantité de matière.', 'À la balance, en grammes (g).'],
        narration:
          'On part d’un bloc de matière. Sa masse, c’est la quantité de matière qu’il contient : ' +
          'on la mesure à la balance, ici en grammes.',
      },
      {
        titre: 'Le volume (V)',
        focus: 'volume',
        points: ['Volume = la place occupée.', 'En centimètres cubes (cm³).', 'Solide : par déplacement d’eau.'],
        narration:
          'Son volume, c’est la place qu’il occupe dans l’espace. Pour un solide de forme ' +
          'compliquée, on le plonge dans de l’eau et on mesure la montée du niveau : c’est le ' +
          'volume déplacé. On l’exprime en centimètres cubes.',
      },
      {
        titre: 'La masse volumique : ρ = m / V',
        focus: 'relation',
        points: ['ρ (rhô) = masse ÷ volume.', 'C’est la carte d’identité du matériau.'],
        narration:
          'La masse volumique relie les deux : on divise la masse par le volume. Sa valeur est la ' +
          'carte d’identité du matériau : le fer, l’or ou le bois n’ont pas la même, quelle que ' +
          'soit la taille du morceau.',
      },
      {
        titre: 'Quelques valeurs à connaître',
        focus: 'relation',
        points: ['Eau = 1 g/cm³.', 'Bois ≈ 0,5 · Huile ≈ 0,9.', 'Fer ≈ 7,9 · Or ≈ 19,3 g/cm³.'],
        narration:
          'Voici des repères. L’eau vaut exactement 1 gramme par centimètre cube. Le bois et ' +
          'l’huile sont en dessous ; le fer est bien plus lourd, environ 7,9 ; et l’or, très ' +
          'dense, atteint 19,3 grammes par centimètre cube.',
      },
      {
        titre: 'Flotte ou coule ?',
        focus: 'relation',
        points: ['Plus léger que l’eau (ρ < 1) → flotte.', 'Plus lourd que l’eau (ρ > 1) → coule.'],
        narration:
          'La masse volumique explique la flottaison. Un matériau moins dense que l’eau, comme le ' +
          'bois ou l’huile, flotte. Un matériau plus dense, comme le fer, coule. Tout se compare ' +
          'à l’eau, qui vaut 1.',
      },
      {
        titre: 'Un exemple résolu ensemble',
        focus: 'relation',
        points: [
          'Données : m = 60 g, V = 8 cm³.',
          '1) On écrit la loi : ρ = m ÷ V.',
          '2) On remplace : ρ = 60 ÷ 8.',
          '3) Résultat : ρ = 7,5 g/cm³.',
        ],
        narration:
          'Regarde la méthode. Un objet a une masse de 60 grammes pour un volume de 8 centimètres ' +
          'cubes. On écrit la loi, rhô égale m divisé par V ; on remplace, 60 divisé par 8 ; on ' +
          'calcule : 7,5 grammes par centimètre cube. C’est proche du fer.',
      },
      {
        titre: 'Vérifie que tu as compris',
        focus: 'relation',
        points: ['Une question rapide avant de calculer.'],
        narration: 'D’abord, une petite question de réflexion.',
        qcm: {
          question: 'Deux cubes ont le même volume mais des masses différentes. Alors…',
          options: [
            { txt: 'leurs masses volumiques sont différentes', ok: true },
            { txt: 'ils ont la même masse volumique', retour: 'Même volume mais masses différentes → ρ = m/V différent.' },
            { txt: 'ils sont faits du même matériau', retour: 'Des masses volumiques différentes = des matériaux différents.' },
          ],
        },
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
        titre: 'La puissance, ça se paie',
        focus: 'puissance',
        points: ['Les appareils consomment de l’énergie.', 'La puissance mesure « combien, par seconde ».'],
        narration:
          'Une ampoule, un four, un chargeur… tous consomment de l’électricité, mais pas à la ' +
          'même vitesse. Ce « combien par seconde », c’est la puissance. C’est elle qui fait ' +
          'grimper la facture. Apprenons à la calculer.',
      },
      {
        titre: 'La tension (U)',
        focus: 'tension',
        points: ['Le générateur fournit une tension U.', 'En volts (V).'],
        narration:
          'Un appareil électrique est alimenté par un générateur, qui impose une tension : la ' +
          '« poussée » électrique, mesurée en volts. C’est la même grandeur que dans la loi d’Ohm.',
      },
      {
        titre: 'L’intensité (I)',
        focus: 'intensite',
        points: ['Le courant qui traverse l’appareil.', 'En ampères (A).'],
        narration:
          'À travers l’appareil circule un courant électrique, dont l’intensité se mesure en ' +
          'ampères. Plus l’appareil « tire » de courant, plus il est gourmand.',
      },
      {
        titre: 'La puissance (P)',
        focus: 'puissance',
        points: ['Puissance = énergie consommée chaque seconde.', 'En watts (W).', 'LED ≈ 5 W · box ≈ 10 W · four ≈ 2000 W.'],
        narration:
          'La puissance, c’est l’énergie que l’appareil consomme chaque seconde. On la mesure en ' +
          'watts. Quelques repères : une ampoule LED fait environ 5 watts, une box internet 10, ' +
          'et un four peut atteindre 2000 watts.',
      },
      {
        titre: 'La relation : P = U × I',
        focus: 'loi',
        points: ['Puissance = tension × intensité.'],
        narration:
          'On relie tout : la puissance électrique est le produit de la tension par l’intensité. ' +
          'Plus la tension ou le courant est grand, plus l’appareil est puissant.',
      },
      {
        titre: 'Un exemple résolu ensemble',
        focus: 'loi',
        points: [
          'Données : U = 12 V, I = 3 A.',
          '1) On écrit la loi : P = U × I.',
          '2) On remplace : P = 12 × 3.',
          '3) Résultat : P = 36 W.',
        ],
        narration:
          'Regarde la méthode. Un appareil fonctionne sous 12 volts et est parcouru par 3 ' +
          'ampères. On écrit la loi, P égale U fois I ; on remplace, 12 fois 3 ; on calcule : sa ' +
          'puissance vaut 36 watts. La loi, on remplace, on calcule.',
      },
      {
        titre: 'Vérifie que tu as compris',
        focus: 'puissance',
        points: ['Une question rapide avant de calculer.'],
        narration: 'D’abord, une petite question de réflexion.',
        qcm: {
          question: 'Sous la même tension, un appareil parcouru par plus de courant est…',
          options: [
            { txt: 'plus puissant', ok: true, retour: 'P = U × I : plus de courant → plus de puissance.' },
            { txt: 'moins puissant', retour: 'P = U × I : à tension égale, plus de I donne plus de P.' },
            { txt: 'aussi puissant', retour: 'La puissance dépend aussi de I : ici elle augmente.' },
          ],
        },
      },
      {
        titre: 'Puissance et énergie',
        focus: 'puissance',
        points: ['Énergie = puissance × durée (E = P × t).', 'Un appareil puissant longtemps → grosse consommation.'],
        narration:
          'La puissance dit « combien par seconde ». L’énergie totale consommée, elle, dépend ' +
          'aussi de la durée : un appareil puissant utilisé longtemps consomme beaucoup. C’est ' +
          'pour ça qu’on éteint ce qui ne sert pas — pour économiser l’énergie.',
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
        titre: 'Observer et communiquer',
        focus: 'distance',
        points: ['La lumière et le son transportent de l’information.', 'On peut mesurer leur vitesse.'],
        narration:
          'On voit les étoiles, on entend une cloche au loin : la lumière et le son sont des ' +
          'signaux qui voyagent jusqu’à nous. Et comme tout ce qui se déplace, ils ont une ' +
          'vitesse que l’on peut calculer.',
      },
      {
        titre: 'Un signal se propage',
        focus: 'distance',
        points: ['Il part d’une source et parcourt une distance d.', 'En mètres (m).'],
        narration:
          'Un signal — un son, une lumière — part d’une source et se propage en ligne droite ' +
          'jusqu’à nous. Il parcourt une certaine distance, mesurée en mètres.',
      },
      {
        titre: 'Le temps de trajet (t)',
        focus: 'temps',
        points: ['Le voyage prend un certain temps t.', 'En secondes (s).'],
        narration:
          'Ce voyage prend du temps, mesuré en secondes. Selon le signal, ce temps est très ' +
          'court… ou pas : le son est lent, la lumière extrêmement rapide.',
      },
      {
        titre: 'La vitesse : v = d / t',
        focus: 'vitesse',
        points: ['v = distance ÷ temps.', 'Même relation que pour un mobile.'],
        narration:
          'La vitesse du signal, c’est la distance divisée par le temps — exactement la même ' +
          'relation que pour une voiture. On la calcule de la même façon.',
      },
      {
        titre: 'Deux vitesses à connaître',
        focus: 'vitesse',
        points: ['Son dans l’air ≈ 340 m/s.', 'Lumière ≈ 300 000 km/s.'],
        narration:
          'Deux repères essentiels. Dans l’air, le son file à environ 340 mètres par seconde. La ' +
          'lumière, elle, va presque un million de fois plus vite : 300 000 kilomètres par ' +
          'seconde. Rien ne va plus vite que la lumière.',
      },
      {
        titre: 'L’éclair et le tonnerre',
        focus: 'vitesse',
        points: ['Ils partent ensemble.', 'La lumière arrive avant le son.'],
        narration:
          'Pendant un orage, l’éclair et le tonnerre naissent au même instant. Mais tu vois ' +
          'l’éclair tout de suite, et tu entends le tonnerre quelques secondes après : c’est la ' +
          'preuve que la lumière va beaucoup plus vite que le son.',
      },
      {
        titre: 'Un exemple résolu ensemble',
        focus: 'vitesse',
        points: [
          'Données : d = 1020 m, t = 3 s.',
          '1) On écrit la loi : v = d ÷ t.',
          '2) On remplace : v = 1020 ÷ 3.',
          '3) Résultat : v = 340 m/s.',
        ],
        narration:
          'Regarde la méthode. Un son parcourt 1020 mètres en 3 secondes. On écrit la loi, v ' +
          'égale d divisé par t ; on remplace, 1020 divisé par 3 ; on calcule : 340 mètres par ' +
          'seconde. C’est bien la vitesse du son dans l’air.',
      },
      {
        titre: 'Vérifie que tu as compris',
        focus: 'vitesse',
        points: ['Une question rapide avant de calculer.'],
        narration: 'D’abord, une petite question de réflexion.',
        qcm: {
          question: 'Pendant un orage, on voit l’éclair avant d’entendre le tonnerre parce que…',
          options: [
            { txt: 'la lumière va plus vite que le son', ok: true },
            { txt: 'le son va plus vite que la lumière', retour: 'C’est l’inverse : lumière ≈ 300 000 km/s, son ≈ 340 m/s.' },
            { txt: 'l’éclair part avant le tonnerre', retour: 'Les deux partent ensemble ; la lumière arrive juste avant.' },
          ],
        },
      },
      {
        titre: 'L’année-lumière',
        focus: 'vitesse',
        points: ['C’est une DISTANCE, pas une durée.', 'La distance parcourue par la lumière en un an.'],
        narration:
          'Comme la lumière est très rapide, on l’utilise pour mesurer les distances de ' +
          'l’Univers. Une année-lumière, c’est la distance que la lumière parcourt en un an. ' +
          'Attention : malgré son nom, c’est une distance, pas une durée.',
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

/** Lecture tolérante d'un nombre (virgule, espaces, unité écrite après). */
function lireNombre(texte) {
  const norm = String(texte ?? '').replace(/,/g, '.').replace(/\s/g, '');
  const m = norm.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const v = Number(m[0]);
  return Number.isFinite(v) ? v : null;
}

/** Vérifie un mini-exo (même logique numérique que le moteur). */
export function verifierCheckpoint(cp, texte) {
  const valeur = lireNombre(texte);
  if (valeur === null) {
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
