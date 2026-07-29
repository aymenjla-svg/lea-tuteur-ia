/**
 * Loader de curriculum YAML versionné (§6 : « YAML versionné, BO = 1er
 * référentiel »). Le contenu est l'actif stratégique (R1) : on le tient en
 * données éditables, hors du code.
 *
 * Construit un `InMemoryCurriculum` validé : référentiel, objectifs, DAG de
 * prérequis, templates (origine/statut) et explications. Toute incohérence
 * lève une erreur explicite (mieux vaut échouer au chargement qu'en séance).
 */

import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

import type {
  Competence,
  ExerciceTemplate,
  Explication,
  ExerciceTemplateId,
  ExplicationId,
  Modalite,
  Objectif,
  ObjectifId,
  Question,
  ReferentielId,
  TenantId,
} from '../../contracts/index.js';
import { COMPETENCES, type Horloge, id } from '../core.js';
import { InMemoryCurriculum } from './in-memory-curriculum.js';

const MODALITES: readonly Modalite[] = ['textuel', 'visuel', 'interactif'];

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function exigerChaine(v: unknown, ou: string): string {
  if (typeof v !== 'string' || v === '') throw new Error(`Chaîne attendue : ${ou}.`);
  return v;
}
function exigerNombre(v: unknown, ou: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`Nombre attendu : ${ou}.`);
  return v;
}
function exigerTableau(v: unknown, ou: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`Liste attendue : ${ou}.`);
  return v;
}

function versCompetences(v: unknown, ou: string): Competence[] {
  return exigerTableau(v ?? [], ou).map((c) => {
    const s = exigerChaine(c, `${ou}[]`);
    if (!COMPETENCES.includes(s as Competence)) {
      throw new Error(`Compétence inconnue « ${s} » (${ou}). Attendu : ${COMPETENCES.join(', ')}.`);
    }
    return s as Competence;
  });
}

function versModalite(v: unknown, ou: string): Modalite {
  const s = exigerChaine(v, ou);
  if (!MODALITES.includes(s as Modalite)) throw new Error(`Modalité inconnue « ${s} » (${ou}).`);
  return s as Modalite;
}

function versQuestion(v: unknown, ou: string): Question {
  if (!estObjet(v)) throw new Error(`Question attendue : ${ou}.`);
  const kind = exigerChaine(v.kind, `${ou}.kind`);
  const modalite = versModalite(v.modalite ?? 'textuel', `${ou}.modalite`);
  const enonce = exigerChaine(v.enonce, `${ou}.enonce`);

  switch (kind) {
    case 'numeric': {
      const attendu = estObjet(v.attendu) ? v.attendu : undefined;
      if (!attendu) throw new Error(`${ou}.attendu requis.`);
      const pieges = Array.isArray(v.pieges)
        ? v.pieges.map((p, i) => {
            if (!estObjet(p)) throw new Error(`${ou}.pieges[${i}] invalide.`);
            return {
              valeur: exigerNombre(p.valeur, `${ou}.pieges[${i}].valeur`),
              erreur_type_id: exigerChaine(p.erreur_type_id, `${ou}.pieges[${i}].erreur_type_id`),
              ...(typeof p.tolerance === 'number' ? { tolerance: p.tolerance } : {}),
            };
          })
        : undefined;
      return {
        kind: 'numeric',
        modalite,
        enonce,
        attendu: {
          valeur: exigerNombre(attendu.valeur, `${ou}.attendu.valeur`),
          tolerance: exigerNombre(attendu.tolerance ?? 0, `${ou}.attendu.tolerance`),
          ...(typeof attendu.unite === 'string' ? { unite: attendu.unite } : {}),
        },
        ...(pieges ? { pieges } : {}),
      };
    }
    case 'qcm': {
      const options = exigerTableau(v.options, `${ou}.options`).map((o, i) => {
        if (!estObjet(o)) throw new Error(`${ou}.options[${i}] invalide.`);
        return {
          id: exigerChaine(o.id, `${ou}.options[${i}].id`),
          libelle: exigerChaine(o.libelle, `${ou}.options[${i}].libelle`),
          ...(typeof o.erreur_type_id === 'string' ? { erreur_type_id: o.erreur_type_id } : {}),
        };
      });
      return {
        kind: 'qcm',
        modalite,
        enonce,
        options,
        bonnes_reponses: exigerTableau(v.bonnes_reponses, `${ou}.bonnes_reponses`).map((b) =>
          exigerChaine(b, `${ou}.bonnes_reponses[]`),
        ),
        choix_multiple: v.choix_multiple === true,
      };
    }
    case 'symbolic': {
      const attendu = estObjet(v.attendu) ? v.attendu : undefined;
      if (!attendu) throw new Error(`${ou}.attendu requis.`);
      return {
        kind: 'symbolic',
        modalite,
        enonce,
        attendu: {
          expression: exigerChaine(attendu.expression, `${ou}.attendu.expression`),
          variables: exigerTableau(attendu.variables ?? [], `${ou}.attendu.variables`).map((x) =>
            exigerChaine(x, `${ou}.attendu.variables[]`),
          ),
        },
      };
    }
    case 'libre': {
      const criteres = exigerTableau(v.criteres, `${ou}.criteres`).map((c, i) => {
        if (!estObjet(c)) throw new Error(`${ou}.criteres[${i}] invalide.`);
        return {
          id: exigerChaine(c.id, `${ou}.criteres[${i}].id`),
          description: exigerChaine(c.description, `${ou}.criteres[${i}].description`),
          requis: c.requis !== false,
          ...(Array.isArray(c.mots_cles)
            ? { mots_cles: c.mots_cles.map((m) => exigerChaine(m, `${ou}.criteres[${i}].mots_cles[]`)) }
            : {}),
        };
      });
      return { kind: 'libre', modalite, enonce, criteres };
    }
    default:
      throw new Error(`Type de question inconnu « ${kind} » (${ou}).`);
  }
}

