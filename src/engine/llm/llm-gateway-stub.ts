/**
 * LLMGatewayStub — passerelle LLM de démonstration (D6/R3, §1.7).
 *
 * La GÉNÉRATION est un bouchon (pas d'appel réseau, pas de clé) — un vrai
 * provider se branche derrière le même contrat (P3). Ce qui est RÉEL et testé
 * ici, c'est la pièce qui compte vraiment : la **résolution de provider sous
 * contrainte de conformité** (§1.7, NON reportable) :
 *
 *   mineur ⇒ provider conforme + no-train, QUEL QUE SOIT le mode de paiement.
 *
 * Si aucun provider conforme n'existe pour un mineur, on LÈVE plutôt que de
 * router vers un provider non conforme (on ne contourne jamais l'invariant).
 */

import type {
  ComplianceContext,
  FragmentLLM,
  LLMGateway,
  ModeIA,
  ProviderResolu,
  RequeteLLM,
} from '../../contracts/index.js';

interface ProviderConfig extends ProviderResolu {
  /** Modes de paiement pour lesquels ce provider est candidat. */
  readonly modes: readonly ModeIA[];
}

/** Table de providers par défaut (éditeur conforme + générique BYOK). */
const PROVIDERS: readonly ProviderConfig[] = [
  {
    nom: 'editeur-conforme',
    conforme_mineur: true,
    no_train: true,
    modes: ['inclus', 'byok'],
  },
  {
    nom: 'byok-generique',
    conforme_mineur: false,
    no_train: false,
    modes: ['byok'],
  },
];

export class LLMGatewayStub implements LLMGateway {
  constructor(private readonly providers: readonly ProviderConfig[] = PROVIDERS) {}

  resoudreProvider(
    conformite: ComplianceContext,
    mode_ia: ModeIA,
  ): ProviderResolu {
    const candidats = this.providers.filter((p) => p.modes.includes(mode_ia));

    if (conformite.est_mineur) {
      // §1.7 : conforme + no-train obligatoires. Non négociable.
      const conforme = candidats.find((p) => p.conforme_mineur && p.no_train);
      if (!conforme) {
        throw new Error(
          'Aucun provider conforme mineur (conforme + no-train) disponible : ' +
            'requête refusée (invariant §1.7).',
        );
      }
      return depouiller(conforme);
    }

    // Majeur : on respecte le mode_ia ; on privilégie quand même no-train si
    // le contexte l'exige.
    const choisi =
      candidats.find((p) => !conformite.no_train || p.no_train) ?? candidats[0];
    if (!choisi) {
      throw new Error(`Aucun provider pour le mode « ${mode_ia} ».`);
    }
    return depouiller(choisi);
  }

  async *streamer(requete: RequeteLLM): AsyncIterable<FragmentLLM> {
    // Vérifie la conformité AVANT toute génération (peut lever — §1.7).
    const provider = this.resoudreProvider(requete.conformite, requete.mode_ia);
    // Bouchon : on renvoie un message fixe, mentionnant le provider résolu.
    yield {
      type: 'texte',
      delta: `[${provider.nom}] (génération simulée — brancher un provider réel)`,
    };
    yield { type: 'fin', raison: 'stop' };
  }
}

function depouiller(p: ProviderConfig): ProviderResolu {
  return {
    nom: p.nom,
    conforme_mineur: p.conforme_mineur,
    no_train: p.no_train,
  };
}
