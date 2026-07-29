/**
 * Curriculum de CHIMIE — Seconde, chapitre 1 « Identification des espèces
 * chimiques » (cours pilote).
 *
 * Contenu ancré sur le document du prof (Chap1 — Identification des espèces
 * chimiques, 4 p.). Ce chapitre est le PILOTE de la généralisation : il ouvre
 * l'application à une 2ᵉ discipline (chimie) et à un niveau lycée (Seconde),
 * alors que la v1 ne couvrait que la physique du cycle 4.
 *
 * Découpage en 8 objectifs atomiques suivant la structure réelle du chapitre :
 *   A. Corps purs et mélanges      → corps-purs, melanges
 *   B. Identification              → temperatures, masse-volumique, densite,
 *                                     tests, ccm, chromato-lecture
 *
 * Les `pieges` encodent les erreurs-types que ce contenu appelle (confusion
 * masse volumique / densité, unité indûment donnée à la densité, lectures
 * verticale / horizontale d'un chromatogramme…) : c'est CE qui permet au bilan
 * de diagnostiquer POURQUOI une réponse est fausse, pas seulement qu'elle l'est.
 *
 * ⚠️ ANOMALIE RELEVÉE DANS LE DOCUMENT SOURCE : le tableau des tests ioniques
 * note « Fer III  Fe2+ ». Le fer III est Fe³⁺. La bonne valeur est encodée ici
 * (et l'erreur « confond_fe2_fe3 » en fait un piège explicite), mais le document
 * du prof reste à corriger avant diffusion.
 */

