/**
 * InMemoryCatalogueErreurs — catalogue d'erreurs-types (§5, §6).
 *
 * Implémente le contrat `CatalogueErreurs`. La remédiation est formulée
 * positivement (§1.3 : ne jamais humilier) et sert à guider l'élève sans
 * révéler la réponse (P1 : tremplin, pas refuge).
 */

import type {
  CatalogueErreurs,
  ErreurType,
  ErreurTypeId,
  ObjectifId,
  TenantId,
} from '../../contracts/index.js';
import { type Horloge, id } from '../core.js';

export class InMemoryCatalogueErreurs implements CatalogueErreurs {
  readonly #parId = new Map<ErreurTypeId, ErreurType>();

  ajouter(e: ErreurType): void {
    this.#parId.set(e.id, e);
  }

  async obtenir(idErreur: ErreurTypeId): Promise<ErreurType | null> {
    return this.#parId.get(idErreur) ?? null;
  }

  async pourObjectif(objectif_id: ObjectifId): Promise<readonly ErreurType[]> {
    return [...this.#parId.values()].filter(
      (e) => e.objectif_id === objectif_id,
    );
  }
}

/** Seed Phase 2 : erreurs-types fréquentes en calcul. */
export function catalogueErreursDemo(
  tenant_id: TenantId,
  horloge: Horloge,
): InMemoryCatalogueErreurs {
  const t = horloge.maintenant();
  const meta = { tenant_id, cree_le: t, modifie_le: t } as const;
  const cat = new InMemoryCatalogueErreurs();

  cat.ajouter({
    ...meta,
    id: id<ErreurTypeId>('oubli_retenue'),
    libelle: 'Oubli de la retenue',
    description:
      'Lorsqu’une colonne dépasse 9, la retenue n’est pas reportée sur la colonne suivante.',
    remediation:
      'Quand le total d’une colonne dépasse 9, n’oublie pas d’ajouter 1 à la colonne de gauche.',
  });

  cat.ajouter({
    ...meta,
    id: id<ErreurTypeId>('ecart_numerique'),
    libelle: 'Écart numérique',
    description: 'Le résultat est éloigné de la valeur attendue.',
    remediation: 'Vérifie chaque étape de ton calcul, sans te presser.',
  });

  return cat;
}
