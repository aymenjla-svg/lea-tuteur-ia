import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { DocumentRag, TenantId } from '../../contracts/index.js';
import { id } from '../core.js';
import { InMemoryRetrievalIndex, StubEmbedder } from './in-memory-rag.js';

const t1 = id<TenantId>('t1');
const t2 = id<TenantId>('t2');

function doc(tenant_id: TenantId, idDoc: string, texte: string): DocumentRag {
  return { tenant_id, id: idDoc, texte };
}

test('recherche : remonte le document le plus proche', async () => {
  const index = new InMemoryRetrievalIndex(new StubEmbedder(64));
  await index.indexer(doc(t1, 'd1', 'addition et retenue des nombres'));
  await index.indexer(doc(t1, 'd2', 'théorème de Pythagore et triangle'));
  const res = await index.rechercher(t1, 'comment poser une addition avec retenue', 1);
  assert.equal(res.length, 1);
  assert.equal(res[0]?.document.id, 'd1');
  assert.ok((res[0]?.score ?? 0) > 0);
});

test('recherche : cloison tenant (D7) — pas de fuite entre tenants', async () => {
  const index = new InMemoryRetrievalIndex(new StubEmbedder(64));
  await index.indexer(doc(t1, 'd1', 'addition retenue'));
  await index.indexer(doc(t2, 'd2', 'addition retenue'));
  const res = await index.rechercher(t2, 'addition', 5);
  assert.equal(res.length, 1);
  assert.equal(res[0]?.document.id, 'd2');
});
