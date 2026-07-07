"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

  // src/engine/core.ts
  var _instant;
  var HorlogeManuelle = class {
    constructor(depart) {
      __privateAdd(this, _instant);
      __privateSet(this, _instant, new Date(depart.getTime()));
    }
    maintenant() {
      return __privateGet(this, _instant).toISOString();
    }
    /** Avance le temps de `ms` millisecondes. */
    avancer(ms) {
      __privateSet(this, _instant, new Date(__privateGet(this, _instant).getTime() + ms));
    }
  };
  _instant = new WeakMap();
  function versEpoch(t) {
    return new Date(t).getTime();
  }
  function nouvelId() {
    return crypto.randomUUID();
  }
  function id(valeur) {
    return valeur;
  }
  function rngDepuisGraine(graine) {
    let a = graine >>> 0;
    return () => {
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function normaliser(texte) {
    return texte.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  }
  var COMPETENCES = [
    "chercher",
    "modeliser",
    "representer",
    "raisonner",
    "calculer",
    "communiquer"
  ];
  function evenement(tenant_id2, type, payload, horodatage) {
    return { tenant_id: tenant_id2, type, payload, horodatage };
  }
  var CollecteurEvenements = class {
    constructor() {
      __publicField(this, "evenements", []);
    }
    async emettre(evenement2) {
      this.evenements.push(evenement2);
    }
  };

  // src/engine/curriculum/in-memory-curriculum.ts
  var _objectifs, _prerequis, _templates, _explications, _InMemoryCurriculum_instances, resoudre_fn;
  var InMemoryCurriculum = class {
    constructor() {
      __privateAdd(this, _InMemoryCurriculum_instances);
      __privateAdd(this, _objectifs, /* @__PURE__ */ new Map());
      __privateAdd(this, _prerequis, []);
      __privateAdd(this, _templates, /* @__PURE__ */ new Map());
      __privateAdd(this, _explications, /* @__PURE__ */ new Map());
    }
    ajouterObjectif(o) {
      __privateGet(this, _objectifs).set(o.id, o);
    }
    ajouterPrerequis(p) {
      __privateGet(this, _prerequis).push(p);
    }
    ajouterTemplate(t) {
      const liste = __privateGet(this, _templates).get(t.objectif_id) ?? [];
      liste.push(t);
      __privateGet(this, _templates).set(t.objectif_id, liste);
    }
    ajouterExplication(e) {
      const liste = __privateGet(this, _explications).get(e.objectif_id) ?? [];
      liste.push(e);
      __privateGet(this, _explications).set(e.objectif_id, liste);
    }
    async obtenirObjectif(idObjectif) {
      return __privateGet(this, _objectifs).get(idObjectif) ?? null;
    }
    async objectifs(referentiel_id) {
      return [...__privateGet(this, _objectifs).values()].filter(
        (o) => o.referentiel_id === referentiel_id
      );
    }
    async prerequisDirects(idObjectif) {
      const ids = __privateGet(this, _prerequis).filter((p) => p.objectif_id === idObjectif).map((p) => p.prerequis_id);
      return __privateMethod(this, _InMemoryCurriculum_instances, resoudre_fn).call(this, ids);
    }
    async objectifsSuivants(idObjectif) {
      const ids = __privateGet(this, _prerequis).filter((p) => p.prerequis_id === idObjectif).map((p) => p.objectif_id);
      return __privateMethod(this, _InMemoryCurriculum_instances, resoudre_fn).call(this, ids);
    }
    async templatesPourObjectif(idObjectif) {
      return __privateGet(this, _templates).get(idObjectif) ?? [];
    }
    async explicationsPourObjectif(idObjectif, modalite) {
      const liste = __privateGet(this, _explications).get(idObjectif) ?? [];
      return modalite ? liste.filter((e) => e.modalite === modalite) : liste;
    }
  };
  _objectifs = new WeakMap();
  _prerequis = new WeakMap();
  _templates = new WeakMap();
  _explications = new WeakMap();
  _InMemoryCurriculum_instances = new WeakSet();
  resoudre_fn = function(ids) {
    const out = [];
    for (const i of ids) {
      const o = __privateGet(this, _objectifs).get(i);
      if (o) out.push(o);
    }
    return out;
  };
  var REF_BO = id("ref-bo-cycle3-maths");
  var OBJ_ADDITION = id("obj-addition-2-chiffres");
  var OBJ_PREREQ = id("obj-tables-addition");

  // src/engine/erreurs/catalogue-erreurs.ts
  var _parId;
  var InMemoryCatalogueErreurs = class {
    constructor() {
      __privateAdd(this, _parId, /* @__PURE__ */ new Map());
    }
    ajouter(e) {
      __privateGet(this, _parId).set(e.id, e);
    }
    async obtenir(idErreur) {
      return __privateGet(this, _parId).get(idErreur) ?? null;
    }
    async pourObjectif(objectif_id) {
      return [...__privateGet(this, _parId).values()].filter(
        (e) => e.objectif_id === objectif_id
      );
    }
  };
  _parId = new WeakMap();

  // src/engine/curriculum/physique.ts
  var REF_PHYSIQUE = id("ref-bo-pc-cycle4");
  var OBJ_VITESSE = id("obj-vitesse");
  var OBJ_VITESSE_PREREQ = id("obj-vitesse-relation");
  var OBJ_POIDS = id("obj-poids");
  var OBJ_OHM = id("obj-ohm");
  function curriculumPhysique(tenant_id2, horloge2) {
    const t = horloge2.maintenant();
    const meta = { tenant_id: tenant_id2, cree_le: t, modifie_le: t };
    const referentiel = {
      ...meta,
      id: REF_PHYSIQUE,
      libelle: "BO \u2014 Physique-Chimie, cycle 4",
      version: "2020.07"
    };
    const c = new InMemoryCurriculum();
    c.ajouterObjectif({
      ...meta,
      id: OBJ_VITESSE_PREREQ,
      referentiel_id: referentiel.id,
      libelle: "Relier vitesse, distance et dur\xE9e",
      notion: "Mouvements et interactions",
      competences: ["modeliser", "calculer"]
    });
    c.ajouterObjectif({
      ...meta,
      id: OBJ_VITESSE,
      referentiel_id: referentiel.id,
      libelle: "Calculer une vitesse (v = d/t)",
      notion: "Mouvements et interactions",
      competences: ["modeliser", "calculer"]
    });
    c.ajouterObjectif({
      ...meta,
      id: OBJ_POIDS,
      referentiel_id: referentiel.id,
      libelle: "Calculer un poids (P = m\xB7g) et le distinguer de la masse",
      notion: "Mouvements et interactions",
      competences: ["raisonner", "calculer"]
    });
    c.ajouterObjectif({
      ...meta,
      id: OBJ_OHM,
      referentiel_id: referentiel.id,
      libelle: "Exploiter la loi d\u2019Ohm (U = R\xB7I)",
      notion: "L\u2019\xE9nergie, ses transferts et ses conversions",
      competences: ["modeliser", "calculer"]
    });
    c.ajouterPrerequis({ ...meta, objectif_id: OBJ_VITESSE, prerequis_id: OBJ_VITESSE_PREREQ });
    c.ajouterTemplate({
      ...meta,
      id: id("tmpl-vitesse-relation-12-4"),
      objectif_id: OBJ_VITESSE_PREREQ,
      origine: "prof",
      statut: "valide",
      parametres: [],
      etapes: [
        {
          ordre: 1,
          question: {
            kind: "numeric",
            modalite: "textuel",
            enonce: "Un pi\xE9ton parcourt 12 m en 4 s. Quelle est sa vitesse, en m/s ?",
            attendu: { valeur: 3, tolerance: 0 },
            // 48 = distance × durée (au lieu de ÷).
            pieges: [{ valeur: 48, erreur_type_id: "multiplie_au_lieu_de_diviser" }]
          },
          indice: "La vitesse est une distance divis\xE9e par une dur\xE9e."
        }
      ],
      representations: [
        { modalite: "textuel", texte: "Divise la distance (12 m) par la dur\xE9e (4 s)." }
      ]
    });
    c.ajouterTemplate({
      ...meta,
      id: id("tmpl-vitesse-150-3"),
      objectif_id: OBJ_VITESSE,
      origine: "prof",
      statut: "valide",
      parametres: [],
      etapes: [
        {
          ordre: 1,
          question: {
            kind: "numeric",
            modalite: "textuel",
            enonce: "Une voiture parcourt 150 km en 3 h. Quelle est sa vitesse moyenne, en km/h ?",
            attendu: { valeur: 50, tolerance: 0 },
            pieges: [
              // 450 = 150 × 3 (multiplie au lieu de diviser).
              { valeur: 450, erreur_type_id: "multiplie_au_lieu_de_diviser" },
              // 0.02 = 3 ÷ 150 (division inversée).
              { valeur: 0.02, erreur_type_id: "inverse_division" }
            ]
          },
          indice: "Divise la distance par la dur\xE9e : v = d \xF7 t."
        }
      ],
      representations: [
        { modalite: "textuel", texte: "\xC9cris v = d / t, remplace d et t, puis calcule." }
      ]
    });
    c.ajouterTemplate({
      ...meta,
      id: id("tmpl-poids-5kg"),
      objectif_id: OBJ_POIDS,
      origine: "prof",
      statut: "valide",
      parametres: [],
      etapes: [
        {
          ordre: 1,
          question: {
            kind: "numeric",
            modalite: "textuel",
            enonce: "Sur Terre (g = 10 N/kg), quel est le poids d\u2019un objet de masse 5 kg, en newtons ?",
            attendu: { valeur: 50, tolerance: 0 },
            pieges: [
              // 5 = on rend la masse (confusion masse / poids).
              { valeur: 5, erreur_type_id: "confond_masse_poids" },
              // 0.5 = m ÷ g (relation inversée).
              { valeur: 0.5, erreur_type_id: "inverse_relation" }
            ]
          },
          indice: "Le poids s\u2019obtient avec P = m \xD7 g."
        }
      ],
      representations: [
        { modalite: "textuel", texte: "La masse est en kg, le poids en N : P = m \xD7 g." }
      ]
    });
    c.ajouterTemplate({
      ...meta,
      id: id("tmpl-ohm-30-2"),
      objectif_id: OBJ_OHM,
      origine: "prof",
      statut: "valide",
      parametres: [],
      etapes: [
        {
          ordre: 1,
          question: {
            kind: "numeric",
            modalite: "textuel",
            enonce: "Un conducteur ohmique de r\xE9sistance 30 \u03A9 est parcouru par un courant de 2 A. Quelle est la tension \xE0 ses bornes, en volts ?",
            attendu: { valeur: 60, tolerance: 0 },
            pieges: [
              // 15 = R ÷ I (relation inversée).
              { valeur: 15, erreur_type_id: "inverse_relation" },
              // 32 = R + I (additionne au lieu de multiplier).
              { valeur: 32, erreur_type_id: "additionne_au_lieu_de_multiplier" }
            ]
          },
          indice: "La loi d\u2019Ohm relie tension, r\xE9sistance et intensit\xE9 : U = R \xD7 I."
        }
      ],
      representations: [
        { modalite: "textuel", texte: "U (V) = R (\u03A9) \xD7 I (A)." }
      ]
    });
    c.ajouterExplication({
      ...meta,
      id: id("expl-vitesse"),
      objectif_id: OBJ_VITESSE,
      modalite: "textuel",
      contenu: "La vitesse moyenne est la distance parcourue divis\xE9e par la dur\xE9e du trajet : v = d / t. Si d est en kilom\xE8tres et t en heures, alors v est en km/h."
    });
    return c;
  }
  function catalogueErreursPhysique(tenant_id2, horloge2) {
    const t = horloge2.maintenant();
    const meta = { tenant_id: tenant_id2, cree_le: t, modifie_le: t };
    const cat = new InMemoryCatalogueErreurs();
    const erreurs = [
      {
        id: "multiplie_au_lieu_de_diviser",
        libelle: "Multiplication au lieu d\u2019une division",
        description: "Une grandeur-quotient (comme la vitesse) est obtenue par une division.",
        remediation: "Ici il faut diviser, pas multiplier : une vitesse est une distance divis\xE9e par une dur\xE9e."
      },
      {
        id: "inverse_division",
        libelle: "Division invers\xE9e",
        description: "Le dividende et le diviseur ont \xE9t\xE9 \xE9chang\xE9s.",
        remediation: "V\xE9rifie l\u2019ordre : on divise la distance par la dur\xE9e, pas l\u2019inverse."
      },
      {
        id: "confond_masse_poids",
        libelle: "Confusion masse / poids",
        description: "La masse (en kg) et le poids (en N) sont deux grandeurs diff\xE9rentes.",
        remediation: "La masse (kg) et le poids (N) sont diff\xE9rents : le poids se calcule avec P = m \xD7 g."
      },
      {
        id: "inverse_relation",
        libelle: "Relation utilis\xE9e \xE0 l\u2019envers",
        description: "La relation a \xE9t\xE9 appliqu\xE9e dans le mauvais sens.",
        remediation: "Reprends la relation et isole bien la grandeur cherch\xE9e avant de calculer."
      },
      {
        id: "additionne_au_lieu_de_multiplier",
        libelle: "Addition au lieu d\u2019une multiplication",
        description: "Les grandeurs de la relation se multiplient, elles ne s\u2019additionnent pas.",
        remediation: "Dans cette relation, les grandeurs se multiplient : relis la formule attentivement."
      },
      {
        id: "ecart_numerique",
        libelle: "\xC9cart num\xE9rique",
        description: "Le r\xE9sultat est \xE9loign\xE9 de la valeur attendue.",
        remediation: "V\xE9rifie chaque \xE9tape de ton calcul et les unit\xE9s, sans te presser."
      }
    ];
    for (const e of erreurs) {
      cat.ajouter({ ...meta, id: id(e.id), libelle: e.libelle, description: e.description, remediation: e.remediation });
    }
    return cat;
  }

  // src/engine/learner-model/heuristic-learner-model.ts
  var DEFAUTS = {
    prior: 0.1,
    alpha: 0.4,
    beta: 0.5,
    demiVieJours: 7,
    seuilRevision: 0.7
  };
  var MS_PAR_JOUR = 864e5;
  function clef(eleve, objectif) {
    return `${eleve}::${objectif}`;
  }
  var _maitrises, _params, _lambda, _HeuristicLearnerModel_instances, effective_fn;
  var HeuristicLearnerModel = class {
    // constante de decay dérivée de la demi-vie
    constructor(tenant_id2, curriculum2, horloge2, params = {}) {
      __publicField(this, "tenant_id", tenant_id2);
      __publicField(this, "curriculum", curriculum2);
      __publicField(this, "horloge", horloge2);
      __privateAdd(this, _HeuristicLearnerModel_instances);
      __privateAdd(this, _maitrises, /* @__PURE__ */ new Map());
      __privateAdd(this, _params);
      __privateAdd(this, _lambda);
      __privateSet(this, _params, { ...DEFAUTS, ...params });
      __privateSet(this, _lambda, Math.LN2 / __privateGet(this, _params).demiVieJours);
    }
    async enregistrerTentative(tentative) {
      const k = clef(tentative.eleve_id, tentative.objectif_id);
      const precedent = __privateGet(this, _maitrises).get(k);
      const pAvant = precedent?.probabilite_maitrise ?? __privateGet(this, _params).prior;
      const reussi = tentative.verdict.correct;
      const pApres = reussi ? pAvant + __privateGet(this, _params).alpha * (1 - pAvant) : pAvant * (1 - __privateGet(this, _params).beta);
      const maj = {
        tenant_id: this.tenant_id,
        eleve_id: tentative.eleve_id,
        objectif_id: tentative.objectif_id,
        probabilite_maitrise: arrondir(pApres),
        derniere_revision: tentative.horodatage,
        nb_tentatives: (precedent?.nb_tentatives ?? 0) + 1,
        cree_le: precedent?.cree_le ?? tentative.horodatage,
        modifie_le: tentative.horodatage,
        ...reussi ? { derniere_reussite: tentative.horodatage } : precedent?.derniere_reussite ? { derniere_reussite: precedent.derniere_reussite } : {}
      };
      __privateGet(this, _maitrises).set(k, maj);
      return maj;
    }
    async niveauMaitrise(eleve_id, objectif_id, maintenant) {
      const m = __privateGet(this, _maitrises).get(clef(eleve_id, objectif_id));
      if (!m) {
        return {
          objectif_id,
          probabilite_effective: 0,
          a_reviser: false
        };
      }
      return __privateMethod(this, _HeuristicLearnerModel_instances, effective_fn).call(this, m, maintenant);
    }
    async objectifsAReviser(eleve_id, maintenant) {
      const resultats = [];
      for (const m of __privateGet(this, _maitrises).values()) {
        if (m.eleve_id !== eleve_id) continue;
        const eff = __privateMethod(this, _HeuristicLearnerModel_instances, effective_fn).call(this, m, maintenant);
        if (eff.a_reviser) resultats.push(eff);
      }
      return resultats;
    }
    async profilCompetences(eleve_id) {
      const maintenant = this.horloge.maintenant();
      const sommes = /* @__PURE__ */ new Map();
      for (const c of COMPETENCES) sommes.set(c, { somme: 0, n: 0 });
      for (const m of __privateGet(this, _maitrises).values()) {
        if (m.eleve_id !== eleve_id) continue;
        const eff = __privateMethod(this, _HeuristicLearnerModel_instances, effective_fn).call(this, m, maintenant);
        const objectif = await this.curriculum.obtenirObjectif(m.objectif_id);
        if (!objectif) continue;
        for (const c of objectif.competences) {
          const acc = sommes.get(c);
          if (!acc) continue;
          acc.somme += eff.probabilite_effective;
          acc.n += 1;
        }
      }
      const niveaux = {
        chercher: 0,
        modeliser: 0,
        representer: 0,
        raisonner: 0,
        calculer: 0,
        communiquer: 0
      };
      for (const c of COMPETENCES) {
        const acc = sommes.get(c);
        niveaux[c] = acc && acc.n > 0 ? arrondir(acc.somme / acc.n) : 0;
      }
      return { eleve_id, niveaux, calcule_le: maintenant };
    }
  };
  _maitrises = new WeakMap();
  _params = new WeakMap();
  _lambda = new WeakMap();
  _HeuristicLearnerModel_instances = new WeakSet();
  /** Applique le decay (D4) à une maîtrise stockée, à l'instant donné. */
  effective_fn = function(m, maintenant) {
    const jours = Math.max(
      0,
      (versEpoch(maintenant) - versEpoch(m.derniere_revision)) / MS_PAR_JOUR
    );
    const facteur = Math.exp(-__privateGet(this, _lambda) * jours);
    const effective = arrondir(m.probabilite_maitrise * facteur);
    return {
      objectif_id: m.objectif_id,
      probabilite_effective: effective,
      a_reviser: effective < __privateGet(this, _params).seuilRevision
    };
  };
  function arrondir(x) {
    return Math.round(Math.min(1, Math.max(0, x)) * 1e3) / 1e3;
  }

  // src/engine/persistence/in-memory-store.ts
  var MagasinMemoire = class {
    constructor() {
      __publicField(this, "tentatives", []);
      __publicField(this, "alertes", []);
      __publicField(this, "dialogueTurns", []);
      __publicField(this, "evenements", new CollecteurEvenements());
    }
    ajouterTentative(t) {
      this.tentatives.push(t);
    }
    ajouterAlerte(a) {
      this.alertes.push(a);
    }
    ajouterTurn(d) {
      this.dialogueTurns.push(d);
    }
  };

  // src/engine/safety/minimal-safety-filter.ts
  var MOTIFS_HUMILIATION = [
    "nul",
    "nulle",
    "idiot",
    "b\xEAte",
    "stupide",
    "incapable",
    "d\xE9bile"
  ];
  var MOTIFS_DETRESSE = [
    "je veux mourir",
    "me faire du mal",
    "me faire mal",
    "plus envie de vivre",
    "personne ne m\u2019aime",
    "personne ne m\u2019aime pas",
    "je d\xE9teste ma vie"
  ];
  var REECRITURE_NEUTRE = "Reprenons calmement, \xE9tape par \xE9tape \u2014 tu peux y arriver.";
  function contient(texte, motifs) {
    const bas = texte.toLowerCase();
    for (const m of motifs) {
      if (bas.includes(m)) return m;
    }
    return null;
  }
  var _MinimalSafetyFilter_instances, alerte_fn;
  var MinimalSafetyFilter = class {
    constructor(tenant_id2, horloge2) {
      __publicField(this, "tenant_id", tenant_id2);
      __publicField(this, "horloge", horloge2);
      __privateAdd(this, _MinimalSafetyFilter_instances);
    }
    async filtrer(texte, source, contexte) {
      if (source === "llm_sortie") {
        const motif2 = contient(texte, MOTIFS_HUMILIATION);
        if (motif2) {
          return {
            decision: "reecrire",
            texte_sur: REECRITURE_NEUTRE,
            categories: ["humiliation"]
          };
        }
        return { decision: "autoriser", categories: [] };
      }
      const motif = contient(texte, MOTIFS_DETRESSE);
      if (motif) {
        const alerte = __privateMethod(this, _MinimalSafetyFilter_instances, alerte_fn).call(this, texte, contexte);
        return {
          decision: "autoriser",
          // on ne fait pas taire l'enfant
          categories: ["detresse", "auto_agression"],
          alerte
        };
      }
      return { decision: "autoriser", categories: [] };
    }
  };
  _MinimalSafetyFilter_instances = new WeakSet();
  alerte_fn = function(extraitBrut, contexte) {
    const t = this.horloge.maintenant();
    return {
      tenant_id: this.tenant_id,
      id: nouvelId(),
      eleve_id: contexte.eleve_id,
      session_id: contexte.session_id,
      categorie: "detresse",
      severite: "critique",
      extrait: extraitBrut.slice(0, 200),
      // minimisation (§9)
      cree_a: t,
      escalade_requise: true,
      cree_le: t,
      modifie_le: t
    };
  };

  // src/contracts/verifier.ts
  var __verdict = /* @__PURE__ */ Symbol("verdict");
  function creerVerdict(donnees) {
    return { [__verdict]: true, ...donnees };
  }

  // src/engine/verifier/expression.ts
  var PRECEDENCE = {
    "u-": 5,
    "^": 4,
    "*": 3,
    "/": 3,
    "+": 2,
    "-": 2
  };
  var DROITE = /* @__PURE__ */ new Set(["^", "u-"]);
  function tokeniser(src) {
    const tokens = [];
    let i = 0;
    const s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/,/g, ".");
    const estValeur = (tok) => tok !== void 0 && (tok.t === "num" || tok.t === "var" || tok.t === "rp");
    while (i < s.length) {
      const ch = s[i] ?? "";
      if (ch === " ") {
        i++;
        continue;
      }
      if (/[0-9.]/.test(ch)) {
        let j = i + 1;
        while (j < s.length && /[0-9.]/.test(s[j] ?? "")) j++;
        const v = Number(s.slice(i, j));
        if (!Number.isFinite(v)) return null;
        if (estValeur(tokens[tokens.length - 1])) tokens.push({ t: "op", v: "*" });
        tokens.push({ t: "num", v });
        i = j;
        continue;
      }
      if (/[a-zA-Z]/.test(ch)) {
        if (estValeur(tokens[tokens.length - 1])) tokens.push({ t: "op", v: "*" });
        tokens.push({ t: "var", v: ch });
        i++;
        continue;
      }
      if ("+-*/^".includes(ch)) {
        tokens.push({ t: "op", v: ch });
        i++;
        continue;
      }
      if (ch === "(") {
        if (estValeur(tokens[tokens.length - 1])) tokens.push({ t: "op", v: "*" });
        tokens.push({ t: "lp" });
        i++;
        continue;
      }
      if (ch === ")") {
        tokens.push({ t: "rp" });
        i++;
        continue;
      }
      return null;
    }
    return tokens;
  }
  function versRPN(tokens) {
    const sortie = [];
    const pile = [];
    let precedent;
    for (const tok of tokens) {
      if (tok.t === "num" || tok.t === "var") {
        sortie.push(tok);
      } else if (tok.t === "op") {
        const unaire = tok.v === "-" && (precedent === void 0 || precedent.t === "op" || precedent.t === "lp");
        const op = unaire ? { t: "op", v: "u-" } : tok;
        while (pile.length > 0) {
          const haut = pile[pile.length - 1];
          if (!haut || haut.t !== "op") break;
          const pHaut = PRECEDENCE[haut.v] ?? 0;
          const pOp = PRECEDENCE[op.v] ?? 0;
          if (pHaut > pOp || pHaut === pOp && !DROITE.has(op.v)) {
            sortie.push(pile.pop());
          } else break;
        }
        pile.push(op);
      } else if (tok.t === "lp") {
        pile.push(tok);
      } else {
        let trouve = false;
        while (pile.length > 0) {
          const haut = pile.pop();
          if (haut.t === "lp") {
            trouve = true;
            break;
          }
          sortie.push(haut);
        }
        if (!trouve) return null;
      }
      precedent = tok;
    }
    while (pile.length > 0) {
      const haut = pile.pop();
      if (haut.t === "lp" || haut.t === "rp") return null;
      sortie.push(haut);
    }
    return sortie;
  }
  function evaluerRPN(rpn, env) {
    const pile = [];
    for (const tok of rpn) {
      if (tok.t === "num") {
        pile.push(tok.v);
      } else if (tok.t === "var") {
        pile.push(env[tok.v] ?? Number.NaN);
      } else if (tok.t === "op") {
        if (tok.v === "u-") {
          const a2 = pile.pop();
          if (a2 === void 0) return Number.NaN;
          pile.push(-a2);
          continue;
        }
        const b = pile.pop();
        const a = pile.pop();
        if (a === void 0 || b === void 0) return Number.NaN;
        switch (tok.v) {
          case "+":
            pile.push(a + b);
            break;
          case "-":
            pile.push(a - b);
            break;
          case "*":
            pile.push(a * b);
            break;
          case "/":
            pile.push(a / b);
            break;
          case "^":
            pile.push(a ** b);
            break;
          default:
            return Number.NaN;
        }
      }
    }
    return pile.length === 1 ? pile[0] : Number.NaN;
  }
  function compiler(expr) {
    const tokens = tokeniser(expr);
    if (!tokens || tokens.length === 0) return null;
    return versRPN(tokens);
  }
  function variablesDe(rpn) {
    const set = /* @__PURE__ */ new Set();
    for (const t of rpn) if (t.t === "var") set.add(t.v);
    return [...set];
  }
  function equivalentes(attendu, candidat, variables = []) {
    const a = compiler(attendu);
    const b = compiler(candidat);
    if (!a || !b) return false;
    const vars = /* @__PURE__ */ new Set([
      ...variablesDe(a),
      ...variablesDe(b),
      ...variables
    ]);
    const noms = [...vars];
    const rng = rngDepuisGraine(24301);
    let valides = 0;
    const requis = 8;
    for (let essai = 0; essai < 40 && valides < requis; essai++) {
      const env = {};
      for (const n of noms) env[n] = 1 + rng() * 4;
      const va = evaluerRPN(a, env);
      const vb = evaluerRPN(b, env);
      if (!Number.isFinite(va) || !Number.isFinite(vb)) continue;
      valides++;
      const echelle = Math.max(1, Math.abs(va), Math.abs(vb));
      if (Math.abs(va - vb) > 1e-9 * echelle) return false;
    }
    return valides >= requis;
  }

  // src/engine/verifier/verifier-standard.ts
  var _VerifierStandard_instances, numeric_fn, qcm_fn, symbolic_fn, libre_fn;
  var VerifierStandard = class {
    constructor() {
      __privateAdd(this, _VerifierStandard_instances);
      __publicField(this, "kinds", [
        "numeric",
        "qcm",
        "symbolic",
        "libre"
      ]);
    }
    async verifier(question, reponse) {
      switch (question.kind) {
        case "numeric":
          return __privateMethod(this, _VerifierStandard_instances, numeric_fn).call(this, question, reponse);
        case "qcm":
          return __privateMethod(this, _VerifierStandard_instances, qcm_fn).call(this, question, reponse);
        case "symbolic":
          return __privateMethod(this, _VerifierStandard_instances, symbolic_fn).call(this, question, reponse);
        case "libre":
          return __privateMethod(this, _VerifierStandard_instances, libre_fn).call(this, question, reponse);
      }
    }
  };
  _VerifierStandard_instances = new WeakSet();
  numeric_fn = function(question, reponse) {
    const brut = (reponse.texte ?? "").trim().replace(",", ".");
    const valeur = Number(brut);
    if (brut === "" || !Number.isFinite(valeur)) {
      return creerVerdict({
        correct: false,
        criteres_satisfaits: [],
        erreur_type_id: "reponse_non_numerique",
        diagnostic: "La r\xE9ponse attendue est un nombre."
      });
    }
    if (Math.abs(valeur - question.attendu.valeur) <= question.attendu.tolerance) {
      return creerVerdict({ correct: true, criteres_satisfaits: ["valeur"] });
    }
    const piege = (question.pieges ?? []).find(
      (p) => Math.abs(valeur - p.valeur) <= (p.tolerance ?? 0)
    );
    const unite = question.attendu.unite ? ` ${question.attendu.unite}` : "";
    return creerVerdict({
      correct: false,
      criteres_satisfaits: [],
      erreur_type_id: piege?.erreur_type_id ?? "ecart_numerique",
      diagnostic: `Valeur attendue : ${question.attendu.valeur}${unite}.`
    });
  };
  qcm_fn = function(question, reponse) {
    const choisies = new Set(reponse.options_choisies ?? []);
    const bonnes = new Set(question.bonnes_reponses);
    if (!question.choix_multiple && choisies.size > 1) {
      return creerVerdict({
        correct: false,
        criteres_satisfaits: [],
        erreur_type_id: "choix_multiple_interdit",
        diagnostic: "Une seule r\xE9ponse est attendue."
      });
    }
    const correct = choisies.size === bonnes.size && [...bonnes].every((b) => choisies.has(b));
    if (correct) {
      return creerVerdict({ correct: true, criteres_satisfaits: ["selection"] });
    }
    const distracteur = question.options.find(
      (o) => choisies.has(o.id) && !bonnes.has(o.id) && o.erreur_type_id
    );
    return creerVerdict({
      correct: false,
      criteres_satisfaits: [],
      erreur_type_id: distracteur?.erreur_type_id ?? "selection_incorrecte",
      diagnostic: "La s\xE9lection ne correspond pas aux bonnes r\xE9ponses."
    });
  };
  symbolic_fn = function(question, reponse) {
    const candidat = (reponse.texte ?? "").trim();
    if (candidat === "") {
      return creerVerdict({
        correct: false,
        criteres_satisfaits: [],
        erreur_type_id: "reponse_vide",
        diagnostic: "Aucune expression fournie."
      });
    }
    const ok = equivalentes(
      question.attendu.expression,
      candidat,
      question.attendu.variables
    );
    if (ok) {
      return creerVerdict({ correct: true, criteres_satisfaits: ["equivalence"] });
    }
    return creerVerdict({
      correct: false,
      criteres_satisfaits: [],
      erreur_type_id: "expression_non_equivalente",
      diagnostic: "L\u2019expression n\u2019est pas \xE9quivalente \xE0 celle attendue."
    });
  };
  libre_fn = function(question, reponse) {
    const texte = normaliser(reponse.texte ?? "");
    const satisfaits = [];
    for (const critere of question.criteres) {
      const motsCles = critere.mots_cles ?? [];
      const ok = motsCles.length > 0 && motsCles.every((m) => texte.includes(normaliser(m)));
      if (ok) satisfaits.push(critere.id);
    }
    const requis = question.criteres.filter((c) => c.requis);
    const correct = requis.every((c) => satisfaits.includes(c.id));
    return creerVerdict(
      correct ? { correct: true, criteres_satisfaits: satisfaits } : {
        correct: false,
        criteres_satisfaits: satisfaits,
        erreur_type_id: "criteres_manquants",
        diagnostic: "Certains \xE9l\xE9ments attendus manquent dans la r\xE9ponse."
      }
    );
  };

  // src/engine/planning/eval-types.ts
  var POLITIQUES = {
    diagnostique: { aide: false, repetition: false, score_final: false },
    formative: { aide: true, repetition: true, score_final: false },
    sommative: { aide: false, repetition: false, score_final: true }
  };
  function politiqueEvaluation(type) {
    return POLITIQUES[type];
  }

  // src/engine/presence/emotion.ts
  function expressionVerdict(correct, echecsConsecutifs = 0) {
    if (correct) return "celebrate";
    return echecsConsecutifs >= 1 ? "concerned" : "encouraging";
  }

  // src/engine/session/lecon.ts
  function expressionParDefaut(coup) {
    switch (coup.type) {
      case "clore":
        return "happy";
      case "encourager":
      case "simplifier":
        return "encouraging";
      case "proposer":
      case "reformuler":
      case "changer_de_modalite":
      case "reviser":
        return "idle";
    }
  }
  var _sessions, _MoteurLecon_instances, surSucces_fn, surEchec_fn, aideRemediation_fn, appliquerLevier_fn, enregistrerResultat_fn, proposer_fn, charger_fn, entreeEleve_fn, direTuteur_fn, choisirLevier_fn, autreModalite_fn, etat_fn, emettre_fn, typeEval_fn, session_fn;
  var MoteurLecon = class {
    constructor(deps) {
      __publicField(this, "deps", deps);
      __privateAdd(this, _MoteurLecon_instances);
      __privateAdd(this, _sessions, /* @__PURE__ */ new Map());
    }
    /** Démarre une session : sélectionne l'objectif et PROPOSE le 1ᵉʳ exercice. */
    async demarrer(contexte) {
      const { template_id, question, indice } = await __privateMethod(this, _MoteurLecon_instances, proposer_fn).call(this, contexte.objectif_initial);
      const session = {
        eleve_id: contexte.eleve_id,
        objectif_initial: contexte.objectif_initial,
        objectif_courant: contexte.objectif_initial,
        template_id,
        question,
        indice,
        echecs: 0,
        termine: false
      };
      __privateGet(this, _sessions).set(contexte.session_id, session);
      await __privateMethod(this, _MoteurLecon_instances, emettre_fn).call(this, contexte.session_id, "session_demarree", {
        eleve_id: session.eleve_id,
        objectif_id: session.objectif_initial
      });
      const objectif = await this.deps.curriculum.obtenirObjectif(
        session.objectif_initial
      );
      const coup = {
        type: "proposer",
        objectif_id: session.objectif_courant
      };
      const texte = await __privateMethod(this, _MoteurLecon_instances, direTuteur_fn).call(this, contexte.session_id, `Bonjour ! On travaille \xAB ${objectif?.libelle ?? "un nouvel objectif"} \xBB. ${question.enonce}`, coup);
      return __privateMethod(this, _MoteurLecon_instances, etat_fn).call(this, contexte.session_id, session, texte, coup);
    }
    /** Reçoit la réponse de l'élève et fait avancer la boucle d'un tour. */
    async repondre(session_id, texte) {
      const session = __privateMethod(this, _MoteurLecon_instances, session_fn).call(this, session_id);
      if (session.termine) {
        const coup = { type: "clore" };
        return __privateMethod(this, _MoteurLecon_instances, etat_fn).call(this, session_id, session, "La s\xE9ance est termin\xE9e. \xC0 bient\xF4t !", coup);
      }
      await __privateMethod(this, _MoteurLecon_instances, entreeEleve_fn).call(this, session_id, session.eleve_id, texte);
      const verdict = await this.deps.verifier.verifier(session.question, {
        texte
      });
      await __privateMethod(this, _MoteurLecon_instances, enregistrerResultat_fn).call(this, session_id, session, verdict);
      return verdict.correct ? __privateMethod(this, _MoteurLecon_instances, surSucces_fn).call(this, session_id, session) : __privateMethod(this, _MoteurLecon_instances, surEchec_fn).call(this, session_id, session, verdict);
    }
    /**
     * Coup `reviser` (D4 : répétition espacée). Sélectionne un objectif dû pour
     * révision (maîtrise effective retombée sous le seuil après decay) et le
     * propose. Renvoie `null` s'il n'y a rien à réviser.
     */
    async reviser(session_id) {
      const session = __privateMethod(this, _MoteurLecon_instances, session_fn).call(this, session_id);
      const dus = await this.deps.learnerModel.objectifsAReviser(
        session.eleve_id,
        this.deps.horloge.maintenant()
      );
      const cible = dus[0];
      if (!cible) return null;
      session.termine = false;
      await __privateMethod(this, _MoteurLecon_instances, charger_fn).call(this, session, cible.objectif_id);
      const coup = { type: "reviser", objectif_id: cible.objectif_id };
      await __privateMethod(this, _MoteurLecon_instances, emettre_fn).call(this, session_id, "revision_proposee", {
        objectif_id: cible.objectif_id,
        p: cible.probabilite_effective
      });
      const texte = await __privateMethod(this, _MoteurLecon_instances, direTuteur_fn).call(this, session_id, `Petit rappel pour ancrer ce qu\u2019on a vu. ${session.question.enonce}`, coup);
      return __privateMethod(this, _MoteurLecon_instances, etat_fn).call(this, session_id, session, texte, coup);
    }
    /** Clôt explicitement la session (coup `clore`). */
    async clore(session_id) {
      const session = __privateMethod(this, _MoteurLecon_instances, session_fn).call(this, session_id);
      session.termine = true;
      await __privateMethod(this, _MoteurLecon_instances, emettre_fn).call(this, session_id, "session_close", {
        objectif_id: session.objectif_courant
      });
    }
  };
  _sessions = new WeakMap();
  _MoteurLecon_instances = new WeakSet();
  surSucces_fn = async function(session_id, session) {
    session.echecs = 0;
    if (session.objectif_courant !== session.objectif_initial) {
      await __privateMethod(this, _MoteurLecon_instances, charger_fn).call(this, session, session.objectif_initial);
      const coup2 = {
        type: "proposer",
        objectif_id: session.objectif_courant
      };
      const texte2 = await __privateMethod(this, _MoteurLecon_instances, direTuteur_fn).call(this, session_id, `Parfait, le pr\xE9requis est acquis. Revenons \xE0 l\u2019exercice de d\xE9part. ${session.question.enonce}`, coup2);
      return __privateMethod(this, _MoteurLecon_instances, etat_fn).call(this, session_id, session, texte2, coup2, expressionVerdict(true));
    }
    const maitrise = await this.deps.learnerModel.niveauMaitrise(
      session.eleve_id,
      session.objectif_initial,
      this.deps.horloge.maintenant()
    );
    if (maitrise.probabilite_effective >= this.deps.pedagogie.seuil_maitrise) {
      session.termine = true;
      await __privateMethod(this, _MoteurLecon_instances, emettre_fn).call(this, session_id, "objectif_maitrise", {
        objectif_id: session.objectif_initial,
        p: maitrise.probabilite_effective
      });
      const coup2 = { type: "clore" };
      const texte2 = await __privateMethod(this, _MoteurLecon_instances, direTuteur_fn).call(this, session_id, "Bravo, c\u2019est juste \u2014 et tu ma\xEEtrises maintenant cet objectif. Excellente s\xE9ance !", coup2);
      return __privateMethod(this, _MoteurLecon_instances, etat_fn).call(this, session_id, session, texte2, coup2, expressionVerdict(true));
    }
    await __privateMethod(this, _MoteurLecon_instances, charger_fn).call(this, session, session.objectif_initial);
    const coup = {
      type: "proposer",
      objectif_id: session.objectif_courant
    };
    const texte = await __privateMethod(this, _MoteurLecon_instances, direTuteur_fn).call(this, session_id, `Bien jou\xE9, c\u2019est correct ! On continue pour consolider. ${session.question.enonce}`, coup);
    return __privateMethod(this, _MoteurLecon_instances, etat_fn).call(this, session_id, session, texte, coup, expressionVerdict(true));
  };
  surEchec_fn = async function(session_id, session, verdict) {
    session.echecs += 1;
    if (session.echecs >= this.deps.pedagogie.seuil_blocage) {
      return __privateMethod(this, _MoteurLecon_instances, appliquerLevier_fn).call(this, session_id, session);
    }
    const aide = politiqueEvaluation(__privateMethod(this, _MoteurLecon_instances, typeEval_fn).call(this)).aide ? await __privateMethod(this, _MoteurLecon_instances, aideRemediation_fn).call(this, verdict, session.indice) : "";
    const coup = {
      type: "proposer",
      objectif_id: session.objectif_courant
    };
    const texte = await __privateMethod(this, _MoteurLecon_instances, direTuteur_fn).call(this, session_id, `Pas tout \xE0 fait, ce n\u2019est pas la bonne r\xE9ponse.${aide} R\xE9essaie : ${session.question.enonce}`, coup);
    return __privateMethod(this, _MoteurLecon_instances, etat_fn).call(this, session_id, session, texte, coup, expressionVerdict(false, session.echecs - 1));
  };
  aideRemediation_fn = async function(verdict, indice) {
    if (verdict.erreur_type_id && this.deps.catalogueErreurs) {
      const erreur = await this.deps.catalogueErreurs.obtenir(
        verdict.erreur_type_id
      );
      if (erreur) return ` ${erreur.remediation}`;
    }
    return indice ? ` Indice : ${indice}` : "";
  };
  appliquerLevier_fn = async function(session_id, session) {
    const prereqs = await this.deps.curriculum.prerequisDirects(
      session.objectif_courant
    );
    const levier = __privateMethod(this, _MoteurLecon_instances, choisirLevier_fn).call(this, prereqs.length > 0);
    session.echecs = 0;
    switch (levier) {
      case "simplifier": {
        const prereq = prereqs[0];
        await __privateMethod(this, _MoteurLecon_instances, charger_fn).call(this, session, prereq.id);
        const coup = {
          type: "simplifier",
          vers_prerequis: prereq.id
        };
        const texte = await __privateMethod(this, _MoteurLecon_instances, direTuteur_fn).call(this, session_id, `Reprenons une \xE9tape avant pour bien poser les bases. ${session.question.enonce}`, coup);
        return __privateMethod(this, _MoteurLecon_instances, etat_fn).call(this, session_id, session, texte, coup, "concerned");
      }
      case "changer_de_modalite": {
        const modalite = __privateMethod(this, _MoteurLecon_instances, autreModalite_fn).call(this, session.question.modalite);
        const coup = { type: "changer_de_modalite", modalite };
        const texte = await __privateMethod(this, _MoteurLecon_instances, direTuteur_fn).call(this, session_id, `Essayons autrement (${modalite}). ${session.question.enonce}`, coup);
        return __privateMethod(this, _MoteurLecon_instances, etat_fn).call(this, session_id, session, texte, coup, "concerned");
      }
      case "reformuler":
      default: {
        const coup = { type: "reformuler" };
        const texte = await __privateMethod(this, _MoteurLecon_instances, direTuteur_fn).call(this, session_id, `Je reformule. ${session.question.enonce}`, coup);
        return __privateMethod(this, _MoteurLecon_instances, etat_fn).call(this, session_id, session, texte, coup, "concerned");
      }
    }
  };
  enregistrerResultat_fn = async function(session_id, session, verdict) {
    const t = this.deps.horloge.maintenant();
    const tentative = {
      tenant_id: this.deps.tenant_id,
      id: nouvelId(),
      eleve_id: session.eleve_id,
      objectif_id: session.objectif_courant,
      template_id: session.template_id,
      type_evaluation: __privateMethod(this, _MoteurLecon_instances, typeEval_fn).call(this),
      verdict,
      horodatage: t,
      cree_le: t,
      modifie_le: t
    };
    this.deps.magasin.ajouterTentative(tentative);
    await this.deps.learnerModel.enregistrerTentative(tentative);
    await __privateMethod(this, _MoteurLecon_instances, emettre_fn).call(this, session_id, "tentative_enregistree", {
      objectif_id: session.objectif_courant,
      correct: verdict.correct
    });
  };
  proposer_fn = async function(objectif_id) {
    const templates = await this.deps.curriculum.templatesPourObjectif(objectif_id);
    const tmpl = templates[0];
    if (!tmpl) {
      throw new Error(`Aucun template d\u2019exercice pour l\u2019objectif ${objectif_id}.`);
    }
    const etape = tmpl.etapes[0];
    if (!etape) {
      throw new Error(`Template ${tmpl.id} sans \xE9tape.`);
    }
    return { template_id: tmpl.id, question: etape.question, indice: etape.indice };
  };
  charger_fn = async function(session, cible) {
    const { template_id, question, indice } = await __privateMethod(this, _MoteurLecon_instances, proposer_fn).call(this, cible);
    session.objectif_courant = cible;
    session.template_id = template_id;
    session.question = question;
    session.indice = indice;
  };
  entreeEleve_fn = async function(session_id, eleve_id, texte) {
    const res = await this.deps.safety.filtrer(texte, "eleve_entree", {
      eleve_id,
      session_id
    });
    if (res.alerte) {
      this.deps.magasin.ajouterAlerte(res.alerte);
      await __privateMethod(this, _MoteurLecon_instances, emettre_fn).call(this, session_id, "safety_alert", {
        eleve_id,
        categorie: res.alerte.categorie,
        severite: res.alerte.severite
      });
    }
    this.deps.magasin.ajouterTurn({
      id: nouvelId(),
      session_id,
      locuteur: "eleve",
      texte,
      horodatage: this.deps.horloge.maintenant()
    });
  };
  direTuteur_fn = async function(session_id, texteBrut, coup) {
    const res = await this.deps.safety.filtrer(texteBrut, "llm_sortie", {
      eleve_id: __privateMethod(this, _MoteurLecon_instances, session_fn).call(this, session_id).eleve_id,
      session_id
    });
    const texte = res.decision === "reecrire" && res.texte_sur ? res.texte_sur : texteBrut;
    this.deps.magasin.ajouterTurn({
      id: nouvelId(),
      session_id,
      locuteur: "tuteur",
      texte,
      coup,
      horodatage: this.deps.horloge.maintenant()
    });
    return texte;
  };
  choisirLevier_fn = function(prereqExiste) {
    for (const l of this.deps.pedagogie.ordre_leviers) {
      if (l === "simplifier" && !prereqExiste) continue;
      return l;
    }
    return "reformuler";
  };
  autreModalite_fn = function(courante) {
    const ordre = ["textuel", "visuel", "interactif"];
    return ordre.find((m) => m !== courante) ?? courante;
  };
  etat_fn = async function(session_id, session, texte_tuteur, coup, expression) {
    const maitrise_cible = await this.deps.learnerModel.niveauMaitrise(
      session.eleve_id,
      session.objectif_initial,
      this.deps.horloge.maintenant()
    );
    const base = {
      session_id,
      objectif_courant: session.objectif_courant,
      texte_tuteur,
      dernier_coup: coup,
      // Hors correction, l'expression découle du coup (le LLM affinera le ton) ;
      // sur une correction, l'appelant l'impose depuis le verdict (A1).
      expression: expression ?? expressionParDefaut(coup),
      maitrise_cible,
      termine: session.termine
    };
    return session.termine ? base : { ...base, question_courante: session.question };
  };
  emettre_fn = async function(session_id, type, payload) {
    await this.deps.magasin.evenements.emettre(
      evenement(
        this.deps.tenant_id,
        type,
        { session_id, ...payload },
        this.deps.horloge.maintenant()
      )
    );
  };
  typeEval_fn = function() {
    return this.deps.type_evaluation ?? "formative";
  };
  session_fn = function(session_id) {
    const s = __privateGet(this, _sessions).get(session_id);
    if (!s) throw new Error(`Session inconnue : ${session_id}.`);
    return s;
  };

  // src/engine/dashboard/dashboard.ts
  function tableauDeBord(magasin2, profils = []) {
    const total = magasin2.tentatives.length;
    const reussies = magasin2.tentatives.filter((t) => t.verdict.correct).length;
    const erreurs_types = {};
    for (const t of magasin2.tentatives) {
      if (t.verdict.correct) continue;
      const e = t.verdict.erreur_type_id;
      if (e) erreurs_types[e] = (erreurs_types[e] ?? 0) + 1;
    }
    const evenements = {};
    for (const e of magasin2.evenements.evenements) {
      evenements[e.type] = (evenements[e.type] ?? 0) + 1;
    }
    const sessions = new Set(magasin2.dialogueTurns.map((d) => d.session_id)).size;
    return {
      tentatives_total: total,
      tentatives_reussies: reussies,
      taux_reussite: total > 0 ? Math.round(reussies / total * 1e3) / 1e3 : 0,
      sessions,
      tours_dialogue: magasin2.dialogueTurns.length,
      alertes: magasin2.alertes.length,
      alertes_critiques: magasin2.alertes.filter((a) => a.severite === "critique").length,
      erreurs_types,
      evenements,
      profils
    };
  }

  // web/src/engine-browser.ts
  var PEDAGOGIE = {
    seuil_blocage: 2,
    ordre_leviers: ["simplifier", "reformuler", "changer_de_modalite"],
    modalite_par_defaut: "textuel",
    seuil_maitrise: 0.8,
    intensite_encouragement: 0.7
  };
  var tenant_id = id("tenant-demo");
  var horloge = new HorlogeManuelle(/* @__PURE__ */ new Date("2026-06-28T09:00:00.000Z"));
  var curriculum = curriculumPhysique(tenant_id, horloge);
  var learnerModel = new HeuristicLearnerModel(tenant_id, curriculum, horloge);
  var magasin = new MagasinMemoire();
  var moteur = new MoteurLecon({
    tenant_id,
    curriculum,
    verifier: new VerifierStandard(),
    learnerModel,
    safety: new MinimalSafetyFilter(tenant_id, horloge),
    magasin,
    horloge,
    pedagogie: PEDAGOGIE,
    catalogueErreurs: catalogueErreursPhysique(tenant_id, horloge)
  });
  async function creerSession(objectifId) {
    const session_id = nouvelId();
    const contexte = {
      session_id,
      eleve_id: id("eleve-demo"),
      persona_id: id("persona-lea"),
      objectif_initial: objectifId ? id(objectifId) : OBJ_VITESSE
    };
    const etat = await moteur.demarrer(contexte);
    return { session_id, etat };
  }
  async function repondre(session_id, texte) {
    horloge.avancer(3e4);
    const etat = await moteur.repondre(id(session_id), texte);
    return { etat };
  }
  function dashboard() {
    return tableauDeBord(magasin);
  }
  var amorce = false;
  async function amorcerDemo() {
    if (amorce) return;
    amorce = true;
    const session_id = nouvelId();
    const contexte = {
      session_id,
      eleve_id: id("eleve-demo"),
      persona_id: id("persona-lea"),
      objectif_initial: OBJ_VITESSE
    };
    let etat = await moteur.demarrer(contexte);
    for (const t of ["450", "450", "3", "50", "50", "50", "50"]) {
      if (etat.termine) break;
      horloge.avancer(3e4);
      etat = await moteur.repondre(session_id, t);
    }
  }
  window.LeaEngine = { creerSession, repondre, dashboard, amorcerDemo };
})();
