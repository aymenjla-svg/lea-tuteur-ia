/**
 * Primitives partagées — fondations structurelles de tous les contrats.
 *
 * À graver jour 1 (SPEC §13) : `tenant_id` partout · timestamps partout ·
 * `events` propre dès la 1ʳᵉ fonctionnalité. Ici on rend ces règles
 * *structurelles* : un agrégat NE PEUT PAS exister sans tenant ni horodatage.
 *
 * P3 : tout derrière des contrats (remplaçable sans réécriture).
 */

/* ------------------------------------------------------------------------- */
/* Identifiants typés (branded) — empêchent de confondre un ObjectifId        */
/* avec un EleveId, même si tous deux sont des `string` à l'exécution.        */
/* ------------------------------------------------------------------------- */

declare const __brand: unique symbol;
/** Marque nominale appliquée à un type primitif. */
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type TenantId = Brand<string, 'TenantId'>;
export type UserId = Brand<string, 'UserId'>;
export type EleveId = Brand<string, 'EleveId'>;
export type ReferentielId = Brand<string, 'ReferentielId'>;
export type ObjectifId = Brand<string, 'ObjectifId'>;
export type ExerciceTemplateId = Brand<string, 'ExerciceTemplateId'>;
export type ExplicationId = Brand<string, 'ExplicationId'>;
export type PersonaId = Brand<string, 'PersonaId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type TentativeId = Brand<string, 'TentativeId'>;
export type DialogueTurnId = Brand<string, 'DialogueTurnId'>;
export type SafetyAlertId = Brand<string, 'SafetyAlertId'>;
export type ErreurTypeId = Brand<string, 'ErreurTypeId'>;

/** Date-heure ISO 8601 (UTC). Branded pour éviter les `string` libres. */
export type ISODateTime = Brand<string, 'ISODateTime'>;

/* ------------------------------------------------------------------------- */
/* Multi-tenant & temps (D7 : Postgres unique multi-tenant, `tenant_id`+RLS)  */
/* ------------------------------------------------------------------------- */

/** Toute donnée appartient à un tenant (cloison RLS). */
export interface TenantScoped {
  readonly tenant_id: TenantId;
}

/** Horodatage de création/modification (timestamps partout — §13). */
export interface Timestamped {
  readonly cree_le: ISODateTime;
  readonly modifie_le: ISODateTime;
}

/**
 * Agrégat persistable : par construction tenant-scopé ET horodaté.
 * Faire dériver tout agrégat de ce type rend les invariants §13 non
 * contournables au niveau du compilateur.
 */
export type Aggregate = TenantScoped & Timestamped;

/* ------------------------------------------------------------------------- */
/* Conformité & mode IA (D6/R3 : mode_ia ; §1 inv.5/7 : mineur non reportable)*/
/* ------------------------------------------------------------------------- */

/** Mode de fourniture IA du tenant (D6/R3). `dev` = clé éditeur côté backend. */
export type ModeIA = 'inclus' | 'byok';

/** Résidence des données (D7/D8 : mono-région au départ, par région ensuite). */
export type Region = 'eu-west' | 'eu-central' | 'us-east';

/**
 * Contexte de conformité attaché à toute interaction sensible.
 * Invariant §1.7 : mineur ⇒ provider conforme + no-train, quel que soit le
 * mode de paiement. Cette contrainte n'est PAS reportable (cf. D6/R3) :
 * le LLMGateway DOIT résoudre le provider à partir de ce contexte.
 */
export interface ComplianceContext {
  readonly est_mineur: boolean;
  /** Consentement de l'adulte responsable (compte adulte — §1.5). */
  readonly consentement_adulte: boolean;
  /** Interdiction d'entraînement sur les données (forcé `true` si mineur). */
  readonly no_train: boolean;
  readonly region: Region;
}

/* ------------------------------------------------------------------------- */
/* Modalités pédagogiques (R7 : multi-représentation, pas de « style figé »)  */
/* ------------------------------------------------------------------------- */

/** Modalité d'une représentation/explication (R7, §5). */
export type Modalite = 'textuel' | 'visuel' | 'interactif';

/**
 * Six compétences mathématiques agrégées (SPEC §6 : « agrégation 6
 * compétences »). Référentiel BO = 1er curriculum (§6).
 */
export type Competence =
  | 'chercher'
  | 'modeliser'
  | 'representer'
  | 'raisonner'
  | 'calculer'
  | 'communiquer';

/* ------------------------------------------------------------------------- */
/* Résultats & erreurs — pas d'exceptions dans les contrats (explicites)      */
/* ------------------------------------------------------------------------- */

/** Résultat explicite succès/échec (style Rust). */
export type Result<T, E> =
  | { readonly ok: true; readonly valeur: T }
  | { readonly ok: false; readonly erreur: E };

/* ------------------------------------------------------------------------- */
/* Événements (D13/§13 : télémétrie complète jour 1, `events` sur chaque table)*/
/* ------------------------------------------------------------------------- */

/**
 * Événement de domaine : toujours tenant-scopé et horodaté.
 * Le payload est typé par les modules émetteurs (union ouverte via `type`).
 */
export interface DomainEvent<TType extends string = string, TPayload = unknown>
  extends TenantScoped {
  readonly type: TType;
  readonly horodatage: ISODateTime;
  readonly payload: TPayload;
}

/** Puits d'événements (télémétrie). Implémentation remplaçable (P3). */
export interface EventSink {
  emettre(evenement: DomainEvent): Promise<void>;
}
