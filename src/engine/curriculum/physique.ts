/**
 * Curriculum de PHYSIQUE — cycle 4 (v1 du produit).
 *
 * Aligné sur le programme officiel « Physique-Chimie cycle 4 » (BO n° 31 du
 * 30/07/2020) et le cadre de rédaction fourni (4 niveaux de difficulté, verbes
 * d'action, progressivité). Même moteur déterministe que la démo maths — seul
 * le contenu change (P3). Le Verifier numérique valide les réponses ; les
 * `pieges` encodent des erreurs-types fréquentes en physique.
 *
 * Thème de départ : « Mouvements et interactions » (relation v = d/t), avec un
 * prérequis « grandeur-quotient », plus deux objectifs autonomes (poids P = m·g,
 * loi d'Ohm U = R·I) pour donner de la matière au Planificateur (DAG).
 */

import type {
  Curriculum,
  ErreurTypeId,
  ObjectifId,
  Referentiel,
  ReferentielId,
  TenantId,
} from '../../contracts/index.js';
import { type Horloge, id } from '../core.js';
import { InMemoryCurriculum } from './in-memory-curriculum.js';
import { InMemoryCatalogueErreurs } from '../erreurs/catalogue-erreurs.js';

/** Identifiants stables (déterministes pour démos & tests). */
export const REF_PHYSIQUE = id<ReferentielId>('ref-bo-pc-cycle4');
export const OBJ_VITESSE = id<ObjectifId>('obj-vitesse');
export const OBJ_VITESSE_PREREQ = id<ObjectifId>('obj-vitesse-relation');
export const OBJ_POIDS = id<ObjectifId>('obj-poids');
export const OBJ_OHM = id<ObjectifId>('obj-ohm');
export const OBJ_MASSE_VOLUMIQUE = id<ObjectifId>('obj-masse-volumique');
export const OBJ_PUISSANCE = id<ObjectifId>('obj-puissance');
export const OBJ_SIGNAUX = id<ObjectifId>('obj-signaux');

/** Relation quantitative affichée au tableau, par objectif (indicatif UI). */
export const FORMULE_OBJECTIF: Readonly<Record<string, string>> = {
  'obj-vitesse': 'v = d / t',
  'obj-vitesse-relation': 'v = d / t',
  'obj-poids': 'P = m × g',
  'obj-ohm': 'U = R × I',
  'obj-masse-volumique': 'ρ = m / V',
  'obj-puissance': 'P = U × I',
  'obj-signaux': 'v = d / t',
};

