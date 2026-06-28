/**
 * ConversationOrchestrator — chef d'orchestre de la boucle agentique (D1, R4, §6).
 *
 * Le LLM *parle* ; le moteur *sait, vérifie, tient le cadre* (Vision §0). Cet
 * orchestrateur fait tourner la boucle : `soul` réinjecté à chaque tour (§6),
 * parole IMMÉDIATE / outils en TÂCHE DE FOND (R4 — premier son < ~1 s).
 *
 * Deux outils code dur sont exposés au LLM (D1) :
 *   - `verifier`           : valide une réponse (seul producteur de Verdict, §1.1)
 *   - `enregistrerResultat`: persiste la tentative + met à jour la maîtrise
 *
 * Coups du tuteur (R7) — répertoire fermé, le moteur décide quand les jouer :
 *   proposer · reformuler · simplifier · changer_de_modalité · encourager ·
 *   reviser · clore.
 *
 * Tous les invariants §1 s'appliquent : pas de validation du faux, pas de sortie
 * du curriculum, pas d'humiliation, vidéo jamais exposée, sécurité du dialogue.
 */

import type {
  DialogueTurnId,
  EleveId,
  ISODateTime,
  ObjectifId,
  PersonaId,
  SessionId,
} from './common.js';
import type { Modalite } from './common.js';

/* ------------------------------------------------------------------------- */
/* Coups du tuteur (R7)                                                        */
/* ------------------------------------------------------------------------- */

/** Répertoire FERMÉ des coups jouables par le tuteur (R7, §6). */
export type CoupTuteur =
  | { readonly type: 'proposer'; readonly objectif_id: ObjectifId }
  | { readonly type: 'reformuler' }
  | { readonly type: 'simplifier'; readonly vers_prerequis?: ObjectifId }
  | { readonly type: 'changer_de_modalite'; readonly modalite: Modalite }
  | { readonly type: 'encourager' }
  | { readonly type: 'reviser'; readonly objectif_id: ObjectifId }
  | { readonly type: 'clore' };

/* ------------------------------------------------------------------------- */
/* Détection de blocage (déclencheur des leviers R7)                          */
/* ------------------------------------------------------------------------- */

/** Origine d'un blocage détecté (alimente le choix du levier, R7/§6). */
export type OrigineBlocage =
  | 'echecs_repetes'
  | 'je_suis_perdu'
  | 'confusion_detectee'
  | 'attention_faible';

/** Signal de blocage consolidé par le moteur avant de choisir un levier. */
export interface SignalBlocage {
  readonly origine: OrigineBlocage;
  readonly objectif_id: ObjectifId;
  /** Nb d'échecs consécutifs (comparé au `seuil_blocage` de la persona). */
  readonly echecs_consecutifs: number;
}

/* ------------------------------------------------------------------------- */
/* Tour de dialogue (table `dialogue_turns`, §5)                              */
/* ------------------------------------------------------------------------- */

/** Locuteur d'un tour de dialogue. */
export type Locuteur = 'eleve' | 'tuteur';

/**
 * Un tour de dialogue persisté (§5). Tenant-scopé + horodaté via les agrégats
 * amont ; ici on garde la trace minimale du dialogue.
 */
export interface DialogueTurn {
  readonly id: DialogueTurnId;
  readonly session_id: SessionId;
  readonly locuteur: Locuteur;
  /** Texte déjà passé par le SafetyFilter si locuteur = tuteur (§1.6). */
  readonly texte: string;
  /** Coup joué par le tuteur sur ce tour, le cas échéant (R7). */
  readonly coup?: CoupTuteur;
  readonly horodatage: ISODateTime;
}

/* ------------------------------------------------------------------------- */
/* Session & flux de sortie                                                    */
/* ------------------------------------------------------------------------- */

/** Contexte d'ouverture d'une session de tutorat. */
export interface ContexteSession {
  readonly session_id: SessionId;
  readonly eleve_id: EleveId;
  readonly persona_id: PersonaId;
  readonly objectif_initial: ObjectifId;
}

/**
 * Événement émis par l'orchestrateur vers la couche présence. La parole est
 * streamée immédiatement (R4) ; les coups/outils surviennent en tâche de fond.
 */
export type SortieOrchestrateur =
  | { readonly type: 'parole'; readonly delta: string }
  | { readonly type: 'coup'; readonly coup: CoupTuteur }
  | { readonly type: 'attente_reponse' }
  | { readonly type: 'session_close' };

/**
 * Orchestrateur de conversation. Implémentation remplaçable (P3) : c'est elle
 * qui câble LLMGateway + Verifier + LearnerModel + SafetyFilter + Curriculum,
 * sous les invariants §1 et le budget latence R4.
 */
export interface ConversationOrchestrator {
  /** Démarre une session ; renvoie le flux de sortie (parole immédiate, R4). */
  demarrer(contexte: ContexteSession): AsyncIterable<SortieOrchestrateur>;
  /** Pousse une entrée élève (texte ou transcription STT) dans la boucle. */
  recevoirEleve(session_id: SessionId, texte: string): Promise<void>;
  /** Clôt proprement la session (coup `clore`). */
  clore(session_id: SessionId): Promise<void>;
}
