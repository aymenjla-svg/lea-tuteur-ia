/**
 * ConversationOrchestrateur — implémentation du contrat du §4 (D1, R4, §6).
 *
 * Câble le LLM (qui PARLE) au moteur déterministe (qui SAIT, VÉRIFIE, TIENT LE
 * CADRE). La boucle agentique :
 *   - le LLM streame sa parole → poussée IMMÉDIATEMENT vers la sortie (R4) ;
 *   - quand il appelle un outil, l'orchestrateur l'EXÉCUTE puis ré-invoque le
 *     LLM avec le résultat (outils en tâche de fond) ;
 *   - les 2 outils code dur sont `verifier` et `enregistrerResultat` (D1).
 *
 * Le CADRE reste déterministe (P2) : c'est l'orchestrateur — pas le LLM — qui
 * choisit l'exercice, vérifie contre la vraie `Question` (le LLM ne voit jamais
 * la réponse attendue, §1.1) et décide de clore quand la maîtrise est atteinte.
 * Toute parole passe par le `SafetyFilter` ; toute entrée élève est scannée (R5).
 */

import type {
  ComplianceContext,
  ContexteSession,
  ConversationOrchestrator,
  Curriculum,
  EleveId,
  ExerciceTemplateId,
  LearnerModel,
  LLMGateway,
  ModeIA,
  ObjectifId,
  ParametresPedagogie,
  PersonaCatalogue,
  Question,
  SafetyFilter,
  SessionId,
  SortieOrchestrateur,
  TenantId,
  Tentative,
  ToolCall,
  ToolSpec,
  Verdict,
  Verifier,
} from '../../contracts/index.js';
import { Canal, evenement, type Horloge, nouvelId } from '../core.js';
import type { MagasinMemoire } from '../persistence/in-memory-store.js';

const OUTILS: readonly ToolSpec[] = [
  {
    nom: 'verifier',
    description:
      'Vérifie la réponse de l’élève à l’exercice courant (seul moyen d’obtenir un verdict).',
    parametres: {
      type: 'object',
      properties: { reponse: { type: 'string' } },
      required: ['reponse'],
    },
  },
  {
    nom: 'enregistrerResultat',
    description:
      'Persiste la tentative vérifiée et met à jour la progression de l’élève.',
    parametres: { type: 'object', properties: {} },
  },
];

export interface DependancesOrchestrateur {
  readonly tenant_id: TenantId;
  readonly gateway: LLMGateway;
  readonly verifier: Verifier;
  readonly learnerModel: LearnerModel;
  readonly safety: SafetyFilter;
  readonly curriculum: Curriculum;
  readonly magasin: MagasinMemoire;
  readonly horloge: Horloge;
  readonly pedagogie: ParametresPedagogie;
  readonly conformite: ComplianceContext;
  readonly mode_ia: ModeIA;
  readonly personaCatalogue?: PersonaCatalogue;
}

interface MessageLLM {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly contenu: string;
  readonly tool_call_id?: string;
}

interface SessionInterne {
  readonly contexte: ContexteSession;
  readonly messages: MessageLLM[];
  readonly sortie: Canal<SortieOrchestrateur>;
  readonly entree: Canal<string>;
  objectif_courant: ObjectifId;
  template_id: ExerciceTemplateId;
  question: Question;
  soul: string;
  lastReponse: string;
  lastVerdict: Verdict | null;
}

export class ConversationOrchestrateur implements ConversationOrchestrator {
  readonly #sessions = new Map<SessionId, SessionInterne>();
  constructor(private readonly deps: DependancesOrchestrateur) {}

