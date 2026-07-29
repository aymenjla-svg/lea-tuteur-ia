/**
 * Évaluateur d'expressions arithmétiques — sans `eval`, sûr.
 *
 * Sert à la vérification SYMBOLIQUE : plutôt qu'un CAS complet, on teste
 * l'équivalence de deux expressions par ÉCHANTILLONNAGE NUMÉRIQUE — on
 * substitue des valeurs (déterministes) aux variables et on compare les
 * résultats. Robuste pour les égalités algébriques usuelles (ex. 2·(x+1) ≡
 * 2x+2) sans dépendance externe.
 *
 * Grammaire : nombres, variables (lettres), + − × ÷ ^, parenthèses, moins
 * unaire. Multiplication implicite tolérée (`2x`, `2(x+1)`).
 */

import { rngDepuisGraine } from '../core.js';

type Token =
  | { readonly t: 'num'; readonly v: number }
  | { readonly t: 'var'; readonly v: string }
  | { readonly t: 'op'; readonly v: string }
  | { readonly t: 'lp' }
  | { readonly t: 'rp' };

const PRECEDENCE: Record<string, number> = {
  'u-': 5,
  '^': 4,
  '*': 3,
  '/': 3,
  '+': 2,
  '-': 2,
};
const DROITE = new Set(['^', 'u-']);

function tokeniser(src: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.');
  const estValeur = (tok: Token | undefined): boolean =>
    tok !== undefined && (tok.t === 'num' || tok.t === 'var' || tok.t === 'rp');

  while (i < s.length) {
    const ch = s[i] ?? '';
    if (ch === ' ') {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s[j] ?? '')) j++;
      const v = Number(s.slice(i, j));
      if (!Number.isFinite(v)) return null;
      if (estValeur(tokens[tokens.length - 1])) tokens.push({ t: 'op', v: '*' });
      tokens.push({ t: 'num', v });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      if (estValeur(tokens[tokens.length - 1])) tokens.push({ t: 'op', v: '*' });
      tokens.push({ t: 'var', v: ch });
      i++;
      continue;
    }
    if ('+-*/^'.includes(ch)) {
      tokens.push({ t: 'op', v: ch });
      i++;
      continue;
    }
    if (ch === '(') {
      if (estValeur(tokens[tokens.length - 1])) tokens.push({ t: 'op', v: '*' });
      tokens.push({ t: 'lp' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ t: 'rp' });
      i++;
      continue;
    }
    return null; // caractère inconnu
  }
  return tokens;
}

/** Convertit en notation polonaise inverse (shunting-yard). */
function versRPN(tokens: Token[]): Token[] | null {
  const sortie: Token[] = [];
  const pile: Token[] = [];
  let precedent: Token | undefined;

  for (const tok of tokens) {
    if (tok.t === 'num' || tok.t === 'var') {
      sortie.push(tok);
    } else if (tok.t === 'op') {
      // Moins unaire ?
      const unaire =
        tok.v === '-' &&
        (precedent === undefined ||
          precedent.t === 'op' ||
          precedent.t === 'lp');
      const op: Token = unaire ? { t: 'op', v: 'u-' } : tok;
      while (pile.length > 0) {
        const haut = pile[pile.length - 1];
        if (!haut || haut.t !== 'op') break;
        const pHaut = PRECEDENCE[haut.v] ?? 0;
        const pOp = PRECEDENCE[op.v] ?? 0;
        if (pHaut > pOp || (pHaut === pOp && !DROITE.has(op.v))) {
          sortie.push(pile.pop() as Token);
        } else break;
      }
      pile.push(op);
    } else if (tok.t === 'lp') {
      pile.push(tok);
    } else {
      // rp : dépile jusqu'à lp
      let trouve = false;
      while (pile.length > 0) {
        const haut = pile.pop() as Token;
        if (haut.t === 'lp') {
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
    const haut = pile.pop() as Token;
    if (haut.t === 'lp' || haut.t === 'rp') return null;
    sortie.push(haut);
  }
  return sortie;
}

function evaluerRPN(rpn: Token[], env: Record<string, number>): number {
  const pile: number[] = [];
  for (const tok of rpn) {
    if (tok.t === 'num') {
      pile.push(tok.v);
    } else if (tok.t === 'var') {
      pile.push(env[tok.v] ?? Number.NaN);
    } else if (tok.t === 'op') {
      if (tok.v === 'u-') {
        const a = pile.pop();
        if (a === undefined) return Number.NaN;
        pile.push(-a);
        continue;
      }
      const b = pile.pop();
      const a = pile.pop();
      if (a === undefined || b === undefined) return Number.NaN;
      switch (tok.v) {
        case '+':
          pile.push(a + b);
          break;
        case '-':
          pile.push(a - b);
          break;
        case '*':
          pile.push(a * b);
          break;
        case '/':
          pile.push(a / b);
          break;
        case '^':
          pile.push(a ** b);
          break;
        default:
          return Number.NaN;
      }
    }
  }
  return pile.length === 1 ? (pile[0] as number) : Number.NaN;
}

/** Compile une expression en RPN, ou `null` si syntaxe invalide. */
export function compiler(expr: string): Token[] | null {
  const tokens = tokeniser(expr);
  if (!tokens || tokens.length === 0) return null;
  return versRPN(tokens);
}

/** Liste des variables (lettres) présentes dans une expression. */
function variablesDe(rpn: Token[]): string[] {
  const set = new Set<string>();
  for (const t of rpn) if (t.t === 'var') set.add(t.v);
  return [...set];
}

/**
 * Teste l'équivalence de deux expressions par échantillonnage déterministe.
 * Conservateur : exige plusieurs points valides concordants ; en cas de doute,
 * renvoie `false` (on ne valide jamais du faux — §1.1).
 */
export function equivalentes(
  attendu: string,
  candidat: string,
  variables: readonly string[] = [],
): boolean {
  const a = compiler(attendu);
  const b = compiler(candidat);
  if (!a || !b) return false;

  const vars = new Set<string>([
    ...variablesDe(a),
    ...variablesDe(b),
    ...variables,
  ]);
  const noms = [...vars];
  const rng = rngDepuisGraine(0x5eed);

  let valides = 0;
  const requis = 8;
  for (let essai = 0; essai < 40 && valides < requis; essai++) {
    const env: Record<string, number> = {};
    for (const n of noms) env[n] = 1 + rng() * 4; // [1,5] : évite 0
    const va = evaluerRPN(a, env);
    const vb = evaluerRPN(b, env);
    if (!Number.isFinite(va) || !Number.isFinite(vb)) continue;
    valides++;
    const echelle = Math.max(1, Math.abs(va), Math.abs(vb));
    if (Math.abs(va - vb) > 1e-9 * echelle) return false;
  }
  return valides >= requis;
}
