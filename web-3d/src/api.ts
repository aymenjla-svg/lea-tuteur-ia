// Client de l'API du moteur (même origine en prod, proxy en dev).

export interface EtatLecon {
  readonly texte_tuteur: string;
  readonly dernier_coup?: { readonly type: string };
  readonly maitrise_cible?: { readonly probabilite_effective: number };
  readonly termine: boolean;
}

async function api<T>(chemin: string, methode = 'GET', corps?: unknown): Promise<T> {
  const res = await fetch(chemin, {
    method: methode,
    headers: corps ? { 'content-type': 'application/json' } : undefined,
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error((data['erreur'] as string) ?? `HTTP ${res.status}`);
  return data as T;
}

export function demarrerSession(): Promise<{ session_id: string; etat: EtatLecon }> {
  return api('/sessions', 'POST', {});
}

export function repondre(
  session_id: string,
  texte: string,
): Promise<{ etat: EtatLecon }> {
  return api(`/sessions/${session_id}/repondre`, 'POST', { texte });
}