export interface CurriculumCharge {
  readonly curriculum: InMemoryCurriculum;
  readonly referentiel_id: ReferentielId;
}

/** Charge un curriculum depuis un texte YAML. */
export function chargerCurriculumYaml(
  texte: string,
  tenant_id: TenantId,
  horloge: Horloge,
): CurriculumCharge {
  const doc: unknown = parse(texte);
  if (!estObjet(doc)) throw new Error('Document YAML vide ou invalide.');

  const t = horloge.maintenant();
  const meta = { tenant_id, cree_le: t, modifie_le: t } as const;

  const refRaw = estObjet(doc.referentiel) ? doc.referentiel : undefined;
  if (!refRaw) throw new Error('Bloc « referentiel » manquant.');
  const referentiel_id = id<ReferentielId>(exigerChaine(refRaw.id, 'referentiel.id'));

  const curriculum = new InMemoryCurriculum();

  const objets = exigerTableau(doc.objectifs, 'objectifs');
  // 1ʳᵉ passe : objectifs (pour valider les prérequis ensuite).
  const idsConnus = new Set<string>();
  for (const o of objets) {
    if (!estObjet(o)) throw new Error('Objectif invalide.');
    const oid = exigerChaine(o.id, 'objectif.id');
    idsConnus.add(oid);
    curriculum.ajouterObjectif({
      ...meta,
      id: id<ObjectifId>(oid),
      referentiel_id,
      libelle: exigerChaine(o.libelle, `${oid}.libelle`),
      notion: exigerChaine(o.notion, `${oid}.notion`),
      competences: versCompetences(o.competences, `${oid}.competences`),
    });
  }

  // 2ᵉ passe : prérequis (DAG), templates, explications.
  for (const o of objets as Record<string, unknown>[]) {
    const oid = exigerChaine(o.id, 'objectif.id');
    for (const p of (o.prerequis as unknown[]) ?? []) {
      const pid = exigerChaine(p, `${oid}.prerequis[]`);
      if (!idsConnus.has(pid)) throw new Error(`Prérequis inconnu « ${pid} » pour ${oid}.`);
      curriculum.ajouterPrerequis({
        ...meta,
        objectif_id: id<ObjectifId>(oid),
        prerequis_id: id<ObjectifId>(pid),
      });
    }

    for (const tmpl of (o.templates as unknown[]) ?? []) {
      if (!estObjet(tmpl)) throw new Error(`Template invalide pour ${oid}.`);
      const etapes = exigerTableau(tmpl.etapes, `${oid}.templates.etapes`).map((e, i) => {
        if (!estObjet(e)) throw new Error(`${oid}.etapes[${i}] invalide.`);
        return {
          ordre: exigerNombre(e.ordre ?? i + 1, `${oid}.etapes[${i}].ordre`),
          question: versQuestion(e.question, `${oid}.etapes[${i}].question`),
          ...(typeof e.indice === 'string' ? { indice: e.indice } : {}),
        };
      });
      const template: ExerciceTemplate = {
        ...meta,
        id: id<ExerciceTemplateId>(exigerChaine(tmpl.id, `${oid}.template.id`)),
        objectif_id: id<ObjectifId>(oid),
        origine: tmpl.origine === 'llm' ? 'llm' : 'prof',
        statut:
          tmpl.statut === 'a_valider' ? 'a_valider' : tmpl.statut === 'rejete' ? 'rejete' : 'valide',
        parametres: [],
        etapes,
        representations: [],
      };
      curriculum.ajouterTemplate(template);
    }

    for (const ex of (o.explications as unknown[]) ?? []) {
      if (!estObjet(ex)) throw new Error(`Explication invalide pour ${oid}.`);
      const explication: Explication = {
        ...meta,
        id: id<ExplicationId>(exigerChaine(ex.id, `${oid}.explication.id`)),
        objectif_id: id<ObjectifId>(oid),
        modalite: versModalite(ex.modalite ?? 'textuel', `${oid}.explication.modalite`),
        contenu: exigerChaine(ex.contenu, `${oid}.explication.contenu`),
        ...(typeof ex.asset === 'string' ? { asset: ex.asset } : {}),
      };
      curriculum.ajouterExplication(explication);
    }
  }

  return { curriculum, referentiel_id };
}

/** Charge un curriculum depuis un fichier YAML. */
export function chargerCurriculumFichier(
  chemin: string,
  tenant_id: TenantId,
  horloge: Horloge,
): CurriculumCharge {
  return chargerCurriculumYaml(readFileSync(chemin, 'utf8'), tenant_id, horloge);
}
