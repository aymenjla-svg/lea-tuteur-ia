// =============================================================================
// Léa — fonction Edge « tuteur » : Q&R ancrée au programme (phase LLM).
//
// L'élève « lève la main » et pose une question libre. Le LLM peut aller loin
// (approfondir, relier les notions, analogies, dessiner au tableau) MAIS reste
// borné au programme donné en amont (invariant §1.2 : ne jamais sortir du
// curriculum). Le dialogue passe par un filet de sécurité (invariant §1.6) :
//   • détresse / auto-agression / violence / contenu inapproprié → on NE
//     sollicite PAS le LLM, on répond avec bienveillance et on demande
//     l'escalade vers un adulte (SafetyAlert, escalade_requise) ;
//   • sortie du LLM re-vérifiée (anti-humiliation §1.3).
//
// Provider CONFIGURABLE (§1.7 : mineur ⇒ provider conforme + no-train) :
//   LLM_PROVIDER = 'anthropic' | 'openai'   (défaut 'anthropic')
//   ANTHROPIC_API_KEY / OPENAI_API_KEY      (selon le provider)
//   LLM_MODEL                               (optionnel, défaut par provider)
//
// Déploiement : voir supabase/functions/tuteur/README.md
// Ce fichier tourne SANS base de données ; les points d'extension (journal
// events / safety_alerts, RAG pgvector) sont signalés mais non requis.
// =============================================================================

// --- Contrat d'échange --------------------------------------------------------

interface Contexte {
  module?: string;        // ex. « Électricité — loi d'Ohm »
  moduleId?: string;
  notion?: string;        // titre de la scène courante
  relation?: string;      // ex. « U = R × I »
  enonce?: string;        // énoncé de l'exercice en cours (mode exercice)
  points_vus?: string[];  // points clés déjà vus (ancrage)
  en_exercice?: boolean;  // anti-spoiler : ne pas donner la réponse d'un exo
  session_id?: string;    // identité pseudonyme (journal safety_alerts)
  eleve_ref?: string;     // idem
}

interface Requete {
  question: string;
  contexte?: Contexte;
  historique?: { role: 'eleve' | 'lea'; texte: string }[];
}

type CommandeTableau =
  | { type: 'fleche' | 'trait'; d: string; len?: number }
  | { type: 'cercle'; x: number; y: number; r?: number }
  | { type: 'ellipse'; x: number; y: number; rx?: number; ry?: number }
  | { type: 'texte'; x: number; y: number; t: string; ancre?: 'start' | 'middle' | 'end' };

interface Reponse {
  reponse: string;
  tableau?: CommandeTableau[];
  dans_programme: boolean;
  alerte?: { categorie: string; severite: string; escalade_requise: boolean };
}

// --- Périmètre programme (borne dure, défense en profondeur) ------------------
// Le LLM peut approfondir librement DANS ces notions ; au-delà, il recadre.
const PROGRAMME = `Programme autorisé (physique, collège cycle 4, d'après le BO) :
1. Mouvement & vitesse — v = d / t ; distance (m, km), durée (s, h), conversions.
2. Poids & masse — P = m × g ; masse (kg, invariante) vs poids (N) ; g Terre ≈ 10, Lune ≈ 1,6.
3. Électricité — loi d'Ohm U = R × I ; tension (V), intensité (A), résistance (Ω) ; sécurité (secteur 230 V).
4. Matière — trois états (solide/liquide/gaz), changements d'état (fusion, vaporisation, solidification, liquéfaction), conservation de la masse, températures de changement d'état, masse volumique ρ = m / V (g/cm³), flotte/coule.
5. Énergie — puissance électrique P = U × I (W) ; énergie E = P × t ; économies d'énergie.
6. Signaux — son (≈ 340 m/s) et lumière (≈ 300 000 km/s), v = d / t ; année-lumière (une distance).
Hors de ce périmètre (ex. réactions chimiques, ions/pH, atomes en détail, biologie, autres matières) : NE PAS traiter, recadrer gentiment vers le cours.`;

// --- Sécurité du dialogue (miroir de SafetyFilter, R5) ------------------------

const MOTS_DETRESSE =
  /\b(suicid|me tuer|me suicider|envie de mourir|plus envie de vivre|en finir|me faire du mal|automutil|scarif|me scarifie|je veux mourir|personne ne m.aime|je suis nul.? a rien)\b/i;
const MOTS_VIOLENCE = /\b(tuer quelqu.un|frapper|me battre|il me frappe|elle me frappe|on me frappe|harc[eè]l)\b/i;
const MOTS_INAPPROPRIE = /\b(sexe|porno|nudes?|drogue|alcool|cannabis)\b/i;

