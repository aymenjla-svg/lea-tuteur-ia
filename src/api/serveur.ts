/**
 * API HTTP du moteur (Phase 3+) — `node:http`, sans dépendance.
 *
 * Expose la boucle de leçon en JSON pour un futur frontend : démarrer une
 * session, répondre, lire le tableau de bord. La présence (avatar/voix) viendra
 * côté client ; ici on sert le CADRE déterministe.
 *
 * Endpoints :
 *   GET  /health                       → { ok }
 *   POST /sessions                     → { session_id, etat }
 *   POST /sessions/:id/repondre        → { etat }
 *   GET  /dashboard                    → IndicateursDashboard
 *
 * Single-tenant ici (le tenant serait résolu par l'auth en production). Toute
 * la persistance reste tenant-scopée (§13).
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  ContexteSession,
  EleveId,
  ObjectifId,
  ParametresPedagogie,
  PersonaId,
  SessionId,
  TenantId,
} from '../contracts/index.js';
import type { ActionPedagogique } from '../engine/index.js';
import {
  catalogueErreursPhysique,
  curriculumPhysique,
  HeuristicLearnerModel,
  type Horloge,
  horlogeSysteme,
  id,
  MagasinMemoire,
  MinimalSafetyFilter,
  MoteurLecon,
  nouvelId,
  OBJ_VITESSE,
  Planificateur,
  REF_PHYSIQUE,
  tableauDeBord,
  VerifierStandard,
} from '../engine/index.js';

const PEDAGOGIE: ParametresPedagogie = {
  seuil_blocage: 2,
  ordre_leviers: ['simplifier', 'reformuler', 'changer_de_modalite'],
  modalite_par_defaut: 'textuel',
  seuil_maitrise: 0.8,
  intensite_encouragement: 0.7,
};

export interface ConfigServeur {
  readonly tenant_id: TenantId;
  readonly horloge?: Horloge;
  /** Racine des fichiers statiques (front SVG). Défaut : dossier `web/`. */
  readonly racineWeb?: string;
  /** Racine du build 3D (servi sous /3d/). Défaut : `web-3d/dist/`. */
  readonly racineWeb3d?: string;
}

const TYPES_MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

interface CorpsDemarrer {
  readonly eleve_id?: string;
  readonly persona_id?: string;
  readonly objectif_id?: string;
  /** Si `true` et sans `objectif_id` : le Planificateur choisit la cible (DAG). */
  readonly auto?: boolean;
}

function lireJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c: Buffer) => {
      data += c.toString();
      if (data.length > 1_000_000) reject(new Error('corps trop volumineux'));
    });
    req.on('end', () => {
      if (data.trim() === '') return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('JSON invalide'));
      }
    });
    req.on('error', reject);
  });
}

function repondreJson(res: ServerResponse, code: number, data: unknown): void {
  const corps = JSON.stringify(data);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(corps),
  });
  res.end(corps);
}

