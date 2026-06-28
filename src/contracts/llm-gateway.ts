/**
 * LLMGateway — passerelle multi-rôle vers les fournisseurs LLM (D6/R3).
 *
 * Le LLM *parle* (D1) : génération agentique en streaming, avec appels d'outils
 * code dur (verifier, enregistrerResultat — cf. orchestrator.ts).
 *
 * Invariant §1.7 (non reportable) : mineur ⇒ provider conforme + no-train,
 * QUEL QUE SOIT le mode de paiement. La résolution du provider passe donc
 * obligatoirement par le `ComplianceContext` — ce n'est pas une option.
 *
 * D6/R3 : multi-rôle ; `mode_ia: inclus|byok` ; dev = clé éditeur (env backend,
 * plafond budget). La passerelle masque ces différences derrière un contrat
 * unique (P3).
 */

import type { ComplianceContext, ModeIA } from './common.js';

/* ------------------------------------------------------------------------- */
/* Messages & rôles                                                           */
/* ------------------------------------------------------------------------- */

export type RoleMessage = 'system' | 'user' | 'assistant' | 'tool';

export interface MessageLLM {
  readonly role: RoleMessage;
  readonly contenu: string;
  /** Pour les messages `tool` : id de l'appel d'outil corrélé. */
  readonly tool_call_id?: string;
  /**
   * Pour un message `assistant` qui appelle des outils : les appels émis lors
   * de ce tour. Indispensable pour reconstituer un historique fidèle côté
   * provider (ex. blocs `tool_use` Anthropic appariés aux `tool_result`).
   */
  readonly tool_calls?: readonly ToolCall[];
}

/* ------------------------------------------------------------------------- */
/* Outils (function calling) — les 2 outils code dur sont déclarés ici        */
/* ------------------------------------------------------------------------- */

/** Spécification d'un outil exposé au LLM (schéma JSON des paramètres). */
export interface ToolSpec {
  readonly nom: string;
  readonly description: string;
  /** JSON Schema des paramètres (gardé opaque au niveau du contrat). */
  readonly parametres: Readonly<Record<string, unknown>>;
}

/** Demande d'appel d'outil émise par le LLM (exécutée par l'orchestrateur). */
export interface ToolCall {
  readonly id: string;
  readonly nom: string;
  readonly arguments: Readonly<Record<string, unknown>>;
}

/* ------------------------------------------------------------------------- */
/* Streaming (R4 : parole streamée, premier son < ~1 s)                       */
/* ------------------------------------------------------------------------- */

/** Fragment de flux : soit du texte (parole), soit un appel d'outil. */
export type FragmentLLM =
  | { readonly type: 'texte'; readonly delta: string }
  | { readonly type: 'tool_call'; readonly appel: ToolCall }
  | { readonly type: 'fin'; readonly raison: 'stop' | 'tool' | 'longueur' };

/** Paramètres d'une requête agentique. */
export interface RequeteLLM {
  readonly messages: readonly MessageLLM[];
  readonly outils: readonly ToolSpec[];
  /**
   * Contexte de conformité — OBLIGATOIRE. Détermine le provider (§1.7).
   * Sans lui, la passerelle ne peut pas router une requête concernant un élève.
   */
  readonly conformite: ComplianceContext;
  readonly mode_ia: ModeIA;
  /** Rôle appelant (multi-rôle, D6/R3) — borne droits & quotas. */
  readonly role_appelant: string;
  readonly temperature?: number;
  readonly max_tokens?: number;
}

/** Identité résolue du fournisseur effectivement choisi (traçabilité). */
export interface ProviderResolu {
  readonly nom: string;
  readonly conforme_mineur: boolean;
  readonly no_train: boolean;
}

/**
 * Passerelle LLM. La résolution de provider est interne et contrainte par la
 * conformité (§1.7). Implémentation remplaçable (P3).
 */
export interface LLMGateway {
  /**
   * Indique quel provider serait choisi pour ce contexte (introspection /
   * audit). DOIT renvoyer un provider conforme + no-train si `est_mineur`.
   */
  resoudreProvider(
    conformite: ComplianceContext,
    mode_ia: ModeIA,
  ): ProviderResolu;

  /** Génère en streaming (R4). Lève si aucun provider conforme n'existe. */
  streamer(requete: RequeteLLM): AsyncIterable<FragmentLLM>;
}
