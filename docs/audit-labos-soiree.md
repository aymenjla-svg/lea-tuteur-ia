# Nuit de polish des labos — récap & audit (pour le réveil ☀️)

Tout est en ligne sur la branche, `npm test` **90/90**, vérifié en headless à
chaque étape (**0 erreur console**), y compris sur un viewport **mobile 420 px**.

## ✨ Ce qui a changé (effet « waouh »)

### 🚀 Labo gravité — système solaire complet + atterrissage
- **Système solaire COMPLET** : Soleil + **8 planètes** (Mercure → Neptune) + Lune
  + Espace, avec les **g scolaires corrects** (ce qui manquait).
- Rendu soigné : **corona** du Soleil, planètes en dégradé, **bandes + tache rouge
  de Jupiter**, **anneaux de Saturne**, **continents + Lune en orbite** pour la
  Terre, orbites concentriques, **étoiles scintillantes**.
- **Clic sur une planète = zoom-atterrissage animé** (transition fluide) avant de
  se poser.
- **Surface enrichie** : ciel + soleil lointain (ou étoiles la nuit), sol avec
  relief/cailloux + horizon, **ombres** sous les objets, **« pouf » de poussière**
  à l'atterrissage et quand le robot ramasse.
- Cible tactile des petites planètes **élargie** (mobile).

### 🏃 Labo vitesse — sens corrigé + course vivante
- **Les mobiles avancent enfin vers la droite** (la voiture roulait à l'envers).
- Décor : ciel, soleil, nuages dérivants, herbe ; **ligne médiane qui défile**,
  **lignes de vitesse + poussière** derrière les mobiles, rebond des piétons,
  **confettis + bannière du vainqueur** à l'arrivée.

### 🌊 Labo densité — eau vivante
- **Surface ondulée animée**, **caustiques** (reflets), **bulles** qui remontent,
  **éclaboussure** à l'entrée d'un objet.

### ⚡ Labo circuit — plus lumineux
- **Électrons avec halo**, **étincelles dorées** autour de l'ampoule allumée.

## ⚙️ Performance
- Les boucles d'animation (`requestAnimationFrame`) tournent **uniquement quand un
  labo est ouvert** ; elles sont **arrêtées à la fermeture** (`cancelAnimationFrame`)
  et **mises en pause automatiquement** quand l'onglet est en arrière-plan. → aucun
  CPU consommé en fond.
- **DPR plafonné à 2** ; champs d'étoiles / bulles **pré-calculés une fois**.
- **Règle appliquée partout** : toute animation qui *déclenche un changement d'état*
  (ex. l'atterrissage) est désormais **basée sur le temps** (durée fixe), donc
  fluide et fiable quel que soit le nombre d'images/seconde de l'appareil.

## 🧭 Ergonomie
- Intérieur des labos = **même langage que la séance** (en-tête ← retour + barre,
  panneaux verre, boutons dorés) ; fermeture par **←** ou **Échap**.
- Boutons principaux ≥ 40 px ; **testé sur mobile 420 px** sans erreur.

## 🔜 Recommandations (à voir ensemble)
1. **2 labos manquants** pour couvrir tout le programme : 🔥 **énergie/puissance**
   (P = U·I, E = P·t) et 📡 **signaux** (lumière vs son). Même moule → rapide.
2. **`prefers-reduced-motion`** : on pourrait couper les animations *ambiantes*
   des canvas (scintillement, bulles, nuages) pour les élèves sensibles au
   mouvement, en gardant l'essentiel (chute, course).
3. Si un jour un appareil très faible rame sur le système solaire, on peut
   **pré-rendre les planètes** dans un canvas hors-écran (elles sont statiques) et
   n'animer que les étoiles/soleil par-dessus. Pas nécessaire aujourd'hui.
4. Les 3 features **Edge** (`docs/todo-edge-phase2.md`) restent à brancher
   ensemble sur ton PC.
