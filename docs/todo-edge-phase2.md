# Phase 2 — modifications Edge à faire ensemble (demain)

> Ces features ont **leur front déjà prêt** (ou presque) ; il ne manque qu'un
> ajout dans la fonction Edge `supabase/functions/tuteur/index.ts`, **à
> redéployer par toi** (dashboard Supabase → Deploy).
> Rien ici n'est bloquant : sans ces ajouts, le front fonctionne, il ne
> personnalise juste pas encore.

Ordre conseillé : **#6 (2 min) → #1 texte → #2 → #1 photo**.

---

## #6 — Centres d'intérêt (le plus simple)

Le front envoie déjà `contexte.interets` (ex. `["foot","jeuxvideo"]`). Il suffit
que le prompt s'en serve.

**1) Ajoute le champ dans l'interface `Contexte` :**
```ts
interface Contexte {
  // …existant…
  interets?: string[];   // centres d'intérêt de l'élève (perso des exemples)
}
```

**2) Dans `systeme(ctx, …)`, avant le `return`, ajoute :**
```ts
const interets = (ctx.interets ?? []).filter(Boolean).slice(0, 8);
const persoInterets = interets.length
  ? `\n\nCentres d'intérêt de l'élève : ${interets.join(', ')}. Quand c'est pertinent et NATUREL, illustre avec un exemple tiré de ces domaines (sans forcer, sans jamais sortir du programme de physique).`
  : '';
```
puis insère `${persoInterets}` dans la chaîne du prompt (par ex. juste après
`${adresseEleve(ctx)}`).

---

## #1 — Aide aux devoirs (version TEXTE d'abord)

But : l'élève colle/tape un exercice de SES devoirs, Léa l'aide **sans donner la
réponse**. (Le front : un champ « colle ton exo » qui envoie la question avec
`contexte.devoir = true` — à brancher ensemble ; on peut aussi réutiliser le
bouton « Parle à Léa » existant.)

**1) Champ `Contexte` :**
```ts
devoir?: boolean;   // l'élève soumet un exercice de ses devoirs (aide guidée)
```

**2) Dans `systeme()`, ajoute un bloc (et insère-le dans le prompt) :**
```ts
const devoir = ctx.devoir
  ? `\n\nL'élève te soumet un EXERCICE DE SES DEVOIRS (pas une question de cours). Règles STRICTES :
- Ne donne JAMAIS la réponse finale ni le résultat numérique.
- Guide PAS À PAS, une seule étape à la fois : quelle grandeur cherche-t-on ? quelle relation ? quelle conversion ?
- Termine par une petite question qui fait avancer l'élève.
- Si l'exercice sort du programme de physique cycle 4, dis-le gentiment.`
  : '';
```
(C'est proche du mode `en_exercice` déjà présent, mais pour un énoncé externe.)

---

## #2 — Apprends en enseignant (l'élève explique à Léa)

But : inverser les rôles — un personnage « qui n'a pas compris » et **l'élève
explique**. Effet protégé (très efficace). Front à construire ensemble (un mode
+ le choix de la notion).

**1) Champ `Contexte` :**
```ts
mode?: 'question' | 'enseigner';
notion_a_enseigner?: string;   // ex. « la loi d'Ohm »
```

**2) Dans `systeme()`, au tout début, si `ctx.mode === 'enseigner'`, on remplace
le cadrage « prof » par un cadrage « élève à qui on enseigne »** (garde le
PROGRAMME, la charte et les garde-fous). Exemple :
```ts
if (ctx.mode === 'enseigner') {
  const nom = (ctx.prof?.nom ?? 'Léa');
  return `Tu es ${nom}, mais ici tu JOUES un·e élève de collège qui n'a pas encore bien compris « ${ctx.notion_a_enseigner ?? ctx.notion ?? 'cette notion'} ». C'est l'AUTRE (l'utilisateur) qui est le professeur et va t'expliquer.
Ton rôle :
- Pose des questions naïves et curieuses, fais parfois une petite erreur plausible (une confusion typique), demande « pourquoi ? », « et si… ? ».
- Ne donne PAS le cours toi-même, ne corrige pas frontalement : laisse l'élève-prof t'expliquer.
- Quand son explication est juste et claire, montre que tu as compris et félicite-le chaleureusement.
- Reste bienveillant·e, dans le programme de physique cycle 4, phrases courtes.

${PROGRAMME}

Réponds UNIQUEMENT en JSON : {"reponse":"<ta réplique d'élève>","tableau":[],"dans_programme":true}`;
}
```
(À placer juste après `function systeme(ctx, extraits = []) {`.)

**Note sécurité** : `filtrerEntree` / `filtrerSortie` restent actifs et
s'appliquent aussi à ce mode — ne pas les retirer.

---

## #1 (suite) — Photo de l'exo (vision)

Nécessite un **modèle vision** (le texte seul ne suffit pas). Points clés :
- Le front enverra une image en **base64** (`{ image: "data:image/jpeg;base64,…" }`),
  redimensionnée (~1024 px) et **jamais stockée**.
- Dans `appelLLM`, si une image est présente, l'ajouter comme *content block* :
  - **OpenAI-compatible** : `content: [{type:'text',text:user},{type:'image_url',image_url:{url:image}}]` et un modèle vision (`gpt-4o-mini` supporte la vision).
  - **Anthropic** : `content: [{type:'text',text:user},{type:'image',source:{type:'base64',media_type:'image/jpeg',data:<base64 sans préfixe>}}]` avec un modèle vision.
- Appliquer les mêmes règles que #1 texte (guider, ne pas donner la réponse).
- ⚠️ Vérifier que le provider est **conforme mineurs + no-train** pour l'image.

À faire ensemble (choix du modèle vision selon ton provider actuel).

---

## Rappels
- Après chaque modif : **redeploy** de la fonction `tuteur` (dashboard Supabase).
- Ne jamais retirer : filtres de sécurité, format JSON de sortie, borne PROGRAMME.
- Le front correspondant (#1 champ « colle ton exo », #2 mode « explique à Léa »)
  se branchera vite une fois l'Edge prête — on le fait ensemble.
