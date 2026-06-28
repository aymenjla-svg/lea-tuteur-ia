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

import type {
  ContexteSession,
  EleveId,
  ObjectifId,
  ParametresPedagogie,
  PersonaId,
  SessionId,
  TenantId,
} from '../contracts/index.js';
import {
  catalogueErreursDemo,
  curriculumDemo,
  HeuristicLearnerModel,
  type Horloge,
  horlogeSysteme,
  id,
  MagasinMemoire,
  MinimalSafetyFilter,
  MoteurLecon,
  nouvelId,
  OBJ_ADDITION,
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
}

interface CorpsDemarrer {
  readonly eleve_id?: string;
  readonly persona_id?: string;
  readonly objectif_id?: string;
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
  const curriculum = curriculumDemo(tenant_id, horloge);
  const learnerModel = new HeuristicLearnerModel(tenant_id, curriculum, horloge);
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
    catalogueErreurs: catalogueErreursDemo(tenant_id, horloge),
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

    if (methode === 'POST' && chemin === '/sessions') {
      const corps = (await lireJson(req)) as CorpsDemarrer;
      const session_id = nouvelId<SessionId>();
      const contexte: ContexteSession = {
        session_id,
        eleve_id: (corps.eleve_id ? id<EleveId>(corps.eleve_id) : id<EleveId>('eleve-api')),
        persona_id: (corps.persona_id ? id<PersonaId>(corps.persona_id) : id<PersonaId>('persona-lea')),
        objectif_initial: corps.objectif_id ? id<ObjectifId>(corps.objectif_id) : OBJ_ADDITION,
      };
      const etat = await moteur.demarrer(contexte);
      return repondreJson(res, 201, { session_id, etat });
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

    repondreJson(res, 404, { erreur: 'route inconnue' });
  }
}
