# Léa — tuteur IA incarné

> Un professeur particulier incarné (visage, regard, voix) piloté par un moteur
> pédagogique rigoureux. **Le LLM parle ; le moteur déterministe sait, vérifie,
> tient le cadre.**

Ce dépôt implémente la vision décrite dans `SPEC.md` (v2). **Source de vérité :
le SPEC.** Ce README décrit l'état du code, pas la stratégie.

---

## État : Phase 1 — Tranche verticale (texte seul)

Le SPEC impose de procéder **par tranches verticales, jamais la largeur
d'abord** (§12). Deux couches sont en place :

- **Phase 0** — les **contrats** du §4 (`src/contracts/`) : interfaces pures,
  zéro implémentation (P3 : tout remplaçable sans réécriture).
- **Phase 1** — une **tranche verticale minuscule** (`src/engine/`) : 1 objectif,
  texte seul, sans avatar/voix/BKT, qui exécute la boucle complète

  ```
  proposer(template prof) → verifier(code dur) → maj maîtrise (heuristique)
  → persister (tentative + events) → progression (coup suivant)
  ```

  avec `tenant_id`/timestamps/`events`/`SafetyFilter` **dès maintenant** (§13).

Tout vit à la racine du dépôt. Pile : monolithe modulaire **Node/TypeScript**
(D8), ESM `NodeNext`, `strict` + `noUncheckedIndexedAccess` +
`exactOptionalPropertyTypes` + `verbatimModuleSyntax`.

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
le tuteur re-propose avec indice ; au-delà, il joue un **levier** (`simplifier`
vers le prérequis · `reformuler` · `changer_de_modalité`) choisi par les
**paramètres** de la persona (§7), pas par un prompt.

## Développement

```bash
npm install        # devDeps : typescript, tsx, @types/node
npm run typecheck  # tsc --noEmit — DOIT passer sans erreur
npm test           # 20 tests (node:test via tsx) — verifier, learner, safety, boucle
npm run demo       # joue une séance complète en texte (dialogue + télémétrie)
npm run build      # compile vers dist/ (déclarations incluses)
```

> Aucune dépendance **runtime** : le moteur Phase 1 est du TypeScript pur.

---

## Prochaines étapes (phasage §12)

- **P1 — Tranche verticale minuscule.** ✅ _Fait._ 1 objectif, texte seul, sans
  avatar/voix/BKT : `proposer`(template d'exo prof) → `verifier`(code) → màj
  heuristique → persister → progression. Avec `tenant_id`/timestamps/`events`/
  `SafetyFilter` minimal en place.
- **P2 — Moteur complet.** BKT + decay, tous les coups, banque + verifier
  multi-type, erreurs-types, RAG, dashboard.
- **P3 — Présence.** SVG → RPM/R3F, voix streaming, attention, personas.
- **P4 — Échelle.** Notions, multi-curriculum, multi-tenant durci,
  multi-région, `mode_ia`, marketplace personas.

## Hors-périmètre v1 (§14)

RL · DKT · speech-to-speech premium · multi-matières · marketplace personas.