import type {
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
export const REF_CHIMIE = id<ReferentielId>('ref-bo-pc-2de');
export const OBJ_CHIM_CORPS_PURS = id<ObjectifId>('obj-chim-corps-purs');
export const OBJ_CHIM_MELANGES = id<ObjectifId>('obj-chim-melanges');
export const OBJ_CHIM_TEMPERATURES = id<ObjectifId>('obj-chim-temperatures');
export const OBJ_CHIM_MASSE_VOLUMIQUE = id<ObjectifId>('obj-chim-masse-volumique');
export const OBJ_CHIM_DENSITE = id<ObjectifId>('obj-chim-densite');
export const OBJ_CHIM_TESTS = id<ObjectifId>('obj-chim-tests');
export const OBJ_CHIM_CCM = id<ObjectifId>('obj-chim-ccm');
export const OBJ_CHIM_CHROMATO_LECTURE = id<ObjectifId>('obj-chim-chromato-lecture');

/** Notion parente commune (le chapitre entier). */
const NOTION = 'Identification des espèces chimiques';

/** Relation quantitative affichée au tableau, par objectif (indicatif UI). */
export const FORMULE_OBJECTIF_CHIMIE: Readonly<Record<string, string>> = {
  'obj-chim-masse-volumique': 'ρ = m / V',
  'obj-chim-densite': 'd = ρ / ρ_eau',
};

/** Construit le curriculum de chimie (Seconde — chapitre 1). */
export function curriculumChimie(
  tenant_id: TenantId,
  horloge: Horloge,
): InMemoryCurriculum {
  const t = horloge.maintenant();
  const meta = { tenant_id, cree_le: t, modifie_le: t } as const;

  const referentiel: Referentiel = {
    ...meta,
    id: REF_CHIMIE,
    libelle: 'BO — Physique-Chimie, Seconde',
    version: '2019.01',
  };

  const c = new InMemoryCurriculum();

  /* --- A. Corps purs et mélanges ------------------------------------------ */

  c.ajouterObjectif({
    ...meta,
    id: OBJ_CHIM_CORPS_PURS,
    referentiel_id: referentiel.id,
    libelle: 'Distinguer un corps pur simple d’un corps pur composé',
    notion: NOTION,
    competences: ['representer', 'raisonner'],
  });

  c.ajouterObjectif({
    ...meta,
    id: OBJ_CHIM_MELANGES,
    referentiel_id: referentiel.id,
    libelle: 'Distinguer un mélange homogène d’un mélange hétérogène (miscibilité)',
    notion: NOTION,
    competences: ['representer', 'raisonner'],
  });

  /* --- B. Identification par les grandeurs physiques ---------------------- */

  c.ajouterObjectif({
    ...meta,
    id: OBJ_CHIM_TEMPERATURES,
    referentiel_id: referentiel.id,
    libelle: 'Identifier une espèce par ses températures de changement d’état',
    notion: NOTION,
    competences: ['raisonner', 'communiquer'],
  });

  c.ajouterObjectif({
    ...meta,
    id: OBJ_CHIM_MASSE_VOLUMIQUE,
    referentiel_id: referentiel.id,
    // Reprend la grandeur-quotient déjà travaillée au cycle 4 (module matiere),
    // en y ajoutant les conversions d'unités propres à la Seconde.
    libelle: 'Calculer une masse volumique (ρ = m/V) et convertir ses unités',
    notion: NOTION,
    competences: ['modeliser', 'calculer'],
  });

  c.ajouterObjectif({
    ...meta,
    id: OBJ_CHIM_DENSITE,
    referentiel_id: referentiel.id,
    libelle: 'Calculer une densité (d = ρ/ρ_eau) et savoir qu’elle est sans unité',
    notion: NOTION,
    competences: ['modeliser', 'calculer'],
  });

  /* --- B. Identification par tests chimiques ------------------------------ */

  c.ajouterObjectif({
    ...meta,
    id: OBJ_CHIM_TESTS,
    referentiel_id: referentiel.id,
    libelle: 'Choisir et interpréter un test caractéristique (gaz, ions)',
    notion: NOTION,
    competences: ['chercher', 'raisonner'],
  });

  /* --- B. Identification par chromatographie ------------------------------ */

  c.ajouterObjectif({
    ...meta,
    id: OBJ_CHIM_CCM,
    referentiel_id: referentiel.id,
    libelle: 'Expliquer le principe d’une CCM (phase fixe, éluant, élution)',
    notion: NOTION,
    competences: ['representer', 'communiquer'],
  });

  c.ajouterObjectif({
    ...meta,
    id: OBJ_CHIM_CHROMATO_LECTURE,
    referentiel_id: referentiel.id,
    libelle: 'Lire un chromatogramme (lectures verticale et horizontale)',
    notion: NOTION,
    competences: ['representer', 'raisonner'],
  });

  /* --- DAG des prérequis --------------------------------------------------
   * L'ordre topologique de ce graphe est ce que `planDiagnostique()` remonte
   * pour trouver la CAUSE RACINE d'un échec, au lieu de tout réexpliquer.     */

  // Parler de mélange suppose de savoir ce qu'est un corps pur.
  c.ajouterPrerequis({ ...meta, objectif_id: OBJ_CHIM_MELANGES, prerequis_id: OBJ_CHIM_CORPS_PURS });
  // La densité est un rapport de deux masses volumiques : il faut ρ d'abord.
  c.ajouterPrerequis({ ...meta, objectif_id: OBJ_CHIM_DENSITE, prerequis_id: OBJ_CHIM_MASSE_VOLUMIQUE });
  // La CCM sépare les constituants d'un mélange homogène.
  c.ajouterPrerequis({ ...meta, objectif_id: OBJ_CHIM_CCM, prerequis_id: OBJ_CHIM_MELANGES });
  // Lire un chromatogramme suppose le principe ET la notion de corps pur.
  c.ajouterPrerequis({ ...meta, objectif_id: OBJ_CHIM_CHROMATO_LECTURE, prerequis_id: OBJ_CHIM_CCM });
  c.ajouterPrerequis({ ...meta, objectif_id: OBJ_CHIM_CHROMATO_LECTURE, prerequis_id: OBJ_CHIM_CORPS_PURS });

  /* --- Templates PROF (R1) ------------------------------------------------ */

  // Corps purs : le piège classique est l'eau H₂O, prise pour un mélange.
  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-chim-corps-pur-eau'),
    objectif_id: OBJ_CHIM_CORPS_PURS,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    niveau: 1,
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'qcm',
          modalite: 'textuel',
          enonce: 'L’eau (H₂O) est&nbsp;:',
          options: [
            { id: 'a', libelle: 'un corps pur simple', erreur_type_id: 'confond_simple_compose' },
            { id: 'b', libelle: 'un corps pur composé' },
            { id: 'c', libelle: 'un mélange', erreur_type_id: 'confond_pur_melange' },
          ],
          bonnes_reponses: ['b'],
          choix_multiple: false,
        },
        indice:
          'Compte les TYPES d’atomes : un seul type → corps pur simple ; ' +
          'plusieurs types en proportions définies → corps pur composé.',
      },
    ],
    representations: [
      {
        modalite: 'textuel',
        texte:
          'Corps pur simple : un seul type d’atomes (Ag, C, O₂). ' +
          'Corps pur composé : plusieurs types d’atomes en proportions définies (H₂O, C₃H₆O).',
      },
    ],
  });

  // Mélanges : miscibilité → nombre de phases.
  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-chim-melange-eau-huile'),
    objectif_id: OBJ_CHIM_MELANGES,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    niveau: 1,
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'qcm',
          modalite: 'textuel',
          enonce:
            'L’eau et l’huile ne sont pas miscibles. Le mélange obtenu est donc&nbsp;:',
          options: [
            { id: 'a', libelle: 'homogène (une seule phase)', erreur_type_id: 'confond_homogene_heterogene' },
            { id: 'b', libelle: 'hétérogène (plusieurs phases)' },
          ],
          bonnes_reponses: ['b'],
          choix_multiple: false,
        },
        indice: 'Non miscibles → on distingue plusieurs phases à l’œil.',
      },
    ],
    representations: [
      {
        modalite: 'textuel',
        texte:
          'Homogène = une seule phase (eau + sirop, eau + alcool : miscibles). ' +
          'Hétérogène = plusieurs phases (eau + huile, eau + pétrole : non miscibles).',
      },
    ],
  });

  // Températures de changement d'état : le palier est LE critère.
  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-chim-palier-fusion'),
    objectif_id: OBJ_CHIM_TEMPERATURES,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    niveau: 2,
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'qcm',
          modalite: 'textuel',
          enonce:
            'Pendant la fusion d’un CORPS PUR, à pression constante, la température&nbsp;:',
          options: [
            { id: 'a', libelle: 'augmente régulièrement', erreur_type_id: 'croit_temperature_varie' },
            { id: 'b', libelle: 'reste constante' },
            { id: 'c', libelle: 'diminue', erreur_type_id: 'croit_temperature_varie' },
          ],
          bonnes_reponses: ['b'],
          choix_multiple: false,
        },
        indice:
          'C’est justement ce palier de température qui est CARACTÉRISTIQUE de ' +
          'l’espèce chimique — et donc qui permet de l’identifier.',
      },
    ],
    representations: [
      {
        modalite: 'textuel',
        texte:
          'Pour une pression donnée, le changement d’état d’un corps pur se fait à ' +
          'température constante, caractéristique de l’espèce (banc de Kofler pour Tfus).',
      },
    ],
  });

  // Masse volumique : ρ = m / V (grandeur-quotient) — pièges de sens de division.
  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-chim-rho-acetone'),
    objectif_id: OBJ_CHIM_MASSE_VOLUMIQUE,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    niveau: 2,
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'numeric',
          modalite: 'textuel',
          enonce:
            'Un échantillon d’acétone a une masse de 79,0 g pour un volume de 100 mL. ' +
            'Quelle est sa masse volumique, en g/mL&nbsp;?',
          attendu: { valeur: 0.79, tolerance: 0.005, unite: 'g/mL' },
          pieges: [
            // 7900 = m × V (multiplie au lieu de diviser).
            { valeur: 7900, erreur_type_id: 'multiplie_au_lieu_de_diviser' },
            // 1,27 ≈ V / m (division inversée).
            { valeur: 1.27, tolerance: 0.02, erreur_type_id: 'inverse_division' },
            // 790 = oubli du facteur 1000 entre g/mL et kg/m³.
            { valeur: 790, erreur_type_id: 'oubli_conversion_volumique' },
          ],
        },
        indice: 'La masse volumique est une grandeur-quotient : ρ = m ÷ V.',
      },
    ],
    representations: [
      {
        modalite: 'textuel',
        texte:
          'ρ = m / V. Attention aux unités : 1 g/mL = 1 g/cm³ = 1 kg/L = 1000 kg/m³.',
      },
    ],
  });

  // Densité : rapport SANS unité — l'erreur la plus fréquente du chapitre.
  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-chim-densite-unite'),
    objectif_id: OBJ_CHIM_DENSITE,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    niveau: 2,
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'qcm',
          modalite: 'textuel',
          enonce: 'La densité d d’un liquide s’exprime&nbsp;:',
          options: [
            { id: 'a', libelle: 'en g/mL', erreur_type_id: 'donne_unite_a_densite' },
            { id: 'b', libelle: 'en kg/m³', erreur_type_id: 'donne_unite_a_densite' },
            { id: 'c', libelle: 'sans unité' },
          ],
          bonnes_reponses: ['c'],
          choix_multiple: false,
        },
        indice:
          'C’est un RAPPORT de deux masses volumiques exprimées dans la même unité : ' +
          'les unités se simplifient.',
      },
    ],
    representations: [
      {
        modalite: 'textuel',
        texte:
          'd = ρ / ρ_eau, les deux dans la MÊME unité → d n’a pas d’unité. ' +
          'ρ_eau = 1,00 g/mL = 1,00 kg/L = 1000 kg/m³.',
      },
    ],
  });

  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-chim-densite-acetone'),
    objectif_id: OBJ_CHIM_DENSITE,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    niveau: 3,
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'numeric',
          modalite: 'textuel',
          enonce:
            'L’acétone a une masse volumique ρ = 0,79 g/mL. Sachant que ' +
            'ρ_eau = 1,00 g/mL, quelle est la densité de l’acétone&nbsp;?',
          attendu: { valeur: 0.79, tolerance: 0.005 },
          pieges: [
            // 1,27 = ρ_eau / ρ (rapport inversé).
            { valeur: 1.27, tolerance: 0.02, erreur_type_id: 'inverse_division' },
            // 0,79 × 1000 : confusion avec une conversion de masse volumique.
            { valeur: 790, erreur_type_id: 'confond_masse_volumique_densite' },
          ],
        },
        indice: 'd = ρ_espèce ÷ ρ_eau. Les deux sont déjà dans la même unité.',
      },
    ],
    representations: [
      { modalite: 'textuel', texte: 'd = 0,79 / 1,00 = 0,79 (sans unité).' },
    ],
  });

  // Tests caractéristiques : gaz (vus au collège) puis ions.
  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-chim-test-co2'),
    objectif_id: OBJ_CHIM_TESTS,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    niveau: 1,
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'qcm',
          modalite: 'textuel',
          enonce:
            'Quel détecteur permet d’identifier le dioxyde de carbone CO₂&nbsp;?',
          options: [
            { id: 'a', libelle: 'une bûchette incandescente', erreur_type_id: 'confond_test_o2_co2' },
            { id: 'b', libelle: 'l’eau de chaux' },
            { id: 'c', libelle: 'le sulfate de cuivre II anhydre', erreur_type_id: 'confond_test_eau' },
          ],
          bonnes_reponses: ['b'],
          choix_multiple: false,
        },
        indice: 'Le résultat attendu est la formation d’un précipité blanc.',
      },
    ],
    representations: [
      {
        modalite: 'textuel',
        texte:
          'O₂ → bûchette incandescente (combustion ravivée) · H₂O → sulfate de cuivre II ' +
          'anhydre (bleu) · H₂ → allumette enflammée (détonation) · CO₂ → eau de chaux ' +
          '(précipité blanc).',
      },
    ],
  });

  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-chim-test-ion-fer3'),
    objectif_id: OBJ_CHIM_TESTS,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    niveau: 3,
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'qcm',
          modalite: 'textuel',
          enonce:
            'On ajoute de la soude à une solution&nbsp;: il se forme un précipité ' +
            '<b>rouille</b>. Quel ion était présent&nbsp;?',
          options: [
            { id: 'a', libelle: 'l’ion fer II (Fe²⁺)', erreur_type_id: 'confond_fe2_fe3' },
            { id: 'b', libelle: 'l’ion fer III (Fe³⁺)' },
            { id: 'c', libelle: 'l’ion cuivre II (Cu²⁺)', erreur_type_id: 'confond_precipites_soude' },
          ],
          bonnes_reponses: ['b'],
          choix_multiple: false,
        },
        indice:
          'À la soude : Cu²⁺ → précipité bleu, Fe²⁺ → vert, Fe³⁺ → rouille.',
      },
    ],
    representations: [
      {
        modalite: 'textuel',
        texte:
          'Précipités à la soude : Cu²⁺ bleu · Fe²⁺ vert · Fe³⁺ rouille. ' +
          'Cl⁻ → nitrate d’argent (blanc qui noircit à la lumière) · ' +
          'Ca²⁺ → oxalate d’ammonium (blanc).',
      },
    ],
  });

  // CCM : ne pas confondre phase fixe et phase mobile.
  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-chim-ccm-eluant'),
    objectif_id: OBJ_CHIM_CCM,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    niveau: 2,
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'qcm',
          modalite: 'textuel',
          enonce: 'Dans une chromatographie sur couche mince, l’éluant est&nbsp;:',
          options: [
            { id: 'a', libelle: 'la phase fixe (le papier ou la plaque de silice)', erreur_type_id: 'confond_phases_ccm' },
            { id: 'b', libelle: 'la phase mobile, qui monte par capillarité' },
          ],
          bonnes_reponses: ['b'],
          choix_multiple: false,
        },
        indice:
          'C’est le liquide qui MONTE et entraîne les espèces : plus une espèce y ' +
          'est soluble, plus elle est entraînée haut.',
      },
    ],
    representations: [
      {
        modalite: 'textuel',
        texte:
          'Phase fixe = papier / plaque de silice. Phase mobile = éluant, qui monte par ' +
          'capillarité et entraîne les espèces (élution). L’éluant ne doit pas réagir ' +
          'avec le mélange.',
      },
    ],
  });

  // Lecture d'un chromatogramme : verticale (pur ou mélange) vs horizontale.
  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-chim-chromato-verticale'),
    objectif_id: OBJ_CHIM_CHROMATO_LECTURE,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    niveau: 2,
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'qcm',
          modalite: 'textuel',
          enonce:
            'Après migration, le dépôt analysé ne laisse qu’<b>une seule tache</b>. ' +
            'La substance analysée est&nbsp;:',
          options: [
            { id: 'a', libelle: 'un corps pur' },
            { id: 'b', libelle: 'un mélange', erreur_type_id: 'confond_lecture_verticale' },
          ],
          bonnes_reponses: ['a'],
          choix_multiple: false,
        },
        indice:
          'Lecture VERTICALE : on compte les taches d’un même dépôt. ' +
          'Une tache = une seule espèce.',
      },
    ],
    representations: [
      {
        modalite: 'textuel',
        texte:
          'Lecture verticale : 1 tache → corps pur ; plusieurs taches → mélange.',
      },
    ],
  });

  c.ajouterTemplate({
    ...meta,
    id: id('tmpl-chim-chromato-horizontale'),
    objectif_id: OBJ_CHIM_CHROMATO_LECTURE,
    origine: 'prof',
    statut: 'valide',
    parametres: [],
    niveau: 3,
    etapes: [
      {
        ordre: 1,
        question: {
          kind: 'qcm',
          modalite: 'textuel',
          enonce:
            'Sur un chromatogramme, deux taches issues de dépôts différents sont ' +
            'à la <b>même hauteur</b>. Cela signifie qu’il s’agit&nbsp;:',
          options: [
            { id: 'a', libelle: 'de la même espèce chimique' },
            { id: 'b', libelle: 'de deux espèces différentes', erreur_type_id: 'confond_lecture_horizontale' },
            { id: 'c', libelle: 'de deux corps purs, sans pouvoir conclure', erreur_type_id: 'confond_lecture_horizontale' },
          ],
          bonnes_reponses: ['a'],
          choix_multiple: false,
        },
        indice:
          'Lecture HORIZONTALE : à hauteur égale, même solubilité dans l’éluant ' +
          'donc même espèce chimique.',
      },
    ],
    representations: [
      {
        modalite: 'textuel',
        texte:
          'Lecture horizontale : deux taches à la même hauteur = même espèce chimique. ' +
          'Exemple menthe : l’huile essentielle contient menthol, menthone et ' +
          'menthofurane, mais PAS l’eucalyptol.',
      },
    ],
  });

  /* --- Explications (contenu ancré sur le cours du prof) ------------------ */

  c.ajouterExplication({
    ...meta,
    id: id('expl-chim-corps-purs'),
    objectif_id: OBJ_CHIM_CORPS_PURS,
    modalite: 'textuel',
    contenu:
      'Un corps pur simple est constitué d’un seul type d’atomes (argent Ag, ' +
      'charbon C, dioxygène O₂). Un corps pur composé est constitué de plusieurs ' +
      'types d’atomes dans des proportions bien définies (eau H₂O, acétone C₃H₆O).',
  });

  c.ajouterExplication({
    ...meta,
    id: id('expl-chim-melanges'),
    objectif_id: OBJ_CHIM_MELANGES,
    modalite: 'textuel',
    contenu:
      'Un mélange est homogène s’il n’est constitué que d’une seule phase : deux ' +
      'liquides qui forment un mélange homogène sont dits miscibles. Il est ' +
      'hétérogène s’il comporte plusieurs phases (liquides non miscibles). ' +
      'L’air est un mélange de gaz : environ 78 % de diazote, 21 % de dioxygène ' +
      'et 1 % d’autres gaz.',
  });

  c.ajouterExplication({
    ...meta,
    id: id('expl-chim-temperatures'),
    objectif_id: OBJ_CHIM_TEMPERATURES,
    modalite: 'textuel',
    contenu:
      'Pour une pression donnée, le changement d’état d’un corps pur se fait à ' +
      'température constante, caractéristique de l’espèce chimique. On mesure une ' +
      'température de fusion au banc de Kofler, une température d’ébullition au ' +
      'thermomètre.',
  });

  c.ajouterExplication({
    ...meta,
    id: id('expl-chim-masse-volumique'),
    objectif_id: OBJ_CHIM_MASSE_VOLUMIQUE,
    modalite: 'textuel',
    contenu:
      'La masse volumique ρ d’une espèce de masse m et de volume V dépend de la ' +
      'température : ρ = m / V. Elle s’exprime en g/mL, g/cm³, kg/L ou kg/m³ — ' +
      'avec 1 g/mL = 1000 kg/m³.',
  });

  c.ajouterExplication({
    ...meta,
    id: id('expl-chim-densite'),
    objectif_id: OBJ_CHIM_DENSITE,
    modalite: 'textuel',
    contenu:
      'La densité d d’une espèce chimique est le rapport de sa masse volumique sur ' +
      'celle d’un corps de référence (l’eau pour les liquides et les solides) : ' +
      'd = ρ / ρ_eau, les deux dans la même unité. Elle n’a donc PAS d’unité. ' +
      'ρ_eau = 1,00 g/mL = 1,00 kg/L = 1000 kg/m³.',
  });

  c.ajouterExplication({
    ...meta,
    id: id('expl-chim-tests'),
    objectif_id: OBJ_CHIM_TESTS,
    modalite: 'textuel',
    contenu:
      'Certains tests chimiques révèlent la présence d’une espèce. Gaz : O₂ ravive ' +
      'une bûchette incandescente, H₂O bleuit le sulfate de cuivre II anhydre, H₂ ' +
      'détone à l’allumette, CO₂ trouble l’eau de chaux (précipité blanc). Ions à ' +
      'la soude : Cu²⁺ précipité bleu, Fe²⁺ vert, Fe³⁺ rouille ; Cl⁻ au nitrate ' +
      'd’argent (blanc noircissant à la lumière) ; Ca²⁺ à l’oxalate d’ammonium (blanc).',
  });

  c.ajouterExplication({
    ...meta,
    id: id('expl-chim-ccm'),
    objectif_id: OBJ_CHIM_CCM,
    modalite: 'textuel',
    contenu:
      'La chromatographie sur couche mince (CCM) est une technique de séparation ' +
      'qui permet d’identifier les constituants d’un mélange homogène. Une phase ' +
      'fixe (papier ou plaque de silice) est plongée dans une phase mobile, ' +
      'l’éluant, dans lequel les espèces sont solubles. L’éluant monte par ' +
      'capillarité et entraîne les espèces : c’est l’élution. Plus une espèce est ' +
      'soluble dans l’éluant, plus elle est entraînée haut.',
  });

  c.ajouterExplication({
    ...meta,
    id: id('expl-chim-chromato-lecture'),
    objectif_id: OBJ_CHIM_CHROMATO_LECTURE,
    modalite: 'textuel',
    contenu:
      'Lecture verticale : une seule tache après migration → la substance est un ' +
      'corps pur ; plusieurs taches → c’est un mélange. Lecture horizontale : deux ' +
      'taches à la même hauteur correspondent à la même espèce chimique.',
  });

  return c;
}