interface Verdict { categorie: string; severite: string; message: string }

/** Filtre d'ENTRÉE : détecte la détresse avant tout appel LLM (§1.6). */
function filtrerEntree(texte: string): Verdict | null {
  if (MOTS_DETRESSE.test(texte)) {
    return {
      categorie: 'detresse',
      severite: 'critique',
      message:
        'Je vois que ce n’est peut-être pas facile en ce moment, et je tiens à toi. ' +
        'Je ne suis qu’une aide pour la physique, alors s’il te plaît parle vite à un ' +
        'adulte de confiance — un parent, un professeur, l’infirmerie. En France, tu peux ' +
        'aussi appeler le 3114 (gratuit, 24h/24) ou le 3020 contre le harcèlement. ' +
        'Tu n’es pas seul·e.',
    };
  }
  if (MOTS_VIOLENCE.test(texte)) {
    return {
      categorie: 'violence',
      severite: 'critique',
      message:
        'Ce que tu décris est important et tu mérites d’être protégé·e. Parles-en vite à un ' +
        'adulte de confiance (parent, professeur, CPE, infirmerie). En France, le 3020 ' +
        '(harcèlement) et le 119 (enfance en danger) sont gratuits et là pour t’aider.',
    };
  }
  if (MOTS_INAPPROPRIE.test(texte)) {
    return {
      categorie: 'contenu_inapproprie',
      severite: 'attention',
      message:
        'Ça, ce n’est pas mon domaine — moi je suis là pour la physique ! Si tu te poses ' +
        'des questions là-dessus, un adulte de confiance saura mieux t’en parler. On revient ' +
        'au cours ?',
    };
  }
  return null;
}

/** Filtre de SORTIE minimal (anti-humiliation §1.3). */
function filtrerSortie(texte: string): string {
  // Le prompt interdit déjà tout propos dégradant ; ce filet retire les rares
  // formulations blessantes si le modèle dérape.
  return texte
    .replace(/\b(t.es|tu es) (nul|bête|stupide|idiot)[a-z]*\b/gi, 'ce point n’est pas encore acquis')
    .replace(/\bc.est (nul|débile|idiot)\b/gi, 'ce n’est pas encore ça');
}

// --- RAG (optionnel) : passages du cours les plus proches de la question ------
// Activé si RAG_ENABLED=1 + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY +
// OPENAI_API_KEY. Sinon on garde l'ancrage fourni par le client (points_vus).
async function ragExtraits(question: string): Promise<string[]> {
  if (Deno.env.get('RAG_ENABLED') !== '1') return [];
  const url = Deno.env.get('SUPABASE_URL');
  const srv = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const okey = Deno.env.get('OPENAI_API_KEY');
  if (!url || !srv || !okey) return [];
  const model = Deno.env.get('EMBED_MODEL') ?? 'text-embedding-3-small';
  const dim = Number(Deno.env.get('EMBED_DIM') ?? '768');
  try {
    // 1) encoder la question (mêmes dimensions que la colonne vector).
    const er = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${okey}` },
      body: JSON.stringify({ model, input: question, dimensions: dim }),
    });
    if (!er.ok) return [];
    const emb = (await er.json()).data?.[0]?.embedding;
    if (!Array.isArray(emb)) return [];
    // 2) kNN via PostgREST (rpc match_embeddings), service-role.
    const rr = await fetch(`${url}/rest/v1/rpc/match_embeddings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: srv, authorization: `Bearer ${srv}` },
      body: JSON.stringify({
        query_embedding: `[${emb.join(',')}]`,
        match_count: 4,
        p_tenant: Deno.env.get('TENANT_ID') ?? null,
      }),
    });
    if (!rr.ok) return [];
    const rows = await rr.json();
    return Array.isArray(rows) ? rows.map((r: any) => String(r.texte)).slice(0, 4) : [];
  } catch {
    return [];
  }
}

