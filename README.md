# Léa — tuteur IA incarné

> Un professeur particulier incarné (visage, regard, voix) piloté par un moteur
> pédagogique rigoureux. **Le LLM parle ; le moteur déterministe sait, vérifie,
> tient le cadre.**

Ce dépôt implémente la vision décrite dans `SPEC.md` (v2). **Source de vérité :
le SPEC.** Ce README décrit l'état du code, pas la stratégie.

---

## État : Phases 0 → 2 + seams 3/4

Le SPEC impose de procéder **par tranches verticales, jamais la largeur
d'abord** (§12). En place :

- **Phase 0** — **contrats** du §4 (`src/contracts/`) : interfaces pures, zéro
  implémentation (P3 : tout remplaçable sans réécriture).
- **Phase 1** — **tranche verticale** (texte seul) : la boucle complète

  ```
  proposer(template prof) → verifier(code dur) → maj maîtrise → persister(events) → progression
  ```

- **Phase 2** — **moteur complet** : BKT, verifier multi-type (numeric · qcm ·
  symbolic · libre), erreurs-types, banque d'exercices paramétrée, révision
  espacée, RAG, dashboard.
- **Phases 3/4 (seams)** — implémentations de présence et d'échelle **faisables
  en backend** : personas (3 facettes), avatars texte/SVG, voix « texte »,
  attention désactivée, **LLMGateway** avec résolution de provider conforme
  (§1.7), registre multi-tenant.

> ⚠️ **Non « terminable » dans ce dépôt backend** : l'incarnation réelle
> (avatar 3D RPM/R3F, voix streaming premium, LLM live) exige un **frontend** et
> des **providers avec clés**. Tout est posé derrière les contrats, prêt à
> brancher — mais c'est hors périmètre d'un repo Node headless.

En plus : **boucle agentique réelle** (`ConversationOrchestrator` + LLM
scriptable, 2 outils code dur), **planificateur** de progression (DAG),
**exercices à étapes**, **3 types d'éval**, **API HTTP** JSON, **curriculum
YAML versionné** et **CI**.

Pile : monolithe modulaire **Node/TypeScript** (D8), ESM `NodeNext`, `strict` +
`noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` +
`verbatimModuleSyntax`. **69 tests**, `typecheck` vert.

### Invariants gravés dans les types (SPEC §1, §13)

| Invariant | Où il vit dans le code |
|---|---|
| `tenant_id` + timestamps **partout** (§13) | `Aggregate = TenantScoped & Timestamped` ; tout agrégat en dérive |
| Ne **jamais valider du faux** (§1.1) | `Verdict` porte une marque privée : seul le `Verifier` peut en produire un |
| La **vidéo de l'enfant ne sort jamais** (§1.4) | `AttentionSource` n'expose que des signaux dérivés ; `FrameAvatar` = visèmes/regard synthétiques |
| **Mineur → provider conforme + no-train** (§1.7, non reportable) | `LLMGateway` résout le provider via `ComplianceContext` (paramètre obligatoire) |
| Sécurité du dialogue (§1.6) | `SafetyFilter` : filtre de sortie + détresse → `SafetyAlert` (escalade adulte) |

---

## Tableau des contrats (§4)

| Contrat | Fichier | Rôle |
|---|---|---|
| *(primitives)* | `src/contracts/common.ts` | IDs typés (branded), `TenantScoped`, `Timestamped`, `Aggregate`, `ModeIA`, `Region`, `ComplianceContext`, `Modalite`, `Competence`, `Result`, `DomainEvent`/`EventSink` |
| **Verifier** | `src/contracts/verifier.ts` | Outil code dur n°1 (D1). Kinds `numeric\|symbolic\|qcm\|libre`. Seul producteur de `Verdict` (§1.1) |
| **Curriculum** | `src/contracts/curriculum.ts` | DAG d'objectifs atomiques (D2), `Prerequis`, `ExerciceTemplate` (origine prof/llm, `representations[]` R7) |
| **CatalogueErreurs** | `src/contracts/erreurs.ts` | `ErreurType` (méprises fréquentes, remédiation) — §5/§6 |
| **RAG** | `src/contracts/rag.ts` | `Embedder` + `RetrievalIndex` tenant-scopé (seam pgvector, §5) |
| **LearnerModel** | `src/contracts/learner-model.ts` | Heuristique → BKT (D3/R2), decay appliqué **au calcul** (D4), `ProfilCompetences` (6 compétences) |
| **SafetyFilter** | `src/contracts/safety-filter.ts` | Filtre sortie + détresse → `SafetyAlert` (R5), escalade adulte |
| **LLMGateway** | `src/contracts/llm-gateway.ts` | Multi-rôle, `mode_ia`, stream agentique (`ToolSpec`/`ToolCall`), provider résolu via conformité (D6/R3) |
| **Persona** | `src/contracts/persona.ts` | 3 facettes séparées : `Apparence` (RPM+voix), `Soul` (style), `ParametresPedagogie` (paramètres moteur) (D9, §7) |
| **Avatar** | `src/contracts/avatar.ts` | Paliers de présence `3d\|2d_svg\|texte_voix\|texte` (R6), `FrameAvatar` (jamais de caméra) |
| **Voice** | `src/contracts/voice.ts` | Streaming TTS/STT + barge-in, budget premier son < ~1 s (D11/R4) |
| **AttentionSource** | `src/contracts/attention.ts` | Signal pédagogique source-agnostique, 100 % local, signaux dérivés seulement (D12/D10) |
| **ConversationOrchestrator** | `src/contracts/orchestrator.ts` | Boucle agentique, parole immédiate / outils en fond (R4), 2 outils code dur, coups R7 |

