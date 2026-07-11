# Léa — Phase 2 : détection de l'attention & des émotions de l'élève

> Document de cadrage pour décision interne. Résume le brainstorm initial.
> Objectif : aligner l'équipe, puis **trancher** sur l'ambition et l'approche.
> Contexte cible : **maison (élève seul) ET école, à terme.** Public : collégiens (mineurs).

---

## 1. Objectif

Permettre à Léa de **percevoir l'état de l'élève** pour **adapter** son comportement :

- Est-il **présent** devant l'écran ?
- Est-il **concentré** ou en train de décrocher ?
- **Bloque**-t-il / est-il frustré ?
- S'**ennuie**-t-il (trop facile) ?
- Est-il **fatigué** ?

Le but n'est **pas** de « lire les émotions » façon science-fiction, mais de capter des états **actionnables** pour rendre l'aide plus juste (ralentir, encourager, corser, faire une pause…).

---

## 2. Deux familles de signaux

### A. Comportemental — SANS caméra ✅
*Faisabilité : haute. Vie privée : OK (rien ne quitte l'appareil, comme le suivi actuel).*

Signaux lisibles dans le navigateur :

| Question | Signal | Confiance |
|---|---|---|
| Est-il là ? | Page Visibility API (onglet quitté) / inactivité (souris/clavier/scroll) | Élevée |
| A-t-il décroché ? | onglet caché, 0 interaction 30–60 s | Élevée |
| Il bloque / frustré ? | séries d'erreurs, longues pauses, réponses changées, bouton « perdu » | Bonne |
| Il s'ennuie ? | réponses toutes justes + très rapides | Bonne |
| Il fatigue ? | durée de session, heure, ralentissement global | Moyenne |

### B. Vision — AVEC webcam ⚠️
*Faisabilité : moyenne. Vie privée : zone rouge (biométrie + mineurs).*

En **100 % local dans le navigateur** (MediaPipe / TensorFlow.js / face-api.js), sans jamais envoyer d'image :

- **Visage présent** (oui/non) → présent/absent.
- **Orientation tête + regard** → regarde l'écran ou ailleurs.
- **Yeux mi-clos / clignements** → somnolence.
- **Expression faciale** → « émotion » (content, confus, frustré…) — *le plus sensible ET le moins fiable.*

---

## 3. Le point dur : vie privée + mineurs (RGPD)

- Le **visage / la biométrie** = **données sensibles** (RGPD art. 9). Avec des collégiens → **consentement parental explicite**, analyse d'impact (AIPD/DPIA), justification solide. En établissement, la **CNIL** est très regardante.
- **Règle d'or** : une image ou vidéo ne doit **jamais** quitter l'appareil. Traitement 100 % local, on ne conserve qu'un signal **dérivé, non-biométrique** (ex. « présent / regarde ailleurs »), jamais l'image.
- Le **comportemental évite tout cela** : pas de biométrie, reste local → beaucoup plus simple à assumer.

**Conséquence directe pour nous :** comme on vise **aussi l'école**, un produit qui **dépend** de la caméra ne passera pas partout (beaucoup d'établissements refuseront). Le seul socle qui **fonctionne dans tous les contextes** est le **comportemental**. La caméra ne peut être qu'un **bonus optionnel, maison uniquement, opt-in** — jamais une dépendance.

---

## 4. Une réalité qui simplifie la décision

- La **reconnaissance d'émotion faciale est scientifiquement peu fiable** (biais culturels, « visage neutre » ≠ pas concentré…). Pour l'**attention**, les **proxys comportementaux sont souvent MEILLEURS** qu'une webcam qui tente de lire un visage.
- **Ce que la caméra ajoute réellement** au comportemental est **mince** : surtout de la nuance sur un état déjà détecté (présent mais absent mentalement), + la somnolence. Gain marginal réel mais faible, pour un coût élevé.
- **Faux positifs = poison** : un système qui embête l'élève est pire que pas de système. Réagir **doucement et rarement**.
- **Le signal le plus fiable est déclaratif** : lui **demander** (« ça va, tu suis ? », pouce haut/bas, bouton « perdu ») coûte 0 en vie privée et est souvent plus juste qu'une IA qui devine.

---

## 5. Ce qu'on FAIT du signal (la vraie valeur)

Relier l'état détecté à une **réaction de Léa**, dans le **style du prof choisi** (les « souls ») :

| État détecté | Réaction de Léa |
|---|---|
| Absent | met en pause, « Tu es toujours là ? », ne gâche pas le cours |
| Distrait | rappel doux / micro-pause |
| Bloqué, frustré | ralentit, adoucit, propose un indice, encourage |
| S'ennuie | monte la difficulté, saute une étape |
| Fatigué | « On fait une pause ? » |

Exemples concrets (MVP) :
- Série d'erreurs → Léa ralentit et propose un indice.
- Élève parti 40 s → au retour : « Re ! On reprend où on s'était arrêtés ? »
- 5 bonnes réponses éclair → « Tu gères, on corse un peu ? »

---

## 6. Briques déjà en place

- `suivi.js` — tentatives / erreurs par notion.
- Bouton **« Je suis perdu·e »** — auto-déclaration (signal honnête et gratuit).
- Bouton **« Lever la main » / « Parle à Léa »** — sollicitation d'aide.
- Le **tuteur** (fonction Edge) qui peut **adapter** sa réponse selon un contexte.
- Principe **« aucune donnée ne quitte le navigateur »** déjà tenu.

→ La brique comportementale se greffe **naturellement** sur l'existant.

---

## 7. Recommandation : approche par paliers

1. **Palier 2a — Moteur « attention & effort » comportemental** (sans caméra) + boucle de réaction de Léa.
   → ~80 % de la valeur, ~5 % du risque. **À faire en premier.**
2. **Mesurer** : est-ce que ça suffit ? (souvent oui).
3. **Palier 2b — Webcam « présence / regard » optionnelle** (maison, opt-in, consentement) : 100 % local, ne sort qu'un signal grossier « présent / ailleurs / absent ». Jamais d'image stockée.
4. **Palier 2c — Émotion faciale** : à garder en **veille R&D**, hors produit pour l'instant (fiabilité + juridique trop lourds).

---

## 8. Décisions à trancher (avec l'associé)

- [ ] **Ambition cible** : on s'arrête au comportemental (2a) ? On planifie la webcam présence (2b) ? On explore l'émotion (2c) ?
- [ ] **Priorité** : la détection est-elle un chantier phase 2 immédiat, ou après d'autres features ?
- [ ] **Le « cerveau »** : règles simples (si erreurs > N → indice) vs scoring d'un « état » plus global ? (Commencer simple recommandé.)
- [ ] **Restitution éducateur/parent** : veut-on un tableau de bord « zones de blocage / temps de concentration » ? (Fort intérêt côté école.)
- [ ] **Cadre juridique** : si on envisage la caméra un jour, prévoir consentement + mentions + (pour l'école) AIPD. À anticiper même si repoussé.
- [ ] **Garde-fous UX** : seuils de réaction (rareté, douceur), et privilégier le **déclaratif** quand c'est possible.

---

## 9. Avis synthétique

Le **comportemental sans caméra** offre l'essentiel de la valeur, fonctionne **maison ET école**, et ne pose aucun problème de vie privée. **On construit ça d'abord.** La caméra reste une option maison, opt-in, à décider plus tard — et l'émotion faciale n'est pas mûre pour un produit destiné à des mineurs.
