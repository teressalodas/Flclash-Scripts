import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';
const DIR = fileURLToPath(new URL('../legacy', import.meta.url));
const files = fs.readdirSync(DIR).filter(f => /^scripts\d+\.js$/.test(f))
  .sort((x, y) => parseInt(x.match(/\d+/)[0]) - parseInt(y.match(/\d+/)[0]));
const read = f => fs.readFileSync(path.join(DIR, f), 'utf8');

function providerKeys(src) {
  const i = src.indexOf('rule-providers');
  if (i < 0) return [];
  // take balanced braces from the opening brace after "rule-providers"
  const start = src.indexOf('{', i);
  let depth = 0, end = start;
  for (let j = start; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  const block = src.slice(start, end + 1);
  return [...new Set([...block.matchAll(/^\s{2,}([A-Za-z_][\w-]*)\s*:/gm)].map(m => m[1]))];
}

console.log('file         #prov  keys');
const provs = {};
for (const f of files) {
  const p = providerKeys(read(f));
  provs[f] = p;
  console.log(f.padEnd(12), String(p.length).padStart(4), ' ', p.join(' '));
}

console.log('\n=== rules referencing a rule-provider (RULE-SET,XXX) vs declared providers ===');
for (const f of files) {
  const src = read(f);
  const declared = new Set(provs[f]);
  const refs = [...new Set([...src.matchAll(/RULE-SET,([^,"]+)/g)].map(m => m[1].trim()))];
  const undeclared = refs.filter(r => !declared.has(r) && !/\$\{/.test(r));
  const unused = [...declared].filter(d => !refs.includes(d) && !new RegExp(`["'\`].*${d}`).test(''));
  console.log(`\n${f}`);
  console.log('  RULE-SET refs :', refs.length ? refs.join(' ') : '(none - passes through original rules)');
  console.log('  provider decls:', declared.size ? [...declared].join(' ') : '(none)');
  if (undeclared.length) console.log('  !! refs NOT declared here:', undeclared.join(' '));
  const trulyUnused = [...declared].filter(d => !refs.includes(d));
  if (trulyUnused.length) console.log('  !! declared but never used in rules:', trulyUnused.join(' '));
}

console.log('\n=== dangling proxy-group references (group listed in another group but not defined) ===');
for (const f of files) {
  const src = read(f);
  // collect group names defined as name: "X" where X is a group-ish name
  const defined = new Set([...src.matchAll(/name:\s*"([^"]+)"/g)].map(m => m[1]));
  // collect references from proxies: [ ... ] arrays literally listed
  const refs = new Set();
  for (const m of src.matchAll(/proxies:\s*\[([^\]]*)\]/g)) {
    for (const t of m[1].split(',')) {
      const v = t.trim().replace(/^["'`]|["'`]$/g, '').replace(/\$\{[^}]*\}/g, '').trim();
      if (!v || v.includes('...') || v.includes('${')) continue;
      refs.add(v);
    }
  }
  const builtins = new Set(['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS']);
  const dangling = [...refs].filter(r => !builtins.has(r) && !defined.has(r));
  if (dangling.length) console.log(f.padEnd(12), 'dangling:', dangling.join(' '));
}

console.log('\n=== feature presence across lineage ===');
const featureRe = {
  normalizeNameFn: /function normalizeName/,
  buildRegionRegexFn: /function buildRegionRegex/,
  dedupeNameCount: /nameCount/,
  autoSpeedConfig: /autoSpeedConfig/,
  lazyFalse: /lazy:\s*false/,
  manualRules: /myManualRules|myRules/,
  noResolve: /no-resolve/,
  mapTargetKeyword: /直连.*DIRECT|mapTarget/,
  throwOnEmpty: /throw new Error/,
  mergesProviderSets: /\.\.\.\(config\["rule-providers"\]/,
  setsUnifiedDelay: /unified-delay/,
  includeAll: /include-all/,
  urlTest: /type:\s*"url-test"/,
};
const names = Object.keys(featureRe);
console.log('file'.padEnd(12), names.map(n => n.slice(0, 9).padEnd(10)).join(''));
for (const f of files) {
  const src = read(f);
  console.log(f.padEnd(12), names.map(n => (featureRe[n].test(src) ? 'Y' : '.').padEnd(10)).join(''));
}
