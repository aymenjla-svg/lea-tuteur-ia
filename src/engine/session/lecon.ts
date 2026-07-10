/**
 * MoteurLecon — tranche verticale Phase 1 (§12).
 *
 * Boucle déterministe, TEXTE SEUL, sans avatar/voix/BKT/LLM :
 *
 *   proposer(template prof) → verifier(code dur) → maj maîtrise (heuristique)
 *   → persister (tentative + event) → progression (coup suivant)
 *
 * Cette classe joue le rôle que tiendra plus tard le `ConversationOrchestrator`
 * (la parole sera alors déléguée au LLM, §6). Ici les textes sont templatés et
 * déterministes — mais ils passent TOUS par le `SafetyFilter` (§1.6) et toutes
 * les entrées élève sont scannées pour la détresse (R5).
 *
 * Les coups joués viennent du répertoire fermé R7. Le levier d'adaptation
 * (reformuler · simplifier · changer_de_modalité) est choisi par les
 * PARAMÈTRES de la persona (pas par un prompt — §7).
 *
 * `#enregistrerResultat` est l'outil code dur n°2 (D1) : persistance +
 * télémétrie + mise à jour du modèle apprenant.
 */

import type {
  CatalogueErreurs,
  ContexteSession,
  CoupTuteur,
  Curriculum,
  EleveId,
  ErreurTypeId,
  ExerciceTemplateId,
  Expression,
  LearnerModel,
  MaitriseEffective,
  Modalite,
  Objectif,
  ObjectifId,
  ParametresPedagogie,
  Question,
  SafetyFilter,
  SessionId,
  SousEtapeGuidee,
  TenantId,
  Tentative,
  TypeEvaluation,
  Verdict,
  Verifier,
} from '../../contracts/index.js';
import { evenement, type Horloge, normaliser, nouvelId } from '../core.js';
import { politiqueEvaluation } from '../planning/eval-types.js';
import type { MagasinMemoire } from '../persistence/in-memory-store.js';
import { expressionVerdict } from '../presence/emotion.js';

/* Petit alias local : le type des leviers, extrait du répertoire R7. */
type Levier = 'reformuler' | 'simplifier' | 'changer_de_modalite';

/**
 * Crédibilité de la maîtrise : on n'annonce « objectif atteint » qu'après au
 * moins ce nombre de bonnes réponses DANS la séance (en plus du seuil de
 * probabilité). Évite la « maîtrise en une réponse ». La confirmation durable
 * passe ensuite par la répétition espacée (D4).
 */
const MIN_REUSSITES_MAITRISE = 4;

/** Reconnaît une demande d'aide explicite (« je suis perdu·e », etc.). */
function estDemandeAide(texte: string): boolean {
  const t = normaliser(texte);
  return /(perdu|perdue|besoin d aide|aide moi|aidez|sais pas|comprends pas|comprend pas|bloque|explique)/.test(
    t,
  );
}

/** Construit une question numérique jetable pour vérifier une sous-étape. */
function questionSousEtape(se: SousEtapeGuidee): Question {
  return {
    kind: 'numeric',
    modalite: 'textuel',
    enonce: se.enonce,
    attendu: {
      valeur: se.attendu,
      tolerance: se.tolerance ?? 0,
      ...(se.unite ? { unite: se.unite } : {}),
    },
  };
}

/**
 * Expression par défaut d'un tour NON lié à une correction (ADDENDUM v1/A1).
 * Les tours liés à un verdict imposent leur expression via `expressionVerdict`.
 */
function expressionParDefaut(coup: CoupTuteur): Expression {
  switch (coup.type) {
    case 'clore':
      return 'happy';
    case 'encourager':
    case 'simplifier':
      return 'encouraging';
    case 'proposer':
    case 'reformuler':
    case 'changer_de_modalite':
    case 'reviser':
      return 'idle';
  }
}

