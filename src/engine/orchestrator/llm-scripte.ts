/**
 * LLMTuteurScripte — un « LLM » déterministe pour la boucle agentique (D1).
 *
 * Ce n'est PAS un vrai modèle : c'est une politique scriptée qui émet la même
 * séquence parole/appels-d'outils qu'un LLM tuteur produirait, afin de pouvoir
 * TESTER l'orchestrateur agentique sans provider live. Un vrai `LLMGateway`
 * (provider réel) se substitue derrière le même contrat (P3).
 *
 * Protocole suivi à chaque tour (selon le dernier message) :
 *   system (exercice injecté)        → présenter l'exercice (parole), puis stop
 *   user (réponse élève)             → appeler l'outil `verifier`
 *   tool:verifier (verdict)          → appeler l'outil `enregistrerResultat`
 *   tool:enregistrerResultat (ok)    → donner le retour (parole), puis stop
 *
 * La conformité (§1.7) est déléguée à `LLMGatewayStub` : mineur ⇒ provider
 * conforme + no-train (sinon on lève).
 */

import type {
  ComplianceContext,
  FragmentLLM,
  LLMGateway,
  MessageLLM,
  ModeIA,
  ProviderResolu,
  RequeteLLM,
} from '../../contracts/index.js';
import { LLMGatewayStub } from '../llm/llm-gateway-stub.js';

function extraireEnonce(contenu: string): string {
  const m = /Exercice\s*:\s*([\s\S]+)/.exec(contenu);
  return (m?.[1] ?? contenu).trim();
}

function dernierVerdictVerifier(messages: readonly MessageLLM[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg || msg.role !== 'tool') continue;
    try {
      const data = JSON.parse(msg.contenu) as { outil?: string; correct?: boolean };
      if (data.outil === 'verifier') return data.correct === true;
    } catch {
      /* message tool non JSON : on ignore */
    }
  }
  return false;
}

export class LLMTuteurScripte implements LLMGateway {
  readonly #conformite = new LLMGatewayStub();

  resoudreProvider(
    conformite: ComplianceContext,
    mode_ia: ModeIA,
  ): ProviderResolu {
    return this.#conformite.resoudreProvider(conformite, mode_ia);
  }

  async *streamer(requete: RequeteLLM): AsyncIterable<FragmentLLM> {
    // Vérifie la conformité AVANT de « parler » (peut lever — §1.7).
    this.resoudreProvider(requete.conformite, requete.mode_ia);

    const messages = requete.messages;
    const dernier = messages[messages.length - 1];
    const idAppel = `c${messages.length}`;

    if (!dernier) {
      yield { type: 'fin', raison: 'stop' };
      return;
    }

    switch (dernier.role) {
      case 'system': {
        const enonce = extraireEnonce(dernier.contenu);
        yield { type: 'texte', delta: `C’est parti. ${enonce}` };
        yield { type: 'fin', raison: 'stop' };
        return;
      }
      case 'user': {
        yield { type: 'texte', delta: 'Voyons voir…' };
        yield {
          type: 'tool_call',
          appel: {
            id: idAppel,
            nom: 'verifier',
            arguments: { reponse: dernier.contenu },
          },
        };
        yield { type: 'fin', raison: 'tool' };
        return;
      }
      case 'tool': {
        let outil = '';
        try {
          outil = (JSON.parse(dernier.contenu) as { outil?: string }).outil ?? '';
        } catch {
          outil = '';
        }
        if (outil === 'verifier') {
          yield {
            type: 'tool_call',
            appel: { id: idAppel, nom: 'enregistrerResultat', arguments: {} },
          };
          yield { type: 'fin', raison: 'tool' };
          return;
        }
        // tool:enregistrerResultat → retour parlé.
        const correct = dernierVerdictVerifier(messages);
        yield {
          type: 'texte',
          delta: correct
            ? 'Bravo, c’est exact ! 🎉'
            : 'Pas tout à fait — on retente, tu vas y arriver.',
        };
        yield { type: 'fin', raison: 'stop' };
        return;
      }
      default: {
        yield { type: 'fin', raison: 'stop' };
        return;
      }
    }
  }
}