/** Construit le curriculum de physique (cycle 4). */
export function curriculumPhysique(
  tenant_id: TenantId,
  horloge: Horloge,
): InMemoryCurriculum {
  const t = horloge.maintenant();
  const meta = { tenant_id, cree_le: t, modifie_le: t } as const;

  const referentiel: Referentiel = {
    ...meta,
    id: REF_PHYSIQUE,
    libelle: 'BO — Physique-Chimie, cycle 4',
    version: '2020.07',
  };

  const c = new InMemoryCurriculum();

  // --- Objectifs (attendus de fin de cycle) --------------------------------
  c.ajouterObjectif({
    ...meta,
    id: OBJ_VITESSE_PREREQ,
    referentiel_id: referentiel.id,
    libelle: 'Relier vitesse, distance et durée',
    notion: 'Mouvements et interactions',
    competences: ['modeliser', 'calculer'],
  });

  c.ajouterObjectif({
    ...meta,
    id: OBJ_VITESSE,
    referentiel_id: referentiel.id,
    libelle: 'Calculer une vitesse (v = d/t)',
    notion: 'Mouvements et interactions',
    competences: ['modeliser', 'calculer'],
  });

  c.ajouterObjectif({
    ...meta,
    id: OBJ_POIDS,
    referentiel_id: referentiel.id,
    libelle: 'Calculer un poids (P = m·g) et le distinguer de la masse',
    notion: 'Mouvements et interactions',
    competences: ['raisonner', 'calculer'],
  });

  c.ajouterObjectif({
    ...meta,
    id: OBJ_OHM,
    referentiel_id: referentiel.id,
    libelle: 'Exploiter la loi d’Ohm (U = R·I)',
    notion: 'L’énergie, ses transferts et ses conversions',
    competences: ['modeliser', 'calculer'],
  });

  c.ajouterObjectif({
    ...meta,
    id: OBJ_MASSE_VOLUMIQUE,
    referentiel_id: referentiel.id,
    libelle: 'Calculer une masse volumique (ρ = m/V)',
    notion: 'Organisation et transformations de la matière',
    competences: ['modeliser', 'calculer'],
  });

  c.ajouterObjectif({
    ...meta,
    id: OBJ_PUISSANCE,
    referentiel_id: referentiel.id,
    libelle: 'Exploiter la puissance électrique (P = U·I)',
    notion: 'L’énergie, ses transferts et ses conversions',
    competences: ['modeliser', 'calculer'],
  });

  c.ajouterObjectif({
    ...meta,
    id: OBJ_SIGNAUX,
    referentiel_id: referentiel.id,
    libelle: 'Calculer la vitesse d’un signal (son, lumière)',
    notion: 'Des signaux pour observer et communiquer',
    competences: ['calculer', 'raisonner'],
  });

  // DAG : calculer une vitesse suppose d'avoir compris la grandeur-quotient.
  c.ajouterPrerequis({ ...meta, objectif_id: OBJ_VITESSE, prerequis_id: OBJ_VITESSE_PREREQ });
  // La vitesse d'un signal réutilise la même grandeur-quotient (v = d/t).
  c.ajouterPrerequis({ ...meta, objectif_id: OBJ_SIGNAUX, prerequis_id: OBJ_VITESSE_PREREQ });

  // --- Templates PROF (R1), numériques, une étape --------------------------
  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-vitesse-relation-12-4'),
    objectif_id: OBJ_VITESSE_PREREQ,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'numeric',
          modalite: 'textuel',
          enonce: 'Un piéton parcourt 12 m en 4 s. Quelle est sa vitesse, en m/s ?',
          attendu: { valeur: 3, tolerance: 0 },
          // 48 = distance × durée (au lieu de ÷).
          pieges: [{ valeur: 48, erreur_type_id: 'multiplie_au_lieu_de_diviser' }],
        },
        indice: 'La vitesse est une distance divisée par une durée.',
      },
    ],
    representations: [
      { modalite: 'textuel', texte: 'Divise la distance (12 m) par la durée (4 s).' },
    ],
  });

  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-vitesse-150-2h30'),
    objectif_id: OBJ_VITESSE,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'numeric',
          modalite: 'textuel',
          enonce:
            'Une voiture parcourt 150 km en 2 h 30 min. Quelle est sa vitesse moyenne, en km/h ?',
          attendu: { valeur: 60, tolerance: 0 },
          pieges: [
            // 75 = 150 ÷ 2 (on oublie de convertir les 30 min en heures).
            { valeur: 75, erreur_type_id: 'oubli_conversion_duree' },
            // 375 = 150 × 2,5 (multiplie au lieu de diviser).
            { valeur: 375, erreur_type_id: 'multiplie_au_lieu_de_diviser' },
          ],
        },
        indice: 'D’abord convertis la durée en heures, puis applique v = d ÷ t.',
        // Étayage « pas-à-pas » révélé SEULEMENT si l'élève bloque (P1) : on
        // guide l'enchaînement (conversion → division), jamais le résultat.
        decomposition: [
          {
            enonce: 'Étape 1 — convertis la durée en heures : 2 h 30 min = combien d’heures ?',
            attendu: 2.5,
            tolerance: 0,
            unite: 'h',
            indice: '30 min, c’est une demi-heure, soit 0,5 h. Ajoute-la aux 2 h.',
          },
          {
            enonce:
              'Étape 2 — applique v = d ÷ t : divise 150 km par la durée en heures. Vitesse en km/h ?',
            attendu: 60,
            tolerance: 0,
            unite: 'km/h',
            indice: 'Reprends v = d ÷ t : 150 km divisé par la durée (en heures).',
          },
        ],
      },
    ],
    representations: [
      { modalite: 'textuel', texte: 'Convertis la durée en heures, écris v = d / t, puis calcule.' },
    ],
  });

  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-poids-5kg'),
    objectif_id: OBJ_POIDS,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'numeric',
          modalite: 'textuel',
          enonce:
            'Sur Terre (g = 10 N/kg), quel est le poids d’un objet de masse 5 kg, en newtons ?',
          attendu: { valeur: 50, tolerance: 0 },
          pieges: [
            // 5 = on rend la masse (confusion masse / poids).
            { valeur: 5, erreur_type_id: 'confond_masse_poids' },
            // 0.5 = m ÷ g (relation inversée).
            { valeur: 0.5, erreur_type_id: 'inverse_relation' },
          ],
        },
        indice: 'Le poids s’obtient avec P = m × g.',
      },
    ],
    representations: [
      { modalite: 'textuel', texte: 'La masse est en kg, le poids en N : P = m × g.' },
    ],
  });

  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-ohm-30-2'),
    objectif_id: OBJ_OHM,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'numeric',
          modalite: 'textuel',
          enonce:
            'Un conducteur ohmique de résistance 30 Ω est parcouru par un courant de 2 A. ' +
            'Quelle est la tension à ses bornes, en volts ?',
          attendu: { valeur: 60, tolerance: 0 },
          pieges: [
            // 15 = R ÷ I (relation inversée).
            { valeur: 15, erreur_type_id: 'inverse_relation' },
            // 32 = R + I (additionne au lieu de multiplier).
            { valeur: 32, erreur_type_id: 'additionne_au_lieu_de_multiplier' },
          ],
        },
        indice: 'La loi d’Ohm relie tension, résistance et intensité : U = R × I.',
      },
    ],
    representations: [
      { modalite: 'textuel', texte: 'U (V) = R (Ω) × I (A).' },
    ],
  });

  // Masse volumique : ρ = m / V (thème « matière »).
  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-masse-volumique-fer'),
    objectif_id: OBJ_MASSE_VOLUMIQUE,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'numeric',
          modalite: 'textuel',
          enonce:
            'Un bloc de fer a une masse de 79 g et un volume de 10 cm³. ' +
            'Quelle est sa masse volumique, en g/cm³ ?',
          attendu: { valeur: 7.9, tolerance: 0 },
          pieges: [
            // 790 = m × V (multiplie au lieu de diviser).
            { valeur: 790, erreur_type_id: 'multiplie_au_lieu_de_diviser' },
            // 0,127 ≈ V / m (division inversée).
            { valeur: 0.13, erreur_type_id: 'inverse_division', tolerance: 0.01 },
          ],
        },
        indice: 'La masse volumique est la masse divisée par le volume : ρ = m ÷ V.',
      },
    ],
    representations: [
      { modalite: 'textuel', texte: 'ρ (g/cm³) = m (g) ÷ V (cm³).' },
    ],
  });

  // Puissance électrique : P = U × I (thème « énergie »).
  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-puissance-230-5'),
    objectif_id: OBJ_PUISSANCE,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'numeric',
          modalite: 'textuel',
          enonce:
            'Un radiateur fonctionne sous une tension de 230 V et est parcouru par un ' +
            'courant de 5 A. Quelle est sa puissance, en watts ?',
          attendu: { valeur: 1150, tolerance: 0 },
          pieges: [
            // 46 = U ÷ I (relation inversée).
            { valeur: 46, erreur_type_id: 'inverse_relation' },
            // 235 = U + I (additionne au lieu de multiplier).
            { valeur: 235, erreur_type_id: 'additionne_au_lieu_de_multiplier' },
          ],
        },
        indice: 'La puissance électrique est le produit de la tension par l’intensité : P = U × I.',
      },
    ],
    representations: [
      { modalite: 'textuel', texte: 'P (W) = U (V) × I (A).' },
    ],
  });

  // Vitesse d'un signal : v = d / t (thème « signaux »).
  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-signal-son-680-2'),
    objectif_id: OBJ_SIGNAUX,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'numeric',
          modalite: 'textuel',
          enonce:
            'Dans l’air, un son parcourt 680 m en 2 s. Quelle est la vitesse du son, en m/s ?',
          attendu: { valeur: 340, tolerance: 0 },
          pieges: [
            // 1360 = d × t (multiplie au lieu de diviser).
            { valeur: 1360, erreur_type_id: 'multiplie_au_lieu_de_diviser' },
            // 0,003 ≈ t / d (division inversée).
            { valeur: 0.003, erreur_type_id: 'inverse_division', tolerance: 0.001 },
          ],
        },
        indice: 'La vitesse d’un signal est la distance parcourue divisée par la durée : v = d ÷ t.',
      },
    ],
    representations: [
      { modalite: 'textuel', texte: 'v (m/s) = d (m) ÷ t (s).' },
    ],
  });

  // --- Explications --------------------------------------------------------
  c.ajouterExplication({
    ...meta,
    id: id('expl-vitesse'),
    objectif_id: OBJ_VITESSE,
    modalite: 'textuel',
    contenu:
      'La vitesse moyenne est la distance parcourue divisée par la durée du trajet : ' +
      'v = d / t. Si d est en kilomètres et t en heures, alors v est en km/h.',
  });

  return c;
}

