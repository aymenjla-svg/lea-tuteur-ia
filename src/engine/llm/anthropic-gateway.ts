/**
 * AnthropicLLMGateway — `LLMGateway` réel via le SDK officiel Anthropic (D1).
 *
 * C'est l'implémentation de PRODUCTION du contrat : le LLM « parle » pour de
 * vrai. Le LLM scriptable reste pour les tests ; celui-ci se branche derrière
 * le même contrat (P3) dès qu'une clé est fournie.
 *
 * ⚠️ Nécessite `ANTHROPIC_API_KEY` (env) et un accès réseau — donc NON exécuté
 * ni testé bout-à-bout dans ce dépôt headless. Le code suit la référence API à
 * jour : modèle par défaut `claude-opus-4-8`, streaming, function-calling pour
 * les 2 outils code dur. Pas de `temperature`/`top_p`/`budget_tokens` (rejetés
 * en 400 sur Opus 4.8). `thinking` omis par défaut (latence : budget premier
 * son < ~1 s, R4) — activable si besoin.
 *
 * §1.7 (NON reportable) : pour un mineur, on n'autorise la génération que si le
 * déploiement est configuré conforme + no-train ; sinon on LÈVE.
 *
 * Limite connue du contrat minimal : un aller-retour d'outil Anthropic complet
 * exige que l'historique porte les blocs `tool_use` appariés aux `tool_result`.
 * Le contrat `MessageLLM` (role/contenu/tool_call_id) suffit au chemin parole ;
 * pour des tours d'outils LLM-pilotés bout-à-bout, enrichir le contrat (ou
 * laisser ce gateway gérer son propre état Anthropic par session). Documenté
 * ici plutôt que masqué.
 */

import Anthropic from '@anthropic-ai/sdk';

import type {
  ComplianceContext,
  FragmentLLM,
  LLMGateway,
  MessageLLM,
  ModeIA,
  ProviderResolu,
  RequeteLLM,
  ToolCall,
} from '../../contracts/index.js';

export interface OptionsAnthropic {
  /** Modèle (défaut : le plus capable — claude-opus-4-8). */
  readonly modele?: string;
  /** Le déploiement honore-t-il la conformité mineur (no-train contractuel) ? */
  readonly conformeMineur?: boolean;
  /** Clé API (défaut : ANTHROPIC_API_KEY dans l'environnement). */
  readonly apiKey?: string;
  /** Client injectable (tests). */
  readonly client?: Anthropic;
  /** Plafond de tokens par réponse (défaut 1024 — réponses de tuteur courtes). */
  readonly maxTokens?: number;
}

export class AnthropicLLMGateway implements LLMGateway {
  readonly #client: Anthropic;
  readonly #modele: string;
  readonly #conformeMineur: boolean;
  readonly #maxTokens: number;

  constructor(opts: OptionsAnthropic = {}) {
    this.#modele = opts.modele ?? 'claude-opus-4-8';
    this.#conformeMineur = opts.conformeMineur ?? false;
    this.#maxTokens = opts.maxTokens ?? 1024;
    this.#client =
      opts.client ?? new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {});
  }

  resoudreProvider(
    conformite: ComplianceContext,
    _mode_ia: ModeIA,
  ): ProviderResolu {
    if (conformite.est_mineur) {
      // §1.7 : conforme + no-train obligatoires, non négociable.
      if (!this.#conformeMineur || !conformite.no_train) {
        throw new Error(
          'Déploiement non conforme pour un mineur (conforme + no-train requis) — §1.7.',
        );
      }
      return { nom: 'anthropic', conforme_mineur: true, no_train: true };
    }
    return {
      nom: 'anthropic',
      conforme_mineur: this.#conformeMineur,
      no_train: conformite.no_train,
    };
  }

  async *streamer(requete: RequeteLLM): AsyncIterable<FragmentLLM> {
    // Vérifie la conformité AVANT toute génération (peut lever — §1.7).
    this.resoudreProvider(requete.conformite, requete.mode_ia);

    const { system, messages } = traduireMessages(requete.messages);
    const tools = requete.outils.map((o) => ({
      name: o.nom,
      description: o.description,
      input_schema: o.parametres as Anthropic.Tool.InputSchema,
    }));

    const flux = this.#client.messages.stream({
      model: this.#modele,
      max_tokens: requete.max_tokens ?? this.#maxTokens,
      messages,
      ...(system ? { system } : {}),
      ...(tools.length > 0 ? { tools } : {}),
    });

    // Suivi des blocs `tool_use` (l'input JSON arrive en deltas).
    const outilsEnCours = new Map<number, { id: string; nom: string; json: string }>();

    for await (const e of flux) {
      if (e.type === 'content_block_start' && e.content_block.type === 'tool_use') {
        outilsEnCours.set(e.index, {
          id: e.content_block.id,
          nom: e.content_block.name,
          json: '',
        });
      } else if (e.type === 'content_block_delta') {
        if (e.delta.type === 'text_delta') {
          yield { type: 'texte', delta: e.delta.text };
        } else if (e.delta.type === 'input_json_delta') {
          const t = outilsEnCours.get(e.index);
          if (t) t.json += e.delta.partial_json;
        }
      } else if (e.type === 'content_block_stop') {
        const t = outilsEnCours.get(e.index);
        if (t) {
          outilsEnCours.delete(e.index);
          const appel: ToolCall = {
            id: t.id,
            nom: t.nom,
            arguments: parserJson(t.json),
          };
          yield { type: 'tool_call', appel };
        }
      }
    }

    const final = await flux.finalMessage();
    const raison: 'stop' | 'tool' | 'longueur' =
      final.stop_reason === 'tool_use'
        ? 'tool'
        : final.stop_reason === 'max_tokens'
          ? 'longueur'
          : 'stop';
    yield { type: 'fin', raison };
  }
}

/* ------------------------------------------------------------------------- */
/* Traduction MessageLLM (contrat) → format Messages API Anthropic            */
/* ------------------------------------------------------------------------- */

function traduireMessages(messages: readonly MessageLLM[]): {
  system?: string;
  messages: Anthropic.MessageParam[];
} {
  const systeme = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.contenu)
    .join('\n\n')
    .trim();

  const out: Anthropic.MessageParam[] = [];
  let tampon: Anthropic.ToolResultBlockParam[] = [];
  const vider = (): void => {
    if (tampon.length > 0) {
      out.push({ role: 'user', content: tampon });
      tampon = [];
    }
  };

  for (const m of messages) {
    if (m.role === 'system') continue;
    if (m.role === 'tool') {
      tampon.push({
        type: 'tool_result',
        tool_use_id: m.tool_call_id ?? 'inconnu',
        content: m.contenu,
      });
      continue;
    }
    vider();
    out.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: [{ type: 'text', text: m.contenu }],
    });
  }
  vider();

  return systeme ? { system: systeme, messages: out } : { messages: out };
}

function parserJson(brut: string): Record<string, unknown> {
  if (!brut) return {};
  try {
    const v: unknown = JSON.parse(brut);
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
