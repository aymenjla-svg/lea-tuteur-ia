/**
 * RAG en mémoire (Phase 2, §5 `embeddings`).
 *
 * - `StubEmbedder` : embedding déterministe par hachage de tokens (sac de mots
 *   projeté + normalisation L2). Pas un vrai modèle — c'est un BOUCHON honnête
 *   qui respecte le contrat `Embedder` et permet de tester la chaîne RAG.
 * - `InMemoryRetrievalIndex` : index cosinus tenant-scopé (cloison D7).
 *
 * En production (Phase 2), on branche pgvector + un modèle d'embeddings réel
 * sans toucher les appelants (P3).
 */

import type {
  DocumentRag,
  Embedder,
  ResultatRag,
  RetrievalIndex,
  TenantId,
} from '../../contracts/index.js';
import { normaliser } from '../core.js';

function hacher(token: string, dims: number): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % dims;
}

export class StubEmbedder implements Embedder {
  constructor(readonly dimensions: number = 64) {}

  async plonger(texte: string): Promise<readonly number[]> {
    const v = new Array<number>(this.dimensions).fill(0);
    for (const token of normaliser(texte).split(' ')) {
      if (!token) continue;
      const idx = hacher(token, this.dimensions);
      v[idx] = (v[idx] ?? 0) + 1;
    }
    const norme = Math.hypot(...v) || 1;
    return v.map((x) => x / norme);
  }
}

function cosinus(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += (a[i] ?? 0) * (b[i] ?? 0);
  return dot; // vecteurs déjà normalisés
}

interface Entree {
  readonly document: DocumentRag;
  readonly vecteur: readonly number[];
}

export class InMemoryRetrievalIndex implements RetrievalIndex {
  readonly #parTenant = new Map<TenantId, Entree[]>();

  constructor(private readonly embedder: Embedder) {}

  async indexer(document: DocumentRag): Promise<void> {
    const vecteur = await this.embedder.plonger(document.texte);
    const liste = this.#parTenant.get(document.tenant_id) ?? [];
    liste.push({ document, vecteur });
    this.#parTenant.set(document.tenant_id, liste);
  }

  async rechercher(
    tenant_id: TenantId,
    requete: string,
    k: number,
  ): Promise<readonly ResultatRag[]> {
    const liste = this.#parTenant.get(tenant_id) ?? [];
    const q = await this.embedder.plonger(requete);
    return liste
      .map((e) => ({ document: e.document, score: cosinus(q, e.vecteur) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(0, k));
  }
}