/** Erreurs-types fréquentes en physique (remédiation positive, §1.3/§6). */
export function catalogueErreursPhysique(
  tenant_id: TenantId,
  horloge: Horloge,
): InMemoryCatalogueErreurs {
  const t = horloge.maintenant();
  const meta = { tenant_id, cree_le: t, modifie_le: t } as const;
  const cat = new InMemoryCatalogueErreurs();

  const erreurs: ReadonlyArray<{ id: string; libelle: string; description: string; remediation: string }> = [
    {
      id: 'multiplie_au_lieu_de_diviser',
      libelle: 'Multiplication au lieu d’une division',
      description: 'Une grandeur-quotient (comme la vitesse) est obtenue par une division.',
      remediation: 'Ici il faut diviser, pas multiplier : une vitesse est une distance divisée par une durée.',
    },
    {
      id: 'inverse_division',
      libelle: 'Division inversée',
      description: 'Le dividende et le diviseur ont été échangés.',
      remediation: 'Vérifie l’ordre : on divise la distance par la durée, pas l’inverse.',
    },
    {
      id: 'oubli_conversion_duree',
      libelle: 'Durée non convertie',
      description: 'La durée n’a pas été convertie en heures avant le calcul.',
      remediation:
        'Pense à convertir la durée en heures d’abord : 2 h 30 min font 2,5 h, pas 2 h.',
    },
    {
      id: 'confond_masse_poids',
      libelle: 'Confusion masse / poids',
      description: 'La masse (en kg) et le poids (en N) sont deux grandeurs différentes.',
      remediation: 'La masse (kg) et le poids (N) sont différents : le poids se calcule avec P = m × g.',
    },
    {
      id: 'inverse_relation',
      libelle: 'Relation utilisée à l’envers',
      description: 'La relation a été appliquée dans le mauvais sens.',
      remediation: 'Reprends la relation et isole bien la grandeur cherchée avant de calculer.',
    },
    {
      id: 'additionne_au_lieu_de_multiplier',
      libelle: 'Addition au lieu d’une multiplication',
      description: 'Les grandeurs de la relation se multiplient, elles ne s’additionnent pas.',
      remediation: 'Dans cette relation, les grandeurs se multiplient : relis la formule attentivement.',
    },
    {
      id: 'ecart_numerique',
      libelle: 'Écart numérique',
      description: 'Le résultat est éloigné de la valeur attendue.',
      remediation: 'Vérifie chaque étape de ton calcul et les unités, sans te presser.',
    },
  ];

  for (const e of erreurs) {
    cat.ajouter({ ...meta, id: id<ErreurTypeId>(e.id), libelle: e.libelle, description: e.description, remediation: e.remediation });
  }
  return cat;
}
