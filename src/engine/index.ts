/**
 * Baril du moteur — implémentations Phase 1 (derrière les contrats du §4).
 *
 * Contrairement au baril des contrats, on exporte ici des VALEURS (classes,
 * fonctions) : ce sont les implémentations remplaçables (P3).
 */

export * from './core.js';
export * from './verifier/verifier-standard.js';
export * from './verifier/expression.js';
export * from './learner-model/heuristic-learner-model.js';
export * from './learner-model/bkt-learner-model.js';
export * from './curriculum/in-memory-curriculum.js';
export * from './curriculum/yaml-loader.js';
export * from './curriculum/banque.js';
export * from './erreurs/catalogue-erreurs.js';
export * from './safety/minimal-safety-filter.js';
export * from './persistence/in-memory-store.js';
export * from './persistence/pg-store.js';
export * from './session/lecon.js';
export * from './orchestrator/llm-scripte.js';
export * from './orchestrator/conversation-orchestrator.js';
export * from './planning/planificateur.js';
export * from './planning/exercice-a-etapes.js';
export * from './planning/eval-types.js';
export * from './rag/in-memory-rag.js';
export * from './dashboard/dashboard.js';
export * from './persona/catalogue-personas.js';
export * from './presence/avatars.js';
export * from './presence/voix-texte.js';
export * from './llm/llm-gateway-stub.js';
export * from './llm/anthropic-gateway.js';
export * from './scale/registre-tenants.js';