/** État rendu au terme de chaque interaction (ce que l'UI texte afficherait). */
export interface EtatLecon {
  readonly session_id: SessionId;
  readonly objectif_courant: ObjectifId;
  /** Question en cours ; absente quand la leçon est terminée. */
  readonly question_courante?: Question;
  /** Texte du tuteur, DÉJÀ passé par le SafetyFilter (§1.6). */
  readonly texte_tuteur: string;
  readonly dernier_coup: CoupTuteur;
  /**
   * Expression de l'avatar pour ce tour (ADDENDUM v1/A1). Sur un tour lié à une
   * correction, elle est IMPOSÉE par le verdict (correct → `celebrate`, erreur →
   * `encouraging`/`concerned`) — l'avatar ne peut pas féliciter le faux (P1).
   */
  readonly expression: Expression;
  /** Maîtrise effective (après decay) de l'objectif VISÉ (progression). */
  readonly maitrise_cible: MaitriseEffective;
  readonly termine: boolean;
  /**
   * Présent quand on déroule une DÉCOMPOSITION GUIDÉE (étayage « pas-à-pas »).
   * `etape`/`total` = 1-indexé pour l'affichage ; `unite` = unité de la
   * sous-étape courante (pastilles). Absent en mode normal.
   */
  readonly guidage?: {
    readonly etape: number;
    readonly total: number;
    readonly unite?: string;
  };
  /**
   * Sur un tour de correction, résume le verdict pour que l'UI puisse tenir un
   * BILAN de séance (exercices faits, réussis, erreurs fréquentes). Absent sur
   * les tours non liés à une correction.
   */
  readonly correction?: {
    readonly correct: boolean;
    readonly erreur_type_id?: string;
  };
}

interface SessionInterne {
  readonly eleve_id: EleveId;
  readonly objectif_initial: ObjectifId;
  objectif_courant: ObjectifId;
  template_id: ExerciceTemplateId;
  question: Question;
  indice: string | undefined;
  echecs: number;
  termine: boolean;
  /** Bonnes réponses sur l'objectif VISÉ dans cette séance (crédibilité maîtrise). */
  reussites: number;
  /** Difficulté visée (1..4) dérivée de la classe ; guide le choix d'exercice. */
  niveau_cible: number | undefined;
  /** Compteur de propositions (rotation dans la banque d'exercices, D5). */
  proposalIndex: number;
  /** Décomposition disponible pour l'exercice courant (si l'auteur en a fourni). */
  decomposition: readonly SousEtapeGuidee[] | undefined;
  /** État du déroulé guidé (index de sous-étape) ; absent hors étayage. */
  guidage?: { index: number } | undefined;
  /** Sauvegardes pour restaurer l'exercice complet après le déroulé guidé. */
  questionPrincipale?: Question | undefined;
  indicePrincipal?: string | undefined;
}

export interface DependancesLecon {
  readonly tenant_id: TenantId;
  readonly curriculum: Curriculum;
  readonly verifier: Verifier;
  readonly learnerModel: LearnerModel;
  readonly safety: SafetyFilter;
  readonly magasin: MagasinMemoire;
  readonly horloge: Horloge;
  readonly pedagogie: ParametresPedagogie;
  /** Optionnel : catalogue d'erreurs-types pour parler la remédiation (§6). */
  readonly catalogueErreurs?: CatalogueErreurs;
  /** Type d'évaluation (D2) ; défaut `formative` (avec aide). */
  readonly type_evaluation?: TypeEvaluation;
}

export class MoteurLecon {
  readonly #sessions = new Map<SessionId, SessionInterne>();
  constructor(private readonly deps: DependancesLecon) {}