/** Erreurs-types du chapitre (remédiation positive, §1.3/§6). */
export function catalogueErreursChimie(
  tenant_id: TenantId,
  horloge: Horloge,
): InMemoryCatalogueErreurs {
  const t = horloge.maintenant();
  const meta = { tenant_id, cree_le: t, modifie_le: t } as const;
  const cat = new InMemoryCatalogueErreurs();

  const erreurs: ReadonlyArray<{
    id: string;
    objectif_id?: ObjectifId;
    libelle: string;
    description: string;
    remediation: string;
  }> = [
    {
      id: 'confond_simple_compose',
      objectif_id: OBJ_CHIM_CORPS_PURS,
      libelle: 'Corps pur simple / composé confondus',
      description:
        'Le critère est le nombre de TYPES d’atomes, pas le nombre d’atomes.',
      remediation:
        'Regarde les types d’atomes : O₂ n’a qu’un type (simple), H₂O en a deux (composé).',
    },
    {
      id: 'confond_pur_melange',
      objectif_id: OBJ_CHIM_CORPS_PURS,
      libelle: 'Corps pur composé pris pour un mélange',
      description:
        'Plusieurs types d’atomes ne font pas un mélange : dans un corps pur composé, ' +
        'les proportions sont fixes.',
      remediation:
        'Un corps pur composé a des proportions DÉFINIES (H₂O, toujours 2 H pour 1 O) ; ' +
        'un mélange, non.',
    },
    {
      id: 'confond_homogene_heterogene',
      objectif_id: OBJ_CHIM_MELANGES,
      libelle: 'Homogène / hétérogène confondus',
      description: 'Le critère est le nombre de phases visibles.',
      remediation:
        'Compte les phases : une seule → homogène (miscibles) ; plusieurs → hétérogène.',
    },
    {
      id: 'croit_temperature_varie',
      objectif_id: OBJ_CHIM_TEMPERATURES,
      libelle: 'Palier de changement d’état ignoré',
      description:
        'Pendant un changement d’état d’un corps pur, la température ne varie pas.',
      remediation:
        'La température reste CONSTANTE pendant le changement d’état — et c’est ce ' +
        'palier qui identifie l’espèce.',
    },
    {
      id: 'oubli_conversion_volumique',
      objectif_id: OBJ_CHIM_MASSE_VOLUMIQUE,
      libelle: 'Conversion d’unité de masse volumique oubliée',
      description: 'Le facteur 1000 entre g/mL et kg/m³ n’a pas été appliqué.',
      remediation: 'Rappelle-toi : 1 g/mL = 1 g/cm³ = 1 kg/L = 1000 kg/m³.',
    },
    {
      id: 'donne_unite_a_densite',
      objectif_id: OBJ_CHIM_DENSITE,
      libelle: 'Unité donnée à la densité',
      description:
        'La densité est un rapport de deux grandeurs de même unité : elle est sans unité.',
      remediation:
        'd = ρ / ρ_eau avec la MÊME unité en haut et en bas : les unités se simplifient, ' +
        'd n’en a pas.',
    },
    {
      id: 'confond_masse_volumique_densite',
      objectif_id: OBJ_CHIM_DENSITE,
      libelle: 'Masse volumique et densité confondues',
      description:
        'ρ s’exprime en g/mL ou kg/m³ ; d est le rapport ρ/ρ_eau, sans unité. ' +
        'Leurs valeurs coïncident en g/mL, ce qui entretient la confusion.',
      remediation:
        'ρ est une grandeur avec unité ; d est un rapport sans unité. En g/mL les deux ' +
        'nombres se ressemblent, mais ce ne sont pas les mêmes grandeurs.',
    },
    {
      id: 'confond_test_o2_co2',
      objectif_id: OBJ_CHIM_TESTS,
      libelle: 'Tests O₂ et CO₂ confondus',
      description: 'La bûchette incandescente teste le dioxygène, pas le dioxyde de carbone.',
      remediation:
        'O₂ ravive une bûchette incandescente ; CO₂ trouble l’eau de chaux (précipité blanc).',
    },
    {
      id: 'confond_test_eau',
      objectif_id: OBJ_CHIM_TESTS,
      libelle: 'Test de l’eau mal attribué',
      description: 'Le sulfate de cuivre II anhydre teste la présence d’eau.',
      remediation:
        'Le sulfate de cuivre II anhydre devient BLEU en présence d’eau — c’est le test de H₂O.',
    },
    {
      id: 'confond_fe2_fe3',
      objectif_id: OBJ_CHIM_TESTS,
      libelle: 'Ions fer II et fer III confondus',
      description:
        'Fe²⁺ (fer II) donne un précipité vert à la soude, Fe³⁺ (fer III) un précipité rouille.',
      remediation:
        'Fer II = Fe²⁺ → précipité vert. Fer III = Fe³⁺ → précipité rouille. ' +
        'La charge suit le chiffre romain.',
    },
    {
      id: 'confond_precipites_soude',
      objectif_id: OBJ_CHIM_TESTS,
      libelle: 'Couleurs des précipités à la soude mélangées',
      description: 'Chaque cation donne à la soude un précipité de couleur propre.',
      remediation: 'À la soude : Cu²⁺ bleu, Fe²⁺ vert, Fe³⁺ rouille.',
    },
    {
      id: 'confond_phases_ccm',
      objectif_id: OBJ_CHIM_CCM,
      libelle: 'Phase fixe et éluant confondus',
      description:
        'La phase fixe est le support ; l’éluant est la phase mobile qui monte par capillarité.',
      remediation:
        'Phase FIXE = le support (papier, silice), elle ne bouge pas. ÉLUANT = phase ' +
        'MOBILE, elle monte et entraîne les espèces.',
    },
    {
      id: 'confond_lecture_verticale',
      objectif_id: OBJ_CHIM_CHROMATO_LECTURE,
      libelle: 'Lecture verticale mal interprétée',
      description: 'Le nombre de taches d’un dépôt indique pur (1) ou mélange (plusieurs).',
      remediation:
        'Compte les taches du dépôt : une seule → corps pur ; plusieurs → mélange.',
    },
    {
      id: 'confond_lecture_horizontale',
      objectif_id: OBJ_CHIM_CHROMATO_LECTURE,
      libelle: 'Lecture horizontale mal interprétée',
      description:
        'Deux taches à la même hauteur ont la même solubilité dans l’éluant : même espèce.',
      remediation:
        'Même hauteur = même espèce chimique. C’est ce qui permet de dire quelles ' +
        'espèces composent le mélange.',
    },
  ];

  for (const e of erreurs) {
    cat.ajouter({
      ...meta,
      id: id<ErreurTypeId>(e.id),
      ...(e.objectif_id ? { objectif_id: e.objectif_id } : {}),
      libelle: e.libelle,
      description: e.description,
      remediation: e.remediation,
    });
  }
  return cat;
}
