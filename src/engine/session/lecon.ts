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
  LearnerModel,
  MaitriseEffective,
  Modalite,
  Objectif,
  ObjectifId,
  ParametresPedagogie,
  Question,
  SafetyFilter,
  SessionId,
  TenantId,
  Tentative,
  Verdict,
  Verifier,
} from '../../contracts/index.js';
import { evenement, type Horloge, nouvelId } from '../core.js';
import type { MagasinMemoire } from '../persistence/in-memory-store.js';

/* Petit alias local : le type des leviers, extrait du répertoire R7. */
type Levier = 'reformuler' | 'simplifier' | 'changer_de_modalite';

/** État rendu au terme de chaque interaction (ce que l'UI texte afficherait). */
export interface EtatLecon {
  readonly session_id: SessionId;
  readonly objectif_courant: ObjectifId;
  /** Question en cours ; absente quand la leçon est terminée. */
  readonly question_courante?: Question;
  /** Texte du tuteur, DÉJÀ passé par le SafetyFilter (§1.6). */
  readonly texte_tuteur: string;
  readonly dernier_coup: CoupTuteur;
  /** Maîtrise effective (après decay) de l'objectif VISÉ (progression). */
  readonly maitrise_cible: MaitriseEffective;
  readonly termine: boolean;
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
}

export class MoteurLecon {
  readonly #sessions = new Map<SessionId, SessionInterne>();
  constructor(private readonly deps: DependancesLecon) {}

  /** Démarre une session : sélectionne l'objectif et PROPOSE le 1ᵉʳ exercice. */
  async demarrer(contexte: ContexteSession): Promise<EtatLecon> {
    const { template_id, question, indice } = await this.#proposer(
      contexte.objectif_initial,
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
      return this.#etat(session_id, session, texte, coup);
    }

    const maitrise = await this.deps.learnerModel.niveauMaitrise(
      session.eleve_id,
      session.objectif_initial,
      this.deps.horloge.maintenant(),
    );

    // Objectif atteint → on clôt (coup `clore`).
    if (maitrise.probabilite_effective >= this.deps.pedagogie.seuil_maitrise) {
      session.termine = true;
      await this.#emettre(session_id, 'objectif_maitrise', {
        objectif_id: session.objectif_initial,
        p: maitrise.probabilite_effective,
      });
      const coup: CoupTuteur = { type: 'clore' };
      const texte = await this.#direTuteur(
        session_id,
        'Bravo, c’est juste — et tu maîtrises maintenant cet objectif. Excellente séance !',
        coup,
      );
      return this.#etat(session_id, session, texte, coup);
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
    return this.#etat(session_id, session, texte, coup);
  }

  async #surEchec(
    session_id: SessionId,
    session: SessionInterne,
    verdict: Verdict,
  ): Promise<EtatLecon> {
    session.echecs += 1;

    // Blocage détecté → on déclenche un levier d'adaptation (R7).
    if (session.echecs >= this.deps.pedagogie.seuil_blocage) {
      return this.#appliquerLevier(session_id, session);
    }

    // On ne PRONONCE pas le `diagnostic` du verifier (il révèle la valeur
    // attendue ; il reste dans le Verdict pour la télémétrie). On guide par la
    // remédiation de l'erreur-type détectée, sinon par l'indice — tremplin,
    // pas refuge (P1).
    const aide = await this.#aideRemediation(verdict, session.indice);
    const coup: CoupTuteur = {
      type: 'proposer',
      objectif_id: session.objectif_courant,
    };
    const texte = await this.#direTuteur(
      session_id,
      `Pas tout à fait, ce n’est pas la bonne réponse.${aide} Réessaie : ${session.question.enonce}`,
      coup,
    );
    return this.#etat(session_id, session, texte, coup);
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
        return this.#etat(session_id, session, texte, coup);
      }
      case 'changer_de_modalite': {
        const modalite = this.#autreModalite(session.question.modalite);
        const coup: CoupTuteur = { type: 'changer_de_modalite', modalite };
        const texte = await this.#direTuteur(
          session_id,
          `Essayons autrement (${modalite}). ${session.question.enonce}`,
          coup,
        );
        return this.#etat(session_id, session, texte, coup);
      }
      case 'reformuler':
      default: {
        const coup: CoupTuteur = { type: 'reformuler' };
        const texte = await this.#direTuteur(
          session_id,
          `Je reformule. ${session.question.enonce}`,
          coup,
        );
        return this.#etat(session_id, session, texte, coup);
      }
    }
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
      type_evaluation: 'formative',
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

  /** Proposer : sélectionne le template prof et la question de l'objectif. */
  async #proposer(objectif_id: ObjectifId): Promise<{
    template_id: ExerciceTemplateId;
    question: Question;
    indice: string | undefined;
  }> {
    const templates =
      await this.deps.curriculum.templatesPourObjectif(objectif_id);
    const tmpl = templates[0];
    if (!tmpl) {
      throw new Error(`Aucun template d’exercice pour l’objectif ${objectif_id}.`);
    }
    const etape = tmpl.etapes[0];
    if (!etape) {
      throw new Error(`Template ${tmpl.id} sans étape.`);
    }
    return { template_id: tmpl.id, question: etape.question, indice: etape.indice };
  }

  /** Charge l'objectif `cible` comme objectif courant de la session. */
  async #charger(session: SessionInterne, cible: ObjectifId): Promise<void> {
    const { template_id, question, indice } = await this.#proposer(cible);
    session.objectif_courant = cible;
    session.template_id = template_id;
    session.question = question;
    session.indice = indice;
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
      maitrise_cible,
      termine: session.termine,
    };
    return session.termine ? base : { ...base, question_courante: session.question };
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

  #session(session_id: SessionId): SessionInterne {
    const s = this.#sessions.get(session_id);
    if (!s) throw new Error(`Session inconnue : ${session_id}.`);
    return s;
  }
}
