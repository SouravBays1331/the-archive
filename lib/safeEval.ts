import { z } from 'zod';

// Sandboxed arithmetic evaluator for ROI ledger formulas (spec §15: never eval()).
// Supports: numbers, identifiers from a fixed scope, + - * / ( ), unary minus,
// and 'name = expr' statements separated by ';'.

type Tok = { t: 'num' | 'id' | 'op'; v: string | number };

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j += 1;
      const v = Number(src.slice(i, j));
      if (!Number.isFinite(v)) throw new Error('bad number');
      toks.push({ t: 'num', v });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j += 1;
      toks.push({ t: 'id', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/()'.includes(c)) {
      toks.push({ t: 'op', v: c });
      i += 1;
      continue;
    }
    throw new Error(`illegal character: ${c}`);
  }
  return toks;
}

function evaluate(toks: Tok[], scope: Record<string, number>): number {
  let pos = 0;
  const peek = () => toks[pos];
  const eat = () => toks[pos++];

  function factor(): number {
    const tk = peek();
    if (!tk) throw new Error('unexpected end');
    if (tk.t === 'op' && tk.v === '-') {
      eat();
      return -factor();
    }
    if (tk.t === 'op' && tk.v === '+') {
      eat();
      return factor();
    }
    if (tk.t === 'num') {
      eat();
      return tk.v as number;
    }
    if (tk.t === 'id') {
      eat();
      const name = tk.v as string;
      if (!(name in scope)) throw new Error(`unknown identifier: ${name}`);
      return scope[name];
    }
    if (tk.t === 'op' && tk.v === '(') {
      eat();
      const v = expr();
      const close = eat();
      if (!close || close.t !== 'op' || close.v !== ')') throw new Error('missing )');
      return v;
    }
    throw new Error('unexpected token');
  }

  function term(): number {
    let v = factor();
    for (;;) {
      const tk = peek();
      if (tk && tk.t === 'op' && (tk.v === '*' || tk.v === '/')) {
        eat();
        const r = factor();
        v = tk.v === '*' ? v * r : v / r;
      } else break;
    }
    return v;
  }

  function expr(): number {
    let v = term();
    for (;;) {
      const tk = peek();
      if (tk && tk.t === 'op' && (tk.v === '+' || tk.v === '-')) {
        eat();
        const r = term();
        v = tk.v === '+' ? v + r : v - r;
      } else break;
    }
    return v;
  }

  const v = expr();
  if (pos !== toks.length) throw new Error('trailing tokens');
  return v;
}

export function runFormula(formula: string, inputs: Record<string, number>): Record<string, number> {
  const scope: Record<string, number> = { ...inputs };
  const results: Record<string, number> = {};
  for (const stmt of formula.split(';')) {
    const s = stmt.trim();
    if (!s) continue;
    const assign = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([\s\S]+)$/.exec(s);
    if (assign) {
      const value = evaluate(tokenize(assign[2]), scope);
      if (!Number.isFinite(value)) throw new Error('non-finite result');
      scope[assign[1]] = value;
      results[assign[1]] = value;
    } else {
      const value = evaluate(tokenize(s), scope);
      if (!Number.isFinite(value)) throw new Error('non-finite result');
      results._ = value;
    }
  }
  return results;
}
