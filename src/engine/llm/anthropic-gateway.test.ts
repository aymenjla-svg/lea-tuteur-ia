import assert from 'node:assert/strict';
import { test } from 'node:test';

import type {
  ComplianceContext,
  FragmentLLM,
  RequeteLLM,
} from '../../contracts/index.js';
import { AnthropicLLMGateway } from './anthropic-gateway.js';

// Clé factice : permet de construire le client sans réseau (aucune requête
// n'est émise — seul `resoudreProvider` est testé, qui est pur).
function gateway(conformeMineur: boolean): AnthropicLLMGateway {
  return new AnthropicLLMGateway({ apiKey: 'cle-de-test', conformeMineur });
}

function conformite(est_mineur: boolean, no_train: boolean): ComplianceContext {
  return { est_mineur, consentement_adulte: true, no_train, region: 'eu-west' };
}

test('§1.7 : mineur sur déploiement conforme + no-train → autorisé', () => {
  const p = gateway(true).resoudreProvider(conformite(true, true), 'inclus');
  assert.equal(p.nom, 'anthropic');
  assert.equal(p.conforme_mineur, true);
  assert.equal(p.no_train, true);
});

test('§1.7 : mineur sur déploiement NON conforme → lève', () => {
  assert.throws(() => gateway(false).resoudreProvider(conformite(true, true), 'inclus'));
});

test('§1.7 : mineur sans no-train → lève (même si déploiement conforme)', () => {
  assert.throws(() => gateway(true).resoudreProvider(conformite(true, false), 'byok'));
});

test('majeur → autorisé', () => {
  const p = gateway(true).resoudreProvider(conformite(false, false), 'byok');
  assert.equal(p.nom, 'anthropic');
});

/* ------------------------------------------------------------------------- */
/* Streaming + traduction des messages — testés HORS RÉSEAU via faux client   */
/* ------------------------------------------------------------------------- */

/** Faux flux : async-itérable d'événements SSE + finalMessage(). */
function fauxFlux(evenements: unknown[], stop_reason: string) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const e of evenements) yield e;
    },
    async finalMessage() {
      return { stop_reason };
    },
  };
}

test('streamer : mappe deltas texte + tool_use, et traduit l’historique', async () => {
  const evenements = [
    { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tc1', name: 'verifier' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"reponse":' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '"75"}' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'Bravo' } },
    { type: 'content_block_stop', index: 1 },
  ];

  let params: any;
  const fauxClient: any = {
    messages: {
      stream: (p: unknown) => {
        params = p;
        return fauxFlux(evenements, 'tool_use');
      },
    },
  };

  const gw = new AnthropicLLMGateway({ client: fauxClient, conformeMineur: true });

  const requete: RequeteLLM = {
    messages: [
      { role: 'system', contenu: 'Tu es Léa.' },
      { role: 'user', contenu: 'bonjour' },
      { role: 'assistant', contenu: 'Je vérifie', tool_calls: [{ id: 'tc1', nom: 'verifier', arguments: { reponse: '75' } }] },
      { role: 'tool', contenu: '{"outil":"verifier","correct":true}', tool_call_id: 'tc1' },
    ],
    outils: [{ nom: 'verifier', description: 'vérifie', parametres: { type: 'object' } }],
    conformite: conformite(true, true),
    mode_ia: 'inclus',
    role_appelant: 'tuteur',
  };

  const frags: FragmentLLM[] = [];
  for await (const f of gw.streamer(requete)) frags.push(f);

  // 1) Mapping du flux.
  const toolCall = frags.find((f) => f.type === 'tool_call');
  assert.ok(toolCall && toolCall.type === 'tool_call');
  assert.equal(toolCall.appel.id, 'tc1');
  assert.equal(toolCall.appel.nom, 'verifier');
  assert.deepEqual(toolCall.appel.arguments, { reponse: '75' });
  assert.ok(frags.some((f) => f.type === 'texte' && f.delta === 'Bravo'));
  const fin = frags.at(-1);
  assert.ok(fin && fin.type === 'fin' && fin.raison === 'tool');

  // 2) Traduction de l'historique : system extrait, bloc tool_use apparié.
  assert.equal(params.system, 'Tu es Léa.');
  const assistant = params.messages.find((m: any) =>
    m.role === 'assistant' && Array.isArray(m.content) && m.content.some((b: any) => b.type === 'tool_use' && b.id === 'tc1'),
  );
  assert.ok(assistant, 'le message assistant porte le bloc tool_use');
  const resultat = params.messages.find((m: any) =>
    m.role === 'user' && Array.isArray(m.content) && m.content.some((b: any) => b.type === 'tool_result' && b.tool_use_id === 'tc1'),
  );
  assert.ok(resultat, 'le tool_result est apparié au tool_use_id');
});