// --- Journal (events / safety_alerts, télémétrie J1) — best-effort ------------
// events : ne dépend que du tenant → fiable. safety_alerts : FK vers eleves /
// sessions → seulement si des identités réelles existent (LOG_SAFETY_FK=1).
function pgHeaders(srv: string) {
  return { 'content-type': 'application/json', apikey: srv, authorization: `Bearer ${srv}`, Prefer: 'return=minimal' };
}
async function journalEvent(type: string, payload: Record<string, unknown>): Promise<void> {
  if (Deno.env.get('LOG_ENABLED') !== '1') return;
  const url = Deno.env.get('SUPABASE_URL');
  const srv = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const tenant = Deno.env.get('TENANT_ID');
  if (!url || !srv || !tenant) return;
  try {
    await fetch(`${url}/rest/v1/events`, { method: 'POST', headers: pgHeaders(srv), body: JSON.stringify({ tenant_id: tenant, type, payload }) });
  } catch { /* télémétrie non bloquante */ }
}
async function journalSafety(cat: string, sev: string, extrait: string, ctx: Contexte): Promise<void> {
  // Toujours tracer l'alerte dans events (minimisé §9).
  await journalEvent('safety_alert', { categorie: cat, severite: sev, extrait });
  // Table dédiée uniquement si les identités réelles sont câblées.
  if (Deno.env.get('LOG_SAFETY_FK') !== '1') return;
  const url = Deno.env.get('SUPABASE_URL');
  const srv = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const tenant = Deno.env.get('TENANT_ID');
  if (!url || !srv || !tenant || !ctx.session_id || !ctx.eleve_ref) return;
  try {
    await fetch(`${url}/rest/v1/safety_alerts`, {
      method: 'POST',
      headers: pgHeaders(srv),
      body: JSON.stringify({
        tenant_id: tenant, eleve_id: ctx.eleve_ref, session_id: ctx.session_id,
        categorie: cat, severite: sev, extrait, escalade_requise: true,
      }),
    });
  } catch { /* FK absente : l'alerte reste dans events */ }
}

// --- Système (prompt) ---------------------------------------------------------

function systeme(ctx: Contexte, extraits: string[] = []): string {
  const rag = extraits.length
    ? `\n\nExtraits du cours (source de vérité — appuie-toi dessus en priorité) :\n"""\n${extraits.join('\n---\n')}\n"""`
    : '';
  const ancrage = ctx.points_vus?.length
    ? `\n\nCe que l'élève vient de voir dans « ${ctx.notion ?? ctx.module ?? ''} » :\n- ${ctx.points_vus.join('\n- ')}` +
      (ctx.relation ? `\nRelation en jeu : ${ctx.relation}.` : '')
    : '';
  const spoiler = ctx.en_exercice
    ? `\n\nL’élève est EN EXERCICE${ctx.enonce ? ` sur l’énoncé : « ${ctx.enonce} »` : ''}. Ne donne JAMAIS le résultat numérique final ni la valeur de l’inconnue. Explique la méthode, la notion, l’étape qui bloque (quelle relation, quelle conversion), et invite l’élève à finir le calcul lui-même.`
    : '';
  return `Tu es Léa, une tutrice de physique bienveillante pour un·e élève de collège (cycle 4, 12–15 ans). Tu parles français, tu tutoies, tu es chaleureuse, positive et claire. Tes phrases sont courtes et concrètes, avec des exemples de la vie quotidienne.

${PROGRAMME}

Règles :
- Tu peux aller loin : approfondir, relier les notions entre elles, donner des analogies et des exemples réels — MAIS uniquement dans le programme ci-dessus. Si la question sort du programme, dis-le gentiment et ramène au cours (mets alors "dans_programme": false).
- Ne jamais valider une idée fausse ; corrige avec douceur.
- Ne jamais humilier ni juger. Encourage toujours.
- Sécurité : jamais d’expérience dangereuse (secteur 230 V, produits chimiques, feu…). Rappelle qu’on n’expérimente qu’avec des piles et sous la supervision d’un adulte.
- Reste bref : 2 à 5 phrases. Pas de pavé.${rag}${ancrage}${spoiler}

Tu PEUX dessiner au tableau pour illustrer, en renvoyant des commandes de dessin. Le tableau est un repère SVG de 320 (largeur) × 200 (hauteur), origine en haut à gauche. Primitives autorisées :
- {"type":"fleche","d":"M x1 y1 L x2 y2","len":<longueur approx>}
- {"type":"trait","d":"M x1 y1 L x2 y2","len":<longueur>}
- {"type":"cercle","x":<cx>,"y":<cy>,"r":<rayon>}
- {"type":"ellipse","x":<cx>,"y":<cy>,"rx":<rx>,"ry":<ry>}
- {"type":"texte","x":<x>,"y":<y>,"t":"<texte court>","ancre":"middle"}
Maximum 4 commandes, sobres, seulement si ça aide vraiment. Sinon, "tableau": [].

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, de la forme :
{"reponse":"<ta réponse à l'élève>","tableau":[...],"dans_programme":true}`;
}

// --- Appel provider (configurable) -------------------------------------------