  /** Démarre une session : sélectionne l'objectif et PROPOSE le 1ᵉʳ exercice. */
  async demarrer(contexte: ContexteSession): Promise<EtatLecon> {
    const { template_id, question, indice, decomposition } = await this.#proposer(
      contexte.objectif_initial,
      0,
      contexte.niveau_cible,
    );
    const session: SessionInterne = {
      eleve_id: contexte.eleve_id,
      objectif_initial: contexte.objectif_initial,
      objectif_courant: contexte.objectif_initial,
      template_id,
      question,
      indice,
      echecs: 0,
      termine: false,
      reussites: 0,
      niveau_cible: contexte.niveau_cible,
      proposalIndex: 0,
      decomposition,
    };
    this.#sessions.set(contexte.session_id, session);

    await this.#emettre(contexte.session_id, 'session_demarree', {
      eleve_id: session.eleve_id,
      objectif_id: session.objectif_initial,
    });

    const objectif = await this.deps.curriculum.obtenirObjectif(
      session.objectif_initial,
    );
    const coup: CoupTuteur = {
      type: 'proposer',
      objectif_id: session.objectif_courant,
    };
    const texte = await this.#direTuteur(
      contexte.session_id,
      `Bonjour ! On travaille « ${objectif?.libelle ?? 'un nouvel objectif'} ». ` +
        `${question.enonce}`,
      coup,
    );
    return this.#etat(contexte.session_id, session, texte, coup);
  }

  /** Reçoit la réponse de l'élève et fait avancer la boucle d'un tour. */
  async repondre(session_id: SessionId, texte: string): Promise<EtatLecon> {
    const session = this.#session(session_id);
    if (session.termine) {
      const coup: CoupTuteur = { type: 'clore' };
      return this.#etat(
        session_id,
        session,
        'La séance est terminée. À bientôt !',
        coup,
      );
    }

    // 1) Entrée élève : trace + scan de détresse (R5) AVANT toute pédagogie.
    await this.#entreeEleve(session_id, session.eleve_id, texte);

    // 1bis) Déroulé guidé en cours → la réponse porte sur la sous-étape.
    if (session.guidage) {
      return this.#repondreGuidage(session_id, session, texte);
    }
    // 1ter) Demande d'aide explicite → étayage (décomposition si dispo, sinon
    // indice). On ne compte PAS ça comme une erreur (P1 : demander de l'aide
    // est encouragé, jamais pénalisé).
    if (estDemandeAide(texte)) {
      return this.#demanderAide(session_id, session);
    }

    // 2) Vérification CODE DUR (seul producteur de Verdict — §1.1).
    const verdict = await this.deps.verifier.verifier(session.question, {
      texte,
    });

    // 3) Outil code dur n°2 : persister + télémétrie + maj maîtrise.
    await this.#enregistrerResultat(session_id, session, verdict);

    // 4) Progression : choix du coup suivant.
    return verdict.correct
      ? this.#surSucces(session_id, session)
      : this.#surEchec(session_id, session, verdict);
  }

  /**
   * Coup `reviser` (D4 : répétition espacée). Sélectionne un objectif dû pour
   * révision (maîtrise effective retombée sous le seuil après decay) et le
   * propose. Renvoie `null` s'il n'y a rien à réviser.
   */
  async reviser(session_id: SessionId): Promise<EtatLecon | null> {
    const session = this.#session(session_id);
    const dus = await this.deps.learnerModel.objectifsAReviser(
      session.eleve_id,
      this.deps.horloge.maintenant(),
    );
    const cible = dus[0];
    if (!cible) return null;

    session.termine = false;
    await this.#charger(session, cible.objectif_id);
    const coup: CoupTuteur = { type: 'reviser', objectif_id: cible.objectif_id };
    await this.#emettre(session_id, 'revision_proposee', {
      objectif_id: cible.objectif_id,
      p: cible.probabilite_effective,
    });
    const texte = await this.#direTuteur(
      session_id,
      `Petit rappel pour ancrer ce qu’on a vu. ${session.question.enonce}`,
      coup,
    );
    return this.#etat(session_id, session, texte, coup);
  }

  /** Clôt explicitement la session (coup `clore`). */
  async clore(session_id: SessionId): Promise<void> {
    const session = this.#session(session_id);
    session.termine = true;
    await this.#emettre(session_id, 'session_close', {
      objectif_id: session.objectif_courant,
    });
  }

  /* --------------------------------------------------------------------- */
  /* Progression                                                            */
  /* --------------------------------------------------------------------- */

  async #surSucces(
    session_id: SessionId,
    session: SessionInterne,
  ): Promise<EtatLecon> {
    session.echecs = 0;

    // Si on était redescendu sur un prérequis (simplifier), on remonte.
    if (session.objectif_courant !== session.objectif_initial) {
      await this.#charger(session, session.objectif_initial);
      const coup: CoupTuteur = {
        type: 'proposer',
        objectif_id: session.objectif_courant,
      };
      const texte = await this.#direTuteur(
        session_id,
        `Parfait, le prérequis est acquis. Revenons à l’exercice de départ. ${session.question.enonce}`,
        coup,
      );
      return this.#correction(
        await this.#etat(session_id, session, texte, coup, expressionVerdict(true)),
        true,
      );
    }

    session.reussites += 1; // bonne réponse sur l'objectif visé
    const maitrise = await this.deps.learnerModel.niveauMaitrise(
      session.eleve_id,
      session.objectif_initial,
      this.deps.horloge.maintenant(),
    );

    // Objectif atteint → on clôt (coup `clore`). Deux conditions : la probabilité
    // ET un minimum de bonnes réponses dans la séance (crédibilité, pas de
    // « maîtrise en une réponse »).
    const atteint =
      maitrise.probabilite_effective >= this.deps.pedagogie.seuil_maitrise &&
      session.reussites >= MIN_REUSSITES_MAITRISE;
    if (atteint) {
      session.termine = true;
      await this.#emettre(session_id, 'objectif_maitrise', {
        objectif_id: session.objectif_initial,
        p: maitrise.probabilite_effective,
        reussites: session.reussites,
      });
      const coup: CoupTuteur = { type: 'clore' };
      const texte = await this.#direTuteur(
        session_id,
        `Bravo ! ${session.reussites} exercices réussis d’affilée : objectif atteint. ` +
          'On le reverra un peu plus tard pour bien l’ancrer.',
        coup,
      );
      return this.#correction(
        await this.#etat(session_id, session, texte, coup, expressionVerdict(true)),
        true,
      );
    }

    // Sinon : encourager puis re-proposer (consolidation).
    await this.#charger(session, session.objectif_initial);
    const coup: CoupTuteur = {
      type: 'proposer',
      objectif_id: session.objectif_courant,
    };
    const texte = await this.#direTuteur(
      session_id,
      `Bien joué, c’est correct ! On continue pour consolider. ${session.question.enonce}`,
      coup,
    );
    return this.#correction(
      await this.#etat(session_id, session, texte, coup, expressionVerdict(true)),
      true,
    );
  }

  /** Attache le résumé de correction à un état (pour le bilan de séance). */
  #correction(
    etat: EtatLecon,
    correct: boolean,
    erreur_type_id?: string,
  ): EtatLecon {
    return {
      ...etat,
      correction: { correct, ...(erreur_type_id ? { erreur_type_id } : {}) },
    };
  }

  async #surEchec(
    session_id: SessionId,
    session: SessionInterne,
    verdict: Verdict,
  ): Promise<EtatLecon> {
    session.echecs += 1;

    // Blocage détecté → on GUIDE d'abord l'enchaînement (décomposition), si
    // l'auteur en a fourni une (P1 : on explique le chemin, on ne donne jamais
    // la réponse). Sinon, on retombe sur les leviers d'adaptation (R7).
    if (session.echecs >= this.deps.pedagogie.seuil_blocage) {
      if (session.decomposition && session.decomposition.length > 0) {
        return this.#entrerGuidage(session_id, session);
      }
      return this.#appliquerLevier(session_id, session);
    }

    // On ne PRONONCE pas le `diagnostic` du verifier (il révèle la valeur
    // attendue ; il reste dans le Verdict pour la télémétrie). On guide par la
    // remédiation de l'erreur-type détectée, sinon par l'indice — tremplin,
    // pas refuge (P1). En éval diagnostique/sommative, pas d'aide (on mesure).
    const aide = politiqueEvaluation(this.#typeEval()).aide
      ? await this.#aideRemediation(verdict, session.indice)
      : '';
    const coup: CoupTuteur = {
      type: 'proposer',
      objectif_id: session.objectif_courant,
    };
    const texte = await this.#direTuteur(
      session_id,
      `Pas tout à fait, ce n’est pas la bonne réponse.${aide} Réessaie : ${session.question.enonce}`,
      coup,
    );
    // Verdict faux → expression de soutien (jamais moqueuse). `echecs` vient
    // d'être incrémenté ; on passe le compte AVANT ce tour (A1).
    return this.#correction(
      await this.#etat(
        session_id,
        session,
        texte,
        coup,
        expressionVerdict(false, session.echecs - 1),
      ),
      false,
      verdict.erreur_type_id,
    );
  }

  /** Remédiation parlée : erreur-type du catalogue si disponible, sinon indice. */
  async #aideRemediation(
    verdict: Verdict,
    indice: string | undefined,
  ): Promise<string> {
    if (verdict.erreur_type_id && this.deps.catalogueErreurs) {
      const erreur = await this.deps.catalogueErreurs.obtenir(
        verdict.erreur_type_id as ErreurTypeId,
      );
      if (erreur) return ` ${erreur.remediation}`;
    }
    return indice ? ` Indice : ${indice}` : '';
  }

  async #appliquerLevier(
    session_id: SessionId,
    session: SessionInterne,
  ): Promise<EtatLecon> {
    const prereqs = await this.deps.curriculum.prerequisDirects(
      session.objectif_courant,
    );
    const levier = this.#choisirLevier(prereqs.length > 0);
    session.echecs = 0; // on laisse une nouvelle chance après le levier

    switch (levier) {
      case 'simplifier': {
        const prereq = prereqs[0] as Objectif; // garanti par #choisirLevier
        await this.#charger(session, prereq.id);
        const coup: CoupTuteur = {
          type: 'simplifier',
          vers_prerequis: prereq.id,
        };
        const texte = await this.#direTuteur(
          session_id,
          `Reprenons une étape avant pour bien poser les bases. ${session.question.enonce}`,
          coup,
        );
        // Blocage installé → expression douce (jamais moqueuse) — A1.
        return this.#etat(session_id, session, texte, coup, 'concerned');
      }
      case 'changer_de_modalite': {
        const modalite = this.#autreModalite(session.question.modalite);
        const coup: CoupTuteur = { type: 'changer_de_modalite', modalite };
        const texte = await this.#direTuteur(
          session_id,
          `Essayons autrement (${modalite}). ${session.question.enonce}`,
          coup,
        );
        return this.#etat(session_id, session, texte, coup, 'concerned');
      }
      case 'reformuler':
      default: {
        const coup: CoupTuteur = { type: 'reformuler' };
        const texte = await this.#direTuteur(
          session_id,
          `Je reformule. ${session.question.enonce}`,
          coup,
        );
        return this.#etat(session_id, session, texte, coup, 'concerned');
      }
    }
  }

  /* --------------------------------------------------------------------- */
  /* Étayage : décomposition guidée (P1 : on explique l'enchaînement)       */
  /* --------------------------------------------------------------------- */

  /** L'élève demande de l'aide : on déroule la décomposition, sinon un indice. */
  async #demanderAide(
    session_id: SessionId,
    session: SessionInterne,
  ): Promise<EtatLecon> {
    if (session.decomposition && session.decomposition.length > 0) {
      return this.#entrerGuidage(session_id, session);
    }
    // Pas de décomposition : coup de pouce (indice) sans donner la réponse.
    const aide = politiqueEvaluation(this.#typeEval()).aide
      ? await this.#aideRemediation({ correct: false } as Verdict, session.indice)
      : '';
    const coup: CoupTuteur = { type: 'encourager' };
    const texte = await this.#direTuteur(
      session_id,
      `Pas de souci, on regarde ça ensemble.${aide} Réessaie : ${session.question.enonce}`,
      coup,
    );
    return this.#etat(session_id, session, texte, coup, 'encouraging');
  }

  /** Entre en mode « pas-à-pas » : pose la 1ʳᵉ sous-étape. */
  async #entrerGuidage(
    session_id: SessionId,
    session: SessionInterne,
  ): Promise<EtatLecon> {
    const deco = session.decomposition as readonly SousEtapeGuidee[];
    // Sauvegarde l'exercice complet pour le reproposer à la fin (« tu fais »).
    session.questionPrincipale = session.question;
    session.indicePrincipal = session.indice;
    session.echecs = 0;
    session.guidage = { index: 0 };
    session.question = questionSousEtape(deco[0] as SousEtapeGuidee);

    await this.#emettre(session_id, 'guidage_demarre', {
      objectif_id: session.objectif_courant,
      etapes: deco.length,
    });
    const coup: CoupTuteur = { type: 'encourager' };
    const texte = await this.#direTuteur(
      session_id,
      `On va y aller pas à pas, ensemble. Étape 1 sur ${deco.length} : ${(deco[0] as SousEtapeGuidee).enonce}`,
      coup,
    );
    return this.#etat(session_id, session, texte, coup, 'encouraging');
  }

  /** Traite une réponse pendant le déroulé guidé (vérifie la sous-étape). */
  async #repondreGuidage(
    session_id: SessionId,
    session: SessionInterne,
    texte: string,
  ): Promise<EtatLecon> {
    const deco = session.decomposition as readonly SousEtapeGuidee[];
    const g = session.guidage as { index: number };
    const se = deco[g.index] as SousEtapeGuidee;

    // Aide pendant le pas-à-pas → on redonne l'indice de la sous-étape.
    if (estDemandeAide(texte)) {
      const coup: CoupTuteur = { type: 'encourager' };
      const t = await this.#direTuteur(
        session_id,
        `Indice : ${se.indice} ${se.enonce}`,
        coup,
      );
      return this.#etat(session_id, session, t, coup, 'encouraging');
    }

    const verdict = await this.deps.verifier.verifier(questionSousEtape(se), {
      texte,
    });
    if (!verdict.correct) {
      const coup: CoupTuteur = { type: 'encourager' };
      const t = await this.#direTuteur(
        session_id,
        `Pas encore. ${se.indice} ${se.enonce}`,
        coup,
      );
      return this.#etat(session_id, session, t, coup, expressionVerdict(false, 0));
    }

    // Sous-étape réussie → étape suivante, ou fin du déroulé.
    g.index += 1;
    if (g.index < deco.length) {
      const suiv = deco[g.index] as SousEtapeGuidee;
      session.question = questionSousEtape(suiv);
      const coup: CoupTuteur = { type: 'encourager' };
      const t = await this.#direTuteur(
        session_id,
        `Bien vu ! Étape ${g.index + 1} sur ${deco.length} : ${suiv.enonce}`,
        coup,
      );
      return this.#etat(session_id, session, t, coup, expressionVerdict(true));
    }

    // Décomposition terminée → on restaure l'exercice complet (phase « tu
    // fais »). L'élève a construit la réponse ; il la pose maintenant seul.
    session.guidage = undefined;
    session.question = session.questionPrincipale as Question;
    session.indice = session.indicePrincipal;
    session.echecs = 0;
    await this.#emettre(session_id, 'guidage_termine', {
      objectif_id: session.objectif_courant,
    });
    const coup: CoupTuteur = { type: 'proposer', objectif_id: session.objectif_courant };
    const cloture = await this.#direTuteur(
      session_id,
      `Tu as déroulé tout l’enchaînement, bravo ! Maintenant, donne la réponse de l’exercice complet. ${session.question.enonce}`,
      coup,
    );
    return this.#etat(session_id, session, cloture, coup, expressionVerdict(true));
  }

  /* --------------------------------------------------------------------- */
  /* Outils & helpers                                                       */
  /* --------------------------------------------------------------------- */

  /** Outil code dur n°2 (D1) : persister la tentative + télémétrie + maîtrise. */
  async #enregistrerResultat(
    session_id: SessionId,
    session: SessionInterne,
    verdict: Verdict,
  ): Promise<void> {
    const t = this.deps.horloge.maintenant();
    const tentative: Tentative = {
      tenant_id: this.deps.tenant_id,
      id: nouvelId(),
      eleve_id: session.eleve_id,
      objectif_id: session.objectif_courant,
      template_id: session.template_id,
      type_evaluation: this.#typeEval(),
      verdict,
      horodatage: t,
      cree_le: t,
      modifie_le: t,
    };
    this.deps.magasin.ajouterTentative(tentative);
    await this.deps.learnerModel.enregistrerTentative(tentative);
    await this.#emettre(session_id, 'tentative_enregistree', {
      objectif_id: session.objectif_courant,
      correct: verdict.correct,
    });
  }

  /**
   * Proposer : sélectionne un template prof et la question de l'objectif.
   * `index` fait TOURNER la banque (variété d'exercices d'une proposition à
   * l'autre au sein d'une même session, D5) — déterministe (pas de random).
   */
  async #proposer(objectif_id: ObjectifId, index = 0, niveauCible?: number): Promise<{
    template_id: ExerciceTemplateId;
    question: Question;
    indice: string | undefined;
    decomposition: readonly SousEtapeGuidee[] | undefined;
  }> {
    const templates =
      await this.deps.curriculum.templatesPourObjectif(objectif_id);
    // Adaptation à la classe (D5) : on privilégie les exercices proches du
    // niveau visé, en élargissant la bande jusqu'à garder ≥ 2 exercices (pour
    // conserver de la variété par rotation). Sans niveau_cible → toute la banque.
    let candidats = templates;
    if (niveauCible != null && templates.length > 1) {
      const ecart = (t: (typeof templates)[number]) => Math.abs((t.niveau ?? 2) - niveauCible);
      for (const bande of [1, 2]) {
        const proches = templates.filter((t) => ecart(t) <= bande);
        if (proches.length >= 2) {
          candidats = proches;
          break;
        }
      }
    }
    const tmpl =
      candidats.length > 0 ? candidats[index % candidats.length] : undefined;
    if (!tmpl) {
      throw new Error(`Aucun template d’exercice pour l’objectif ${objectif_id}.`);
    }
    const etape = tmpl.etapes[0];
    if (!etape) {
      throw new Error(`Template ${tmpl.id} sans étape.`);
    }
    return {
      template_id: tmpl.id,
      question: etape.question,
      indice: etape.indice,
      decomposition: etape.decomposition,
    };
  }

  /** Charge l'objectif `cible` comme objectif courant de la session. */
  async #charger(session: SessionInterne, cible: ObjectifId): Promise<void> {
    session.proposalIndex += 1; // rotation : exercice suivant de la banque
    const { template_id, question, indice, decomposition } =
      await this.#proposer(cible, session.proposalIndex, session.niveau_cible);
    session.objectif_courant = cible;
    session.template_id = template_id;
    session.question = question;
    session.indice = indice;
    session.decomposition = decomposition;
    // Charger un nouvel exercice sort de tout déroulé guidé en cours.
    session.guidage = undefined;
  }

  /** Entrée élève : enregistre le tour + scanne la détresse (R5). */
  async #entreeEleve(
    session_id: SessionId,
    eleve_id: EleveId,
    texte: string,
  ): Promise<void> {
    const res = await this.deps.safety.filtrer(texte, 'eleve_entree', {
      eleve_id,
      session_id,
    });
    if (res.alerte) {
      this.deps.magasin.ajouterAlerte(res.alerte);
      await this.#emettre(session_id, 'safety_alert', {
        eleve_id,
        categorie: res.alerte.categorie,
        severite: res.alerte.severite,
      });
    }
    this.deps.magasin.ajouterTurn({
      id: nouvelId(),
      session_id,
      locuteur: 'eleve',
      texte,
      horodatage: this.deps.horloge.maintenant(),
    });
  }

  /** Parole du tuteur : filtre de sortie (§1.6) + trace du tour de dialogue. */
  async #direTuteur(
    session_id: SessionId,
    texteBrut: string,
    coup: CoupTuteur,
  ): Promise<string> {
    const res = await this.deps.safety.filtrer(texteBrut, 'llm_sortie', {
      eleve_id: this.#session(session_id).eleve_id,
      session_id,
    });
    const texte =
      res.decision === 'reecrire' && res.texte_sur ? res.texte_sur : texteBrut;
    this.deps.magasin.ajouterTurn({
      id: nouvelId(),
      session_id,
      locuteur: 'tuteur',
      texte,
      coup,
      horodatage: this.deps.horloge.maintenant(),
    });
    return texte;
  }

  #choisirLevier(prereqExiste: boolean): Levier {
    for (const l of this.deps.pedagogie.ordre_leviers) {
      if (l === 'simplifier' && !prereqExiste) continue;
      return l;
    }
    return 'reformuler';
  }

  #autreModalite(courante: Modalite): Modalite {
    const ordre: readonly Modalite[] = ['textuel', 'visuel', 'interactif'];
    return ordre.find((m) => m !== courante) ?? courante;
  }

  async #etat(
    session_id: SessionId,
    session: SessionInterne,
    texte_tuteur: string,
    coup: CoupTuteur,
    expression?: Expression,
  ): Promise<EtatLecon> {
    const maitrise_cible = await this.deps.learnerModel.niveauMaitrise(
      session.eleve_id,
      session.objectif_initial,
      this.deps.horloge.maintenant(),
    );
    const base = {
      session_id,
      objectif_courant: session.objectif_courant,
      texte_tuteur,
      dernier_coup: coup,
      // Hors correction, l'expression découle du coup (le LLM affinera le ton) ;
      // sur une correction, l'appelant l'impose depuis le verdict (A1).
      expression: expression ?? expressionParDefaut(coup),
      maitrise_cible,
      termine: session.termine,
    };
    if (session.termine) return base;
    const q = { ...base, question_courante: session.question };
    if (session.guidage && session.decomposition) {
      const se = session.decomposition[session.guidage.index];
      return {
        ...q,
        guidage: {
          etape: session.guidage.index + 1,
          total: session.decomposition.length,
          ...(se?.unite ? { unite: se.unite } : {}),
        },
      };
    }
    return q;
  }

  async #emettre(
    session_id: SessionId,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.deps.magasin.evenements.emettre(
      evenement(
        this.deps.tenant_id,
        type,
        { session_id, ...payload },
        this.deps.horloge.maintenant(),
      ),
    );
  }

  #typeEval(): TypeEvaluation {
    return this.deps.type_evaluation ?? 'formative';
  }

  #session(session_id: SessionId): SessionInterne {
    const s = this.#sessions.get(session_id);
    if (!s) throw new Error(`Session inconnue : ${session_id}.`);
    return s;
  }
}
