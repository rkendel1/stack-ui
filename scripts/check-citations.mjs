#!/usr/bin/env node
// Checks every `repo:path[:line[-line]]` citation in docs/*.md against local
// checkouts of the product repositories. Zero dependencies.
//
// Usage: node scripts/check-citations.mjs [--root <dir containing the checkouts>]
// Default root is the parent directory of this repository. Each repository is
// expected at <root>/<name> (compute, flow_db, appport, appport-services,
// authboundry, appboundry).

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOS = ['compute', 'flow_db', 'appport', 'appport-services', 'authboundry', 'appboundry'];
const here = dirname(fileURLToPath(import.meta.url));
const docsDir = resolve(here, '..', 'docs');
const rootFlag = process.argv.indexOf('--root');
const root = rootFlag > -1 ? resolve(process.argv[rootFlag + 1]) : resolve(here, '..', '..');

const pattern = new RegExp(`\`(${REPOS.join('|')}):([^\`:\\s]+)(?::(\\d+)(?:-(\\d+))?)?\``, 'g');
const missingRepos = REPOS.filter(r => !existsSync(join(root, r)));
if (missingRepos.length) {
  console.error(`Missing checkouts under ${root}: ${missingRepos.join(', ')}`);
  process.exit(2);
}

const lineCounts = new Map();
const countLines = file => {
  if (!lineCounts.has(file)) lineCounts.set(file, readFileSync(file, 'utf8').split('\n').length);
  return lineCounts.get(file);
};

let checked = 0;
const failures = [];
for (const doc of readdirSync(docsDir).filter(f => f.endsWith('.md'))) {
  const text = readFileSync(join(docsDir, doc), 'utf8');
  for (const m of text.matchAll(pattern)) {
    const [raw, repo, path, start, end] = m;
    checked++;
    const target = join(root, repo, path.replace(/\/$/, ''));
    if (!existsSync(target)) { failures.push(`${doc}: ${raw} — path not found`); continue; }
    if (start && statSync(target).isFile()) {
      const n = countLines(target);
      const last = Number(end || start);
      if (Number(start) < 1 || last > n || last < Number(start)) {
        failures.push(`${doc}: ${raw} — line out of range (file has ${n} lines)`);
      }
    }
  }
}

for (const f of failures) console.error(f);
console.log(`${checked} citations checked, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
