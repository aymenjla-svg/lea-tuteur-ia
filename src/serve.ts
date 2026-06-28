/**
 * Démarre l'API HTTP du moteur.  npm run serve  (PORT par défaut : 3000)
 */

import type { TenantId } from './contracts/index.js';
import { id } from './engine/index.js';
import { creerServeurApi } from './api/serveur.js';

const port = Number(process.env.PORT ?? 3000);
const serveur = creerServeurApi({ tenant_id: id<TenantId>('tenant-local') });

serveur.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Léa API à l’écoute sur http://127.0.0.1:${port}`);
  console.log('  POST /sessions · POST /sessions/:id/repondre · GET /dashboard · GET /health');
});