---

## Implémentations Phase 1 (`src/engine/`)

Chaque brique implémente un contrat du §4 — remplaçable (P3) sans toucher les
appelants. Persistance en mémoire pour l'instant (→ Postgres/RLS en Phase 2).

| Implémentation | Fichier | Contrat | Notes |
|---|---|---|---|
| `VerifierStandard` | `verifier/verifier-standard.ts` | `Verifier` | `numeric` + `qcm` ; seul à produire un `Verdict` (§1.1) |
| `HeuristicLearnerModel` | `learner-model/heuristic-learner-model.ts` | `LearnerModel` | heuristique honnête v1 ; **decay au calcul** (D4) ; profil 6 compétences |
| `InMemoryCurriculum` + `curriculumDemo` | `curriculum/in-memory-curriculum.ts` | `Curriculum` | DAG en mémoire ; seed 1 objectif + 1 prérequis, template **prof** (R1) |
| `MinimalSafetyFilter` | `safety/minimal-safety-filter.ts` | `SafetyFilter` | filtre de sortie (anti-humiliation §1.3) + détresse → `SafetyAlert` escaladée (R5) |
| `MagasinMemoire` | `persistence/in-memory-store.ts` | dépôts + `EventSink` | tentatives, alertes, tours de dialogue, `events` (§13) |
| `MoteurLecon` | `session/lecon.ts` | (préfigure `ConversationOrchestrator`) | boucle déterministe, coups R7, 2 outils code dur |

La boucle gère déjà l'**adaptation R7** : sous le `seuil_blocage` de la persona,
le tuteur re-propose avec indice/remédiation d'erreur-type ; au-delà, il joue un
**levier** (`simplifier` vers le prérequis · `reformuler` · `changer_de_modalité`)
choisi par les **paramètres** de la persona (§7), pas par un prompt.

## Implémentations Phase 2 & seams 3/4

| Implémentation | Fichier | Apport |
|---|---|---|
| `BktLearnerModel` | `learner-model/bkt-learner-model.ts` | BKT 4 paramètres (D3/R2), **même contrat** que l'heuristique → interchangeable |
| `VerifierStandard` (étendu) | `verifier/verifier-standard.ts` + `expression.ts` | 4 familles : `symbolic` par échantillonnage numérique, `libre` par grille de mots-clés |
| erreurs-types | `erreurs/catalogue-erreurs.ts` | `CatalogueErreurs` + pièges prof-authored (R1) → remédiation parlée |
| `Banque` | `curriculum/banque.ts` | templates paramétrés (D5), générateur déterministe avec pièges |
| RAG | `rag/in-memory-rag.ts` | `Embedder` bouchon + index cosinus tenant-scopé (seam pgvector) |
| `tableauDeBord` | `dashboard/dashboard.ts` | projection d'indicateurs depuis la télémétrie (D13) |
| personas | `persona/catalogue-personas.ts` | catalogue 3 facettes + matching (§7, H2) |
| avatars | `presence/avatars.ts` | `TextAvatar` / `SvgAvatar` (R6) — signaux synthétiques, jamais de caméra (§1.4) |
| voix/attention | `presence/voix-texte.ts` | `Voice` mode texte + `AttentionSource` désactivée |
| `LLMGatewayStub` | `llm/llm-gateway-stub.ts` | **résolution de provider sous conformité (§1.7)** — mineur ⇒ conforme + no-train |
| `RegistreTenants` | `scale/registre-tenants.ts` | multi-tenant : `mode_ia`, région, `no_train` forcé pour mineur |

## Boucle agentique, planification, API & contenu

| Brique | Fichier | Rôle |
|---|---|---|
| `ConversationOrchestrateur` | `orchestrator/conversation-orchestrator.ts` | boucle agentique réelle (D1/R4) ; exécute les 2 outils code dur ; le LLM ne voit jamais l'attendu (§1.1) ; cadre déterministe |
| `LLMTuteurScripte` | `orchestrator/llm-scripte.ts` | « LLM » déterministe pour tester la boucle sans provider live |
| `AnthropicLLMGateway` | `llm/anthropic-gateway.ts` | gateway **réel** (SDK Anthropic, `claude-opus-4-8`, streaming) ; résolution conforme §1.7 |
| `Planificateur` | `planning/planificateur.ts` | prochaine action (réviser → travailler/consolider), parcours topologique du DAG, plan diagnostique |
| `ExerciceAEtapes` | `planning/exercice-a-etapes.ts` | exercices multi-étapes (D5) |
| `politiqueEvaluation` | `planning/eval-types.ts` | 3 types d'éval (diagnostique/formative/sommative) |
| API HTTP | `api/serveur.ts` | `/sessions`, `/sessions/:id/repondre`, `/dashboard`, `/health` (node:http) |
| YAML loader | `curriculum/yaml-loader.ts` + `content/*.yaml` | curriculum **versionné** (§6), validé au chargement |

