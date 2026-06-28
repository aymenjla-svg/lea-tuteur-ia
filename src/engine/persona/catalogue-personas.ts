/**
 * Catalogue de personas (D9, §7) — donnée + matching élève↔persona.
 *
 * Rappel §7 : 3 facettes SÉPARÉES — apparence (RPM+voix), soul (style/prompt),
 * pédagogie (PARAMÈTRES moteur). Le moteur et les invariants sont identiques
 * pour toutes ; elles ne diffèrent que par le chemin et le style.
 */

import type {
  Modalite,
  Persona,
  PersonaCatalogue,
  PersonaId,
  TenantId,
} from '../../contracts/index.js';
import { type Horloge, id } from '../core.js';

export class InMemoryPersonaCatalogue implements PersonaCatalogue {
  readonly #parId = new Map<PersonaId, Persona>();

  ajouter(p: Persona): void {
    this.#parId.set(p.id, p);
  }
  async obtenir(idPersona: PersonaId): Promise<Persona | null> {
    return this.#parId.get(idPersona) ?? null;
  }
  async lister(): Promise<readonly Persona[]> {
    return [...this.#parId.values()];
  }
}

/**
 * Matching simple : on privilégie une persona dont la modalité par défaut
 * correspond à un *indice doux* (R7 : modalité ayant débloqué l'élève), sans
 * jamais figer un « style d'apprentissage ». À défaut, la première du catalogue.
 */
export function matcherPersona(
  personas: readonly Persona[],
  indice?: { readonly modalite_preferee?: Modalite },
): Persona | null {
  if (personas.length === 0) return null;
  if (indice?.modalite_preferee) {
    const m = personas.find(
      (p) => p.pedagogie.modalite_par_defaut === indice.modalite_preferee,
    );
    if (m) return m;
  }
  return personas[0] ?? null;
}

/** Seed : deux personas distinctes par leur PÉDAGOGIE (pas que cosmétiques, H2). */
export function cataloguePersonasDemo(
  tenant_id: TenantId,
  horloge: Horloge,
): InMemoryPersonaCatalogue {
  const t = horloge.maintenant();
  const meta = { tenant_id, cree_le: t, modifie_le: t } as const;
  const cat = new InMemoryPersonaCatalogue();

  cat.ajouter({
    ...meta,
    id: id<PersonaId>('persona-lea'),
    apparence: { rpm_avatar: 'rpm://lea', voix_id: 'voix-fr-douce' },
    soul: {
      nom_affiche: 'Léa',
      style_prompt:
        'Chaleureuse et patiente ; valorise l’effort ; phrases courtes.',
      tutoiement: true,
    },
    pedagogie: {
      seuil_blocage: 2,
      ordre_leviers: ['simplifier', 'reformuler', 'changer_de_modalite'],
      modalite_par_defaut: 'textuel',
      seuil_maitrise: 0.8,
      intensite_encouragement: 0.7,
    },
  });

  cat.ajouter({
    ...meta,
    id: id<PersonaId>('persona-noah'),
    apparence: { rpm_avatar: 'rpm://noah', voix_id: 'voix-fr-posee' },
    soul: {
      nom_affiche: 'Noah',
      style_prompt: 'Posé et structuré ; explicite chaque étape du raisonnement.',
      tutoiement: true,
    },
    pedagogie: {
      // Profil pédagogique RÉELLEMENT différent : reformule avant de simplifier,
      // tolère plus d'essais, vise une maîtrise plus exigeante, part du visuel.
      seuil_blocage: 3,
      ordre_leviers: ['reformuler', 'changer_de_modalite', 'simplifier'],
      modalite_par_defaut: 'visuel',
      seuil_maitrise: 0.85,
      intensite_encouragement: 0.5,
    },
  });

  return cat;
}
