import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ErreurTypeId, ObjectifId, TenantId } from '../../contracts/index.js';
import { HorlogeManuelle, id } from '../core.js';
import {
  OBJ_CHIM_CCM,
  OBJ_CHIM_CHROMATO_LECTURE,
  OBJ_CHIM_CORPS_PURS,
  OBJ_CHIM_DENSITE,
  OBJ_CHIM_MASSE_VOLUMIQUE,
  OBJ_CHIM_MELANGES,
  REF_CHIMIE,
  catalogueErreursChimie,
  curriculumChimie,
} from './chimie.js';

const TENANT = id<TenantId>('t-test');
const horloge = () => new HorlogeManuelle(new Date('2026-06-28T09:00:00.000Z'));

test('curriculumChimie : les 8 objectifs du chapitre sont présents', async () => {
  const c = curriculumChimie(TENANT, horloge());
  const objectifs = await c.objectifs(REF_CHIMIE);
  assert.equal(objectifs.length, 8);
  // Tous rattachés à la même notion (le chapitre) et au bon référentiel.
  for (const o of objectifs) {
    assert.equal(o.referentiel_id, REF_CHIMIE);
    assert.equal(o.notion, 'Identification des espèces chimiques');
    assert.ok(o.libelle.length > 10, `libellé exploitable pour ${o.id}`);
    assert.ok(o.competences.length > 0, `compétences renseignées pour ${o.id}`);
  }
});

test('curriculumChimie : le DAG de prérequis est correct et acyclique', async () => {
  const c = curriculumChimie(TENANT, horloge());

  // Arêtes attendues (permettent de remonter à la cause racine d'un échec).
  const prereqMelanges = await c.prerequisDirects(OBJ_CHIM_MELANGES);
  assert.deepEqual(prereqMelanges.map((o) => o.id), [OBJ_CHIM_CORPS_PURS]);

  const prereqDensite = await c.prerequisDirects(OBJ_CHIM_DENSITE);
  assert.deepEqual(prereqDensite.map((o) => o.id), [OBJ_CHIM_MASSE_VOLUMIQUE]);

  const prereqLecture = await c.prerequisDirects(OBJ_CHIM_CHROMATO_LECTURE);
  assert.deepEqual(
    [...prereqLecture.map((o) => o.id)].sort(),
    [OBJ_CHIM_CCM, OBJ_CHIM_CORPS_PURS].sort(),
  );

  // « corps purs » est la racine : aucun prérequis en amont.
  assert.deepEqual(await c.prerequisDirects(OBJ_CHIM_CORPS_PURS), []);

  // Acyclicité : un parcours en profondeur ne doit jamais revisiter un nœud actif.
  const objectifs = await c.objectifs(REF_CHIMIE);
  const enCours = new Set<ObjectifId>();
  const vus = new Set<ObjectifId>();
  const visiter = async (n: ObjectifId): Promise<void> => {
    if (vus.has(n)) return;
    assert.ok(!enCours.has(n), `cycle détecté sur ${n}`);
    enCours.add(n);
    for (const p of await c.prerequisDirects(n)) await visiter(p.id);
    enCours.delete(n);
    vus.add(n);
  };
  for (const o of objectifs) await visiter(o.id);
  assert.equal(vus.size, 8);
});

test('curriculumChimie : chaque objectif a au moins un template ET une explication', async () => {
  const c = curriculumChimie(TENANT, horloge());
  for (const o of await c.objectifs(REF_CHIMIE)) {
    const templates = await c.templatesPourObjectif(o.id);
    assert.ok(templates.length > 0, `template manquant pour ${o.id}`);
    const explications = await c.explicationsPourObjectif(o.id);
    assert.ok(explications.length > 0, `explication manquante pour ${o.id}`);
    // R1 : le contenu prof est la référence, et il est validé.
    for (const t of templates) {
      assert.equal(t.origine, 'prof', `${t.id} doit être d'origine prof`);
      assert.equal(t.statut, 'valide', `${t.id} doit être validé`);
      assert.ok(t.etapes.length > 0, `${t.id} doit avoir au moins une étape`);
    }
  }
});

test('curriculumChimie : toute erreur piégée possède sa remédiation', async () => {
  // Contrôle d'intégrité central : si le vérificateur diagnostique une erreur,
  // le tuteur DOIT pouvoir proposer la remédiation correspondante. Sans ça, le
  // bilan détecte un problème sans savoir quoi réexpliquer.
  const c = curriculumChimie(TENANT, horloge());
  const cat = catalogueErreursChimie(TENANT, horloge());

  const piegees = new Set<string>();
  for (const o of await c.objectifs(REF_CHIMIE)) {
    for (const t of await c.templatesPourObjectif(o.id)) {
      for (const e of t.etapes) {
        const q = e.question;
        if (q.kind === 'numeric') {
          for (const p of q.pieges ?? []) piegees.add(p.erreur_type_id);
        } else if (q.kind === 'qcm') {
          for (const opt of q.options) {
            if (opt.erreur_type_id) piegees.add(opt.erreur_type_id);
          }
        }
      }
    }
  }
  assert.ok(piegees.size >= 12, `assez d'erreurs piégées (${piegees.size})`);

  // Les erreurs transverses viennent du catalogue de physique (grandeur-quotient).
  const TRANSVERSES = new Set(['multiplie_au_lieu_de_diviser', 'inverse_division', 'ecart_numerique']);
  for (const idErr of piegees) {
    if (TRANSVERSES.has(idErr)) continue;
    const e = await cat.obtenir(id<ErreurTypeId>(idErr));
    assert.ok(e, `remédiation manquante pour l'erreur « ${idErr} »`);
    assert.ok(e.remediation.length > 20, `remédiation exploitable pour « ${idErr} »`);
    assert.ok(e.libelle.length > 3, `libellé pour « ${idErr} »`);
  }
});

test('curriculumChimie : le fer III est bien Fe³⁺ (anomalie du document source)', async () => {
  // Le PDF du prof note « Fer III  Fe2+ » : c'est une coquille. On vérifie que le
  // contenu servi à l'élève porte la bonne charge, et que la confusion est piégée.
  const c = curriculumChimie(TENANT, horloge());
  const cat = catalogueErreursChimie(TENANT, horloge());

  const explication = (await c.explicationsPourObjectif(id<ObjectifId>('obj-chim-tests')))
    .map((e) => e.contenu)
    .join(' ');
  assert.match(explication, /Fe³⁺ rouille/, 'le fer III doit être Fe³⁺');
  assert.doesNotMatch(explication, /Fer III[^.]*Fe²⁺/, 'pas de fer III noté Fe²⁺');

  const err = await cat.obtenir(id<ErreurTypeId>('confond_fe2_fe3'));
  assert.ok(err, 'la confusion Fe²⁺/Fe³⁺ doit être catalogée');
  assert.match(err.remediation, /rouille/);
});

test('catalogueErreursChimie : erreurs rattachées à leur objectif', async () => {
  const cat = catalogueErreursChimie(TENANT, horloge());
  // La remédiation ciblée suppose de savoir QUEL objectif retravailler.
  const pourDensite = await cat.pourObjectif(OBJ_CHIM_DENSITE);
  const ids = pourDensite.map((e) => e.id);
  assert.ok(ids.includes('donne_unite_a_densite' as ErreurTypeId));
  assert.ok(ids.includes('confond_masse_volumique_densite' as ErreurTypeId));
});
