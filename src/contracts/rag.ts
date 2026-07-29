/**
 * RAG — récupération augmentée (Phase 2 ; pgvector, §5 `embeddings`).
 *
 * Contrat minimal et source-agnostique : un `Embedder` transforme un texte en
 * vecteur, un `RetrievalIndex` stocke des documents tenant-scopés et renvoie
 * les plus proches. La Phase 2 branchera pgvector + un vrai modèle d'embeddings
 * sans toucher les appelants (P3). Tout est tenant-scopé (cloison, D7).
 */

import type { ObjectifId, TenantId } from './common.js';

/** Transforme un texte en vecteur dense. Remplaçable (modèle réel en P2). */
export interface Embedder {
  readonly dimensions: number;
  plonger(texte: string): Promise<readonly number[]>;
}

/** Document indexable (extrait de cours, explication, exemple résolu…). */
export interface DocumentRag {
  readonly tenant_id: TenantId;
  readonly id: string;
  readonly texte: string;
  readonly objectif_id?: ObjectifId;
}

/** Résultat de recherche : document + score de similarité [0,1]. */
export interface ResultatRag {
  readonly document: DocumentRag;
  readonly score: number;
}

/** Index de récupération tenant-scopé (cosine). Remplaçable par pgvector (P2). */
export interface RetrievalIndex {
  indexer(document: DocumentRag): Promise<void>;
  rechercher(
    tenant_id: TenantId,
    requete: string,
    k: number,
  ): Promise<readonly ResultatRag[]>;
}