async function appelLLM(sys: string, user: string): Promise<string> {
  const provider = (Deno.env.get('LLM_PROVIDER') ?? 'anthropic').toLowerCase();
  if (provider === 'openai') {
    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) throw new Error('OPENAI_API_KEY manquant');
    const model = Deno.env.get('LLM_MODEL') ?? 'gpt-4o-mini';
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
    const j = await r.json();
    return j.choices?.[0]?.message?.content ?? '';
  }
  // Anthropic (défaut). L'API n'entraîne pas sur les données (conforme mineur).
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY manquant');
  const model = Deno.env.get('LLM_MODEL') ?? 'claude-3-5-haiku-latest';
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 900,
      temperature: 0.4,
      system: sys,
      // Préfixe '{' pour forcer une sortie JSON.
      messages: [{ role: 'user', content: user }, { role: 'assistant', content: '{' }],
    }),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return '{' + (j.content?.[0]?.text ?? '');
}

// --- Assainissement des commandes tableau ------------------------------------

function nombre(v: unknown, min: number, max: number, def: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function nettoyerTableau(cmds: unknown): CommandeTableau[] {
  if (!Array.isArray(cmds)) return [];
  const out: CommandeTableau[] = [];
  for (const c of cmds.slice(0, 4)) {
    if (!c || typeof c !== 'object') continue;
    const t = (c as any).type;
    if (t === 'fleche' || t === 'trait') {
      const d = String((c as any).d ?? '');
      if (/^[MLmlhvHV0-9 .,-]+$/.test(d) && d.length < 120) {
        out.push({ type: t, d, len: nombre((c as any).len, 1, 600, 200) });
      }
    } else if (t === 'cercle') {
      out.push({ type: 'cercle', x: nombre((c as any).x, 0, 320, 160), y: nombre((c as any).y, 0, 200, 100), r: nombre((c as any).r, 2, 90, 12) });
    } else if (t === 'ellipse') {
      out.push({ type: 'ellipse', x: nombre((c as any).x, 0, 320, 160), y: nombre((c as any).y, 0, 200, 100), rx: nombre((c as any).rx, 2, 150, 20), ry: nombre((c as any).ry, 2, 90, 14) });
    } else if (t === 'texte') {
      const txt = String((c as any).t ?? '').slice(0, 40);
      const ancre = ['start', 'middle', 'end'].includes((c as any).ancre) ? (c as any).ancre : 'middle';
      out.push({ type: 'texte', x: nombre((c as any).x, 0, 320, 160), y: nombre((c as any).y, 0, 200, 100), t: txt, ancre });
    }
  }
  return out;
}

// --- Handler HTTP -------------------------------------------------------------

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

function json(body: Reponse, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ reponse: 'Méthode non supportée.', dans_programme: false }, 405);

  let body: Requete;
  try {
    body = await req.json();
  } catch {
    return json({ reponse: 'Requête invalide.', dans_programme: false }, 400);
  }
  const question = String(body.question ?? '').trim();
  if (!question) return json({ reponse: 'Pose-moi ta question 🙂', dans_programme: true });
  const ctx = body.contexte ?? {};

  // 1) Filet de sécurité en entrée (détresse → pas d'appel LLM, escalade).
  const risque = filtrerEntree(question);
  if (risque) {
    await journalSafety(risque.categorie, risque.severite, question.slice(0, 120), ctx);
    return json({
      reponse: risque.message,
      dans_programme: true,
      alerte: { categorie: risque.categorie, severite: risque.severite, escalade_requise: true },
    });
  }

  // 2) Appel LLM borné au programme (avec ancrage RAG si activé).
  let brut: string;
  try {
    const extraits = await ragExtraits(question);
    brut = await appelLLM(systeme(ctx, extraits), question);
  } catch (e) {
    return json(
      {
        reponse:
          'Je n’arrive pas à réfléchir là tout de suite. Reprenons le cours ensemble : ' +
          (ctx.points_vus?.[0] ?? 'relis le dernier point, puis réessaie.'),
        dans_programme: true,
      },
      200,
    );
  }

  // 3) Parse + assainissement.
  let data: any = {};
  try {
    const debut = brut.indexOf('{');
    const fin = brut.lastIndexOf('}');
    data = JSON.parse(brut.slice(debut, fin + 1));
  } catch {
    data = { reponse: brut.replace(/[{}]/g, '').trim().slice(0, 600), dans_programme: true };
  }
  const reponse = filtrerSortie(String(data.reponse ?? '').slice(0, 1200)) ||
    'Bonne question ! Reprenons ce point du cours ensemble.';
  // Télémétrie minimisée : métadonnées uniquement (pas le texte de l'élève).
  await journalEvent('tuteur_qr', {
    moduleId: ctx.moduleId ?? null,
    en_exercice: !!ctx.en_exercice,
    dans_programme: data.dans_programme !== false,
    q_len: question.length,
  });
  return json({
    reponse,
    tableau: nettoyerTableau(data.tableau),
    dans_programme: data.dans_programme !== false,
  });
});
