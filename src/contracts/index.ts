/**
 * Baril des contrats — Phase 0 (SPEC §4, §12).
 *
 * Surface publique des interfaces de Léa. Aucune implémentation ici : P3
 * (tout derrière des contrats, remplaçable sans réécriture). Les implémentations
 * arrivent en Phase 1 (tranche verticale minuscule, §12).
 *
 * `verbatimModuleSyntax` impose `export type` pour des ré-exports purement
 * typés.
 */

export type * from './common.js';
export type * from './verifier.js';
export type * from './curriculum.js';
export type * from './learner-model.js';
export type * from './safety-filter.js';
export type * from './llm-gateway.js';
export type * from './persona.js';
export type * from './avatar.js';
export type * from './voice.js';
export type * from './attention.js';
export type * from './orchestrator.js';
