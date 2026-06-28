# Léa — tuteur IA incarné

> Un professeur particulier incarné (visage, regard, voix) piloté par un moteur
> pédagogique rigoureux. **Le LLM parle ; le moteur déterministe sait, vérifie,
> tient le cadre.**

Ce dépôt implémente la vision décrite dans `SPEC.md` (v2). **Source de vérité :
le SPEC.** Ce README décrit l'état du code, pas la stratégie.

---

## État : Phase 0 — Contrats uniquement

Conformément au phasage du SPEC (§12 : « jamais la largeur d'abord »), cette
première étape ne contient **que les interfaces TypeScript** des contrats du §4.
**Aucune implémentation** — principe **P3** : tout derrière des contrats,
remplaçable sans réécriture.

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

## Développement

```bash
npm install        # 1 devDependency : typescript
npm run typecheck  # tsc --noEmit — DOIT passer sans erreur
npm run build      # compile vers dist/ (déclarations incluses)
```

> Aucune dépendance runtime en Phase 0 : ce ne sont que des types.

---

## Prochaines étapes (phasage §12)

- **P1 — Tranche verticale minuscule.** 1 objectif, texte seul, sans
  avatar/voix/BKT : `proposer`(template d'exo prof) → `verifier`(code) → màj
  heuristique → persister → progression. Avec `tenant_id`/timestamps/`events`/
  `SafetyFilter` minimal **dès maintenant**.
- **P2 — Moteur complet.** BKT + decay, tous les coups, banque + verifier
  multi-type, erreurs-types, RAG, dashboard.
- **P3 — Présence.** SVG → RPM/R3F, voix streaming, attention, personas.
- **P4 — Échelle.** Notions, multi-curriculum, multi-tenant durci,
  multi-région, `mode_ia`, marketplace personas.

## Hors-périmètre v1 (§14)

RL · DKT · speech-to-speech premium · multi-matières · marketplace personas.
