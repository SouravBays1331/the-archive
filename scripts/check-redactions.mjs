#!/usr/bin/env node
// Redaction guard (spec §14): fails the build if any deny-listed client term appears
// in the content folder or in the built output.
//   node scripts/check-redactions.mjs --content   (prebuild)
//   node scripts/check-redactions.mjs --build     (postbuild, scans .next)
//
// The real deny-list lives in `redactions.local.txt` (gitignored — it names the
// clients, so it must never be published). A generic fallback list ships in-repo.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FALLBACK_DENY_LIST = [
  // Add client-identifying terms to redactions.local.txt (gitignored), not here.
];

function loadDenyList() {
  const local = path.join(root, 'redactions.local.txt');
  if (fs.existsSync(local)) {
    const terms = fs
      .readFileSync(local, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));
    return terms;
  }
  return FALLBACK_DENY_LIST;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const mode = process.argv[2] ?? '--content';
const targets =
  mode === '--build'
    ? [path.join(root, '.next', 'server'), path.join(root, '.next', 'static')]
    : [path.join(root, 'content')];

const denyList = loadDenyList();
if (denyList.length === 0 && mode === '--content') {
  console.log('[redaction] note: no deny-list found (redactions.local.txt missing) — nothing to enforce.');
}

let failures = 0;
for (const target of targets) {
  if (!fs.existsSync(target)) continue;
  for (const file of walk(target)) {
    const rel = path.relative(root, file);
    const ext = path.extname(file);
    if (!['.js', '.html', '.json', '.txt', '.rsc', '.css'].includes(ext)) continue;
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const term of denyList) {
      if (text.includes(term)) {
        console.error(`[redaction] DENY-LIST TERM FOUND in ${rel} — remove or abstract it.`);
        failures += 1;
      }
    }
  }
}

if (failures > 0) {
  console.error(`[redaction] ${failures} violation(s).`);
  process.exit(1);
}
console.log(`[redaction] ok (${mode}) — deny list clear.`);
