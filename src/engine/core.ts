/**
 * Noyau du moteur — utilitaires transverses des implémentations Phase 1.
 *
 * Ces helpers matérialisent les invariants §13 côté exécution : horodatage
 * partout (via `Horloge`, injectable pour les tests et le decay D4) et
 * production d'événements tenant-scopés (D13).
 *
 * Les identifiants typés (branded) ne peuvent être construits que par
 * assertion (`as`) — c'est l'escape hatch assumé ; on le centralise ici plutôt
 * que de l'éparpiller.
 */

import type {
  Competence,
  DomainEvent,
  EventSink,
  ISODateTime,
  TenantId,
} from '../contracts/index.js';

/* ------------------------------------------------------------------------- */
/* Temps (injectable — D4 : decay calculé à la lecture)                       */
/* ------------------------------------------------------------------------- */

/** Source de temps. Injectée partout : aucune lecture d'horloge « cachée ». */
export interface Horloge {
  maintenant(): ISODateTime;
}

/** Horloge système (production). */
export const horlogeSysteme: Horloge = {
  maintenant: (): ISODateTime => new Date().toISOString() as ISODateTime,
};

/** Horloge contrôlable (tests / démos déterministes). */
export class HorlogeManuelle implements Horloge {
  #instant: Date;
  constructor(depart: Date) {
    this.#instant = new Date(depart.getTime());
  }
  maintenant(): ISODateTime {
    return this.#instant.toISOString() as ISODateTime;
  }
  /** Avance le temps de `ms` millisecondes. */
  avancer(ms: number): void {
    this.#instant = new Date(this.#instant.getTime() + ms);
  }
}

/** Convertit un horodatage ISO en millisecondes epoch. */
export function versEpoch(t: ISODateTime): number {
  return new Date(t).getTime();
}

/* ------------------------------------------------------------------------- */
/* Identifiants                                                                */
/* ------------------------------------------------------------------------- */

/** Génère un identifiant branded aléatoire (UUID v4). */
export function nouvelId<T extends string>(): T {
  return crypto.randomUUID() as T;
}

/** Marque une chaîne existante comme identifiant typé (seeds, fixtures). */
export function id<T extends string>(valeur: string): T {
  return valeur as T;
}

/* ------------------------------------------------------------------------- */
/* Aléatoire déterministe & texte                                             */
/* ------------------------------------------------------------------------- */

/**
 * Générateur pseudo-aléatoire déterministe (mulberry32). Reproductible à
 * partir d'une graine — indispensable pour des exercices paramétrés et des
 * tests stables (Math.random est proscrit côté moteur).
 */
export function rngDepuisGraine(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Normalise une chaîne : minuscules, sans accents, espaces compactés. */
export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------------- */
/* Compétences (les 6 du référentiel BO, §6)                                  */
/* ------------------------------------------------------------------------- */

/** Liste canonique des 6 compétences (ordre stable pour l'agrégation). */
export const COMPETENCES: readonly Competence[] = [
  'chercher',
  'modeliser',
  'representer',
  'raisonner',
  'calculer',
  'communiquer',
];

/* ------------------------------------------------------------------------- */
/* Événements & télémétrie (D13/§13)                                          */
/* ------------------------------------------------------------------------- */

/** Construit un événement de domaine tenant-scopé et horodaté. */
export function evenement<TType extends string, TPayload>(
  tenant_id: TenantId,
  type: TType,
  payload: TPayload,
  horodatage: ISODateTime,
): DomainEvent<TType, TPayload> {
  return { tenant_id, type, payload, horodatage };
}

/** Puits d'événements en mémoire (Phase 1 ; remplaçable par un bus réel). */
export class CollecteurEvenements implements EventSink {
  readonly evenements: DomainEvent[] = [];
  async emettre(evenement: DomainEvent): Promise<void> {
    this.evenements.push(evenement);
  }
}
