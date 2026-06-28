/**
 * Baril du moteur — implémentations Phase 1 (derrière les contrats du §4).
 *
 * Contrairement au baril des contrats, on exporte ici des VALEURS (classes,
 * fonctions) : ce sont les implémentations remplaçables (P3).
 */

export * from './core.js';
export * from './verifier/verifier-standard.js';
export * from './learner-model/heuristic-learner-model.js';
export * from './curriculum/in-memory-curriculum.js';
export * from './safety/minimal-safety-filter.js';
export * from './persistence/in-memory-store.js';
export * from './session/lecon.js';