Contenu de départ : `content/bo-cycle3-maths.yaml` (BO cycle 3 — tables,
addition/soustraction/multiplication posées, DAG + pièges → erreurs-types).

### Brancher un vrai LLM

`AnthropicLLMGateway` implémente le contrat `LLMGateway` avec le SDK officiel
(`claude-opus-4-8`, streaming, function-calling). Il se substitue au LLM
scriptable dans l'orchestrateur (P3) :

```ts
import { AnthropicLLMGateway } from './engine/index.js';
const gateway = new AnthropicLLMGateway({ conformeMineur: true }); // ANTHROPIC_API_KEY (env)
const orch = new ConversationOrchestrateur({ /* … */, gateway, /* … */ });
```

Requiert `ANTHROPIC_API_KEY` (cf. `.env.example`) + réseau pour une **exécution
live**. Détail conforme à la référence API : pas de `temperature`/`budget_tokens`
(400 sur Opus 4.8), `thinking` omis (latence R4).

Le contrat `MessageLLM` porte désormais les `tool_calls` d'un tour assistant :
l'orchestrateur enregistre les appels, et le gateway les traduit en blocs
`tool_use` Anthropic **appariés** aux `tool_result` — l'aller-retour d'outil est
donc fidèle de bout en bout. Le **mapping streaming + traduction est testé hors
réseau** (faux client injecté), en plus de la résolution de provider §1.7. Seule
la requête HTTP réelle reste non exécutée ici (clé requise).

## Frontend (palier 2D/SVG, R6)

Client web **sans build ni dépendance**, servi par l'API (`web/`). Démarre une
séance, parle (avatar SVG animé par visèmes/regard **synthétiques** — jamais de
caméra, §1.4), affiche le transcript écrit (P1 : écrit de plein droit), la barre
de maîtrise et un bouton « Je suis perdu·e ». Sélecteur de palier SVG ⇄ texte
seul (R6 : moteur identique). Vérifié dans Chromium (cf. `web/apercu.png`).

```bash
npm run serve     # puis ouvrir http://127.0.0.1:3000
```

### Palier 3D (`web-3d/`, Three.js + Vite)

Avatar **3D** stylisé (Three.js bundlé localement, aucun asset distant), animé
par les mêmes signaux synthétiques, branché sur la **même API**. Vérifié dans
Chromium avec WebGL (cf. `web-3d/apercu.png`).

```bash
cd web-3d && npm install && npm run build   # → web-3d/dist/
cd .. && npm run serve                       # http://127.0.0.1:3000/3d/
```

Le seam **Ready Player Me** (GLB + morph targets pour les visèmes) est documenté
dans `web-3d/README.md` ; il demande un asset/réseau hors de ce dépôt. La **voix
streaming** se branche derrière le contrat `Voice` (clés TTS/STT requises).

## Développement

```bash
npm install        # dep : yaml · devDeps : typescript, tsx, @types/node
npm run typecheck  # tsc --noEmit — DOIT passer sans erreur
npm test           # 69 tests (node:test via tsx)
npm run demo       # séance de leçon complète en texte (dialogue + télémétrie)
npm run demo:avance # capacités P2/P3/P4 (banque, BKT, symbolic, RAG, conformité, dashboard)
npm run serve      # API HTTP du moteur (PORT=3000)
npm run build      # compile vers dist/ (déclarations incluses)
```

> Unique dépendance runtime : `yaml` (chargement du curriculum versionné, §6).
> CI : `.github/workflows/ci.yml` (typecheck + tests). Hook web optionnel :
> `.claude/settings.sample.json` (à copier en `.claude/settings.json`).

---

## Prochaines étapes (phasage §12)

- **P1 — Tranche verticale minuscule.** ✅ _Fait._ 1 objectif, texte seul, sans
  avatar/voix/BKT : `proposer`(template d'exo prof) → `verifier`(code) → màj
  heuristique → persister → progression. Avec `tenant_id`/timestamps/`events`/
  `SafetyFilter` minimal en place.
- **P2 — Moteur complet.** ✅ _Fait._ BKT + decay, coups R7 + révision, banque +
  verifier multi-type, erreurs-types, RAG, dashboard.
- **P3 — Présence.** ⏳ _Seams en place_ (personas, avatar texte/SVG, voix
  texte, attention désactivée). _Reste_ : avatar 3D RPM/R3F + voix streaming
  premium → **frontend web** (Three.js/R3F) + providers TTS/STT.
- **P4 — Échelle.** ⏳ _Seams en place_ (`LLMGateway` conforme, registre
  tenants, `mode_ia`). _Reste_ : Postgres + RLS réel (remplace la persistance
  mémoire), multi-région, marketplace personas.

## Hors-périmètre v1 (§14)

RL · DKT · speech-to-speech premium · multi-matières · marketplace personas.
