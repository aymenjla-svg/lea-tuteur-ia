// =============================================================================
// Indexeur RAG — encode le CONTENU des cours dans la table `embeddings`.
//
// Source de vérité = web/cours.js (le même contenu déterministe que l'élève
// voit). Chaque scène devient un passage (titre + points + narration), encodé
// en vecteur 768-d, puis inséré (upsert) dans Supabase. La fonction Edge
// `tuteur` s'en sert pour ancrer ses réponses.
//
// Usage :
//   SUPABASE_URL=https://<projet>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   OPENAI_API_KEY=sk-... \
//   TENANT_ID=<tenant> \
//   node scripts/indexer-cours.mjs
//
// Variables optionnelles : EMBED_MODEL (défaut text-embedding-3-small),
// EMBED_DIM (défaut 768, doit correspondre à la colonne vector(768)).
// =============================================================================

import { COURS } from '../web/cours.js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY,
  TENANT_ID,
  EMBED_MODEL = 'text-embedding-3-small',
  EMBED_DIM = '768',
} = process.env;

for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, TENANT_ID })) {
  if (!v) { console.error(`Variable d'environnement manquante : ${k}`); process.exit(1); }
}
const DIM = Number(EMBED_DIM);

const sansBalises = (s) => String(s).replace(/<[^>]+>/g, '').trim();

// 1) Construire les passages (un par scène).
function passages() {
  const out = [];
  for (const [moduleId, cours] of Object.entries(COURS)) {
    (cours.scenes ?? []).forEach((sc, i) => {
      const pts = (sc.points ?? []).map(sansBalises).join(' · ');
      const texte = [`Module ${moduleId} — ${sc.titre}`, pts, sansBalises(sc.narration ?? '')]
        .filter(Boolean).join('\n');
      out.push({ id: `${moduleId}-${String(i).padStart(2, '0')}`, texte });
    });
  }
  return out;
}

// 2) Encoder un lot de textes (OpenAI, dimensions = 768 pour matcher la colonne).
async function encoder(textes) {
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: textes, dimensions: DIM }),
  });
  if (!r.ok) throw new Error(`OpenAI embeddings ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.data.map((d) => d.embedding);
}

// 3) Upsert dans Supabase via PostgREST (résolution merge sur la clé primaire).
async function upsert(lignes) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/embeddings?on_conflict=tenant_id,id`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(lignes),
  });
  if (!r.ok) throw new Error(`Supabase upsert ${r.status}: ${await r.text()}`);
}

const chunks = passages();
console.log(`${chunks.length} passages à indexer (dim ${DIM})…`);
const vecteurs = await encoder(chunks.map((c) => c.texte));
const lignes = chunks.map((c, i) => ({
  tenant_id: TENANT_ID,
  id: c.id,
  objectif_id: null,
  texte: c.texte,
  embedding: `[${vecteurs[i].join(',')}]`, // littéral vector pgvector
}));
await upsert(lignes);
console.log(`✓ ${lignes.length} passages indexés dans embeddings (tenant ${TENANT_ID}).`);