/** Construit le serveur HTTP du moteur (avec son moteur interne tenant-scopé). */
export function creerServeurApi(config: ConfigServeur): Server {
  const tenant_id = config.tenant_id;
  const horloge = config.horloge ?? horlogeSysteme;
  const racineWeb = resolve(
    config.racineWeb ?? fileURLToPath(new URL('../../web/', import.meta.url)),
  );
  const racineWeb3d = resolve(
    config.racineWeb3d ?? fileURLToPath(new URL('../../web-3d/dist/', import.meta.url)),
  );
  const curriculum = curriculumPhysique(tenant_id, horloge);
  const learnerModel = new HeuristicLearnerModel(tenant_id, curriculum, horloge);
  const planificateur = new Planificateur(
    curriculum,
    learnerModel,
    PEDAGOGIE.seuil_maitrise,
  );
  const magasin = new MagasinMemoire();
  const moteur = new MoteurLecon({
    tenant_id,
    curriculum,
    verifier: new VerifierStandard(),
    learnerModel,
    safety: new MinimalSafetyFilter(tenant_id, horloge),
    magasin,
    horloge,
    pedagogie: PEDAGOGIE,
    catalogueErreurs: catalogueErreursPhysique(tenant_id, horloge),
  });

  return createServer((req, res) => {
    void router(req, res).catch((e: unknown) => {
      repondreJson(res, 500, { erreur: String(e instanceof Error ? e.message : e) });
    });
  });

  async function router(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url ?? '/';
    const methode = req.method ?? 'GET';
    const chemin = url.split('?')[0] ?? '/';

    if (methode === 'GET' && chemin === '/health') {
      return repondreJson(res, 200, { ok: true });
    }

    // Prochaine action pédagogique (DAG) pour un élève.
    const ma = /^\/eleves\/([^/]+)\/prochaine-action$/.exec(chemin);
    if (methode === 'GET' && ma) {
      const eleve_id = id<EleveId>(decodeURIComponent(ma[1] as string));
      const action = await planificateur.prochaineAction(
        eleve_id,
        REF_PHYSIQUE,
        horloge.maintenant(),
      );
      return repondreJson(res, 200, { action });
    }

    if (methode === 'POST' && chemin === '/sessions') {
      const corps = (await lireJson(req)) as CorpsDemarrer;
      const eleve_id = corps.eleve_id ? id<EleveId>(corps.eleve_id) : id<EleveId>('eleve-api');

      // Choix de l'objectif : explicite > planifié (auto) > défaut.
      let objectif_initial: ObjectifId;
      let action: ActionPedagogique | undefined;
      if (corps.objectif_id) {
        objectif_initial = id<ObjectifId>(corps.objectif_id);
      } else if (corps.auto) {
        action = await planificateur.prochaineAction(eleve_id, REF_PHYSIQUE, horloge.maintenant());
        if (action.type === 'rien') {
          return repondreJson(res, 200, { action, message: 'Tout est maîtrisé — rien à travailler.' });
        }
        objectif_initial = action.objectif_id;
      } else {
        objectif_initial = OBJ_VITESSE;
      }

      const session_id = nouvelId<SessionId>();
      const contexte: ContexteSession = {
        session_id,
        eleve_id,
        persona_id: corps.persona_id ? id<PersonaId>(corps.persona_id) : id<PersonaId>('persona-lea'),
        objectif_initial,
      };
      const etat = await moteur.demarrer(contexte);
      return repondreJson(res, 201, { session_id, etat, ...(action ? { action } : {}) });
    }

    const m = /^\/sessions\/([^/]+)\/repondre$/.exec(chemin);
    if (methode === 'POST' && m) {
      const session_id = id<SessionId>(decodeURIComponent(m[1] as string));
      const corps = (await lireJson(req)) as { texte?: string };
      if (typeof corps.texte !== 'string') {
        return repondreJson(res, 400, { erreur: 'champ « texte » requis' });
      }
      try {
        const etat = await moteur.repondre(session_id, corps.texte);
        return repondreJson(res, 200, { etat });
      } catch (e: unknown) {
        return repondreJson(res, 404, {
          erreur: String(e instanceof Error ? e.message : e),
        });
      }
    }

    if (methode === 'GET' && chemin === '/dashboard') {
      return repondreJson(res, 200, tableauDeBord(magasin));
    }

    // Palier 3D (Vite build) servi sous /3d/.
    if (methode === 'GET' && (chemin === '/3d' || chemin.startsWith('/3d/'))) {
      const rel = chemin === '/3d' || chemin === '/3d/' ? 'index.html' : chemin.slice(4);
      return servirDepuis(racineWeb3d, res, rel);
    }

    // Fallback : fichiers statiques du front SVG/texte (R6).
    if (methode === 'GET') {
      const relatif = chemin === '/' ? 'index.html' : chemin.replace(/^\/+/, '');
      return servirDepuis(racineWeb, res, relatif);
    }

    repondreJson(res, 404, { erreur: 'route inconnue' });
  }

  function servirDepuis(racine: string, res: ServerResponse, relatif: string): void {
    const cible = resolve(join(racine, normalize(relatif)));
    // Anti-traversal : la cible doit rester sous la racine servie.
    if (cible !== racine && !cible.startsWith(racine + sep)) {
      return repondreJson(res, 403, { erreur: 'accès refusé' });
    }
    let contenu: Buffer;
    try {
      contenu = readFileSync(cible);
    } catch {
      return repondreJson(res, 404, { erreur: 'fichier introuvable' });
    }
    res.writeHead(200, {
      'content-type': TYPES_MIME[extname(cible)] ?? 'application/octet-stream',
      'content-length': contenu.byteLength,
      'cache-control': 'no-store',
    });
    res.end(contenu);
  }
}