  demarrer(contexte: ContexteSession): AsyncIterable<SortieOrchestrateur> {
    const sortie = new Canal<SortieOrchestrateur>();
    const session: SessionInterne = {
      contexte,
      messages: [],
      sortie,
      entree: new Canal<string>(),
      objectif_courant: contexte.objectif_initial,
      template_id: '' as ExerciceTemplateId,
      question: {
        kind: 'numeric',
        modalite: 'textuel',
        enonce: '',
        attendu: { valeur: 0, tolerance: 0 },
      },
      soul: 'Tuteur bienveillant et patient.',
      lastReponse: '',
      lastVerdict: null,
    };
    this.#sessions.set(contexte.session_id, session);
    void this.#boucle(session).catch((e: unknown) => {
      // eslint-disable-next-line no-console
      console.error('orchestrateur:', e);
      session.sortie.fermer();
    });
    return sortie;
  }

  recevoirEleve(session_id: SessionId, texte: string): Promise<void> {
    this.#session(session_id).entree.pousser(texte);
    return Promise.resolve();
  }

  async clore(session_id: SessionId): Promise<void> {
    const session = this.#session(session_id);
    session.entree.fermer();
    await this.#emettre(session, 'session_close', {
      objectif_id: session.objectif_courant,
    });
  }

  /* --------------------------------------------------------------------- */
  /* Boucle principale (le CADRE — déterministe)                            */
  /* --------------------------------------------------------------------- */

  async #boucle(session: SessionInterne): Promise<void> {
    await this.#chargerExercice(session, session.objectif_courant);
    await this.#emettre(session, 'session_demarree', {
      eleve_id: session.contexte.eleve_id,
      objectif_id: session.objectif_courant,
    });
    if (this.deps.personaCatalogue) {
      const p = await this.deps.personaCatalogue.obtenir(
        session.contexte.persona_id,
      );
      if (p) session.soul = p.soul.style_prompt;
    }
    await this.#presenter(session);

    for (;;) {
      session.sortie.pousser({ type: 'attente_reponse' });
      const entree = await session.entree.prochain();
      if (entree.done) break;

      await this.#entreeEleve(session, entree.value);
      await this.#tourLLM(session); // verifier → enregistrerResultat → retour

      if (session.lastVerdict?.correct) {
        const m = await this.deps.learnerModel.niveauMaitrise(
          session.contexte.eleve_id,
          session.objectif_courant,
          this.deps.horloge.maintenant(),
        );
        if (m.probabilite_effective >= this.deps.pedagogie.seuil_maitrise) {
          await this.#emettre(session, 'objectif_maitrise', {
            objectif_id: session.objectif_courant,
            p: m.probabilite_effective,
          });
          session.sortie.pousser({ type: 'session_close' });
          break;
        }
        await this.#presenter(session); // consolidation : nouvel exercice
      }
      // si incorrect : on reboucle et on réattend une réponse (même exercice)
    }
    session.sortie.fermer();
  }

  /* --------------------------------------------------------------------- */
  /* Tour LLM (agentique) — parole + exécution d'outils                     */
  /* --------------------------------------------------------------------- */

  async #presenter(session: SessionInterne): Promise<void> {
    session.sortie.pousser({
      type: 'coup',
      coup: { type: 'proposer', objectif_id: session.objectif_courant },
    });
    session.messages.push({
      role: 'system',
      contenu: `${session.soul}\nExercice : ${session.question.enonce}`,
    });
    await this.#tourLLM(session);
  }

  async #tourLLM(session: SessionInterne): Promise<void> {
    for (;;) {
      let parole = '';
      const appels: ToolCall[] = [];
      let raison: 'stop' | 'tool' | 'longueur' = 'stop';

      for await (const frag of this.deps.gateway.streamer({
        messages: session.messages,
        outils: OUTILS,
        conformite: this.deps.conformite,
        mode_ia: this.deps.mode_ia,
        role_appelant: 'tuteur',
      })) {
        if (frag.type === 'texte') {
          parole += await this.#parler(session, frag.delta);
        } else if (frag.type === 'tool_call') {
          appels.push(frag.appel);
        } else {
          raison = frag.raison;
        }
      }

      if (parole) session.messages.push({ role: 'assistant', contenu: parole });

      if (raison === 'tool' && appels.length > 0) {
        for (const appel of appels) {
          const resultat = await this.#executerOutil(session, appel);
          session.messages.push({
            role: 'tool',
            contenu: JSON.stringify(resultat),
            tool_call_id: appel.id,
          });
        }
        continue; // ré-invoque le LLM avec les résultats d'outils
      }
      return; // fin 'stop'
    }
  }

  /** Exécute un outil code dur (D1). Le CADRE reste maître de la vérité. */
  async #executerOutil(
    session: SessionInterne,
    appel: ToolCall,
  ): Promise<Record<string, unknown>> {
    switch (appel.nom) {
      case 'verifier': {
        // On vérifie contre la VRAIE question et la réponse RÉELLE de l'élève
        // (jamais ce que le LLM prétend) — §1.1.
        const verdict = await this.deps.verifier.verifier(session.question, {
          texte: session.lastReponse,
        });
        session.lastVerdict = verdict;
        return { outil: 'verifier', correct: verdict.correct };
      }
      case 'enregistrerResultat': {
        const verdict = session.lastVerdict;
        if (!verdict) return { outil: 'enregistrerResultat', erreur: 'aucun_verdict' };
        await this.#enregistrer(session, verdict);
        return { outil: 'enregistrerResultat', ok: true };
      }
      default:
        return { outil: appel.nom, erreur: 'outil_inconnu' };
    }
  }

  /* --------------------------------------------------------------------- */
  /* Helpers moteur                                                         */
  /* --------------------------------------------------------------------- */

  async #chargerExercice(
    session: SessionInterne,
    objectif_id: ObjectifId,
  ): Promise<void> {
    const templates =
      await this.deps.curriculum.templatesPourObjectif(objectif_id);
    const tmpl = templates[0];
    if (!tmpl) throw new Error(`Aucun template pour ${objectif_id}.`);
    const etape = tmpl.etapes[0];
    if (!etape) throw new Error(`Template ${tmpl.id} sans étape.`);
    session.objectif_courant = objectif_id;
    session.template_id = tmpl.id;
    session.question = etape.question;
  }

  async #enregistrer(session: SessionInterne, verdict: Verdict): Promise<void> {
    const t = this.deps.horloge.maintenant();
    const tentative: Tentative = {
      tenant_id: this.deps.tenant_id,
      id: nouvelId(),
      eleve_id: session.contexte.eleve_id,
      objectif_id: session.objectif_courant,
      template_id: session.template_id,
      type_evaluation: 'formative',
      verdict,
      horodatage: t,
      cree_le: t,
      modifie_le: t,
    };
    this.deps.magasin.ajouterTentative(tentative);
    await this.deps.learnerModel.enregistrerTentative(tentative);
    await this.#emettre(session, 'tentative_enregistree', {
      objectif_id: session.objectif_courant,
      correct: verdict.correct,
    });
  }

  async #entreeEleve(session: SessionInterne, texte: string): Promise<void> {
    const res = await this.deps.safety.filtrer(texte, 'eleve_entree', {
      eleve_id: session.contexte.eleve_id,
      session_id: session.contexte.session_id,
    });
    if (res.alerte) {
      this.deps.magasin.ajouterAlerte(res.alerte);
      await this.#emettre(session, 'safety_alert', {
        categorie: res.alerte.categorie,
        severite: res.alerte.severite,
      });
    }
    this.deps.magasin.ajouterTurn({
      id: nouvelId(),
      session_id: session.contexte.session_id,
      locuteur: 'eleve',
      texte,
      horodatage: this.deps.horloge.maintenant(),
    });
    session.lastReponse = texte;
    session.messages.push({ role: 'user', contenu: texte });
  }

  /** Filtre de sortie (§1.6) + streaming immédiat (R4) + trace dialogue. */
  async #parler(session: SessionInterne, delta: string): Promise<string> {
    const res = await this.deps.safety.filtrer(delta, 'llm_sortie', {
      eleve_id: session.contexte.eleve_id,
      session_id: session.contexte.session_id,
    });
    const texte =
      res.decision === 'reecrire' && res.texte_sur ? res.texte_sur : delta;
    session.sortie.pousser({ type: 'parole', delta: texte });
    this.deps.magasin.ajouterTurn({
      id: nouvelId(),
      session_id: session.contexte.session_id,
      locuteur: 'tuteur',
      texte,
      horodatage: this.deps.horloge.maintenant(),
    });
    return texte;
  }

  async #emettre(
    session: SessionInterne,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.deps.magasin.evenements.emettre(
      evenement(
        this.deps.tenant_id,
        type,
        { session_id: session.contexte.session_id, ...payload },
        this.deps.horloge.maintenant(),
      ),
    );
  }

  #session(session_id: SessionId): SessionInterne {
    const s = this.#sessions.get(session_id);
    if (!s) throw new Error(`Session inconnue : ${session_id}.`);
    return s;
  }
}
