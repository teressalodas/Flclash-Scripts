import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { fileURLToPath } from 'node:url';
const DIR = fileURLToPath(new URL('../legacy', import.meta.url));
const files = fs.readdirSync(DIR).filter(f => /^scripts\d+\.js$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

const read = f => fs.readFileSync(path.join(DIR, f), 'utf8');

// ---------- normalization for diffing ----------
// strip comments, collapse whitespace, neutralize URLs & icons so we compare LOGIC not assets
function normalizeForDiff(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/https?:\/\/[^\s"'`)]+/g, 'URL')
    .replace(/[A-Za-z0-9_.-]+\.(png|list|mrs)\b/g, 'ASSET')
    .split('\n').map(l => l.trim()).filter(Boolean).join('\n');
}

const norm = new Map(files.map(f => [f, normalizeForDiff(read(f))]));

function lines(f) { return norm.get(f).split('\n'); }

// LCS-based similarity on normalized lines (order-sensitive, captures real logic overlap)
function lcsLen(a, b) {
  const n = a.length, m = b.length;
  let prev = new Uint16Array(m + 1), cur = new Uint16Array(m + 1);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    [prev, cur] = [cur, prev];
    cur.fill(0);
  }
  return prev[m];
}

const sim = {};
for (const a of files) for (const b of files) {
  if (a >= b) continue;
  const la = lines(a), lb = lines(b);
  const l = lcsLen(la, lb);
  const jaccard = l / (la.length + lb.length - l);
  sim[`${a}|${b}`] = { lcs: l, jaccard: +(jaccard * 100).toFixed(1), a: la.length, b: lb.length };
}

// per-script: nearest neighbour + "containment" (how much of the smaller is inside the larger)
const nn = files.map(f => {
  const cands = files.filter(x => x !== f).map(x => {
    const key = f < x ? `${f}|${x}` : `${x}|${f}`;
    const s = sim[key];
    const selfKey = f < x ? 'a' : 'b';
    const otherKey = f < x ? 'b' : 'a';
    const containment = +(s.lcs / s[selfKey] * 100).toFixed(1); // % of MY lines present in other
    return { other: x, jaccard: s.jaccard, containment };
  }).sort((p, q) => q.jaccard - p.jaccard);
  return { file: f, normLines: lines(f).length, rawLines: read(f).split('\n').length, top: cands.slice(0, 3) };
});

// ---------- feature extraction ----------
function feats(f) {
  const s = read(f);
  const has = re => re.test(s);
  // count distinct things
  const urls = [...s.matchAll(/https?:\/\/[^\s"'`)]+/g)].map(m => m[0]);
  const hosts = [...new Set(urls.map(u => { try { return new URL(u).host; } catch { return '?'; } }))];
  const providers = [...s.matchAll(/^\s{2,}([A-Za-z_][\w-]*)\s*:\s*(?:\{|\w*\()/gm)].map(m => m[1]);
  const rpBlock = s.match(/rule-providers"?\]?\s*=\s*\{([\s\S]*?)\n\s*\};/);
  const ruleSets = [...s.matchAll(/"RULE-SET,([^",]+)/g)].map(m => m[1]);
  const groupNames = [...s.matchAll(/name:\s*"([^"]+)"/g)].map(m => m[1]);
  const matchers = [...s.matchAll(/"(MATCH|GEOIP|RULE-SET|DOMAIN[-\w]*|IP-CIDR[-\w]*),?[^"]*"/g)].map(m => m[0]);

  return {
    file: f,
    bytes: s.length,
    rawLines: s.split('\n').length,
    codeLines: s.split('\n').filter(l => l.trim() && !/^\s*\/\//.test(l)).length,
    // --- pipeline stages ---
    filtersProxies: has(/filter\(.*!.*(?:keywordRegex|blackRe|blackListRegex|blackRe)/) || has(/filterKeywords|blackRe|blackListRegex/),
    ratioFilter: has(/ratioRe|ratioRegex/),
    throwsOnEmpty: has(/throw new Error/),
    dedupesNames: has(/nameCount|#\$\{/),
    normalizesNames: has(/norm|normalizeName|__normName/),
    flagEmoji: has(/🇺🇸|flagMap/),
    // --- region detection style ---
    regionStyle: has(/\(n\)\s*=>/) ? 'predicate-fn' : (has(/pattern:/) ? 'pattern-string' : (has(/filter:/) ? 'filter-string' : 'none')),
    // --- groups ---
    groupCount: groupNames.length,
    urlTestGroups: (s.match(/type:\s*"url-test"/g) || []).length,
    selectGroups: (s.match(/type:\s*"select"/g) || []).length,
    includeAll: has(/include-all/),
    autoTestDisabled: has(/autoSpeedConfig/) && !/type:\s*"url-test"/.test(s),
    hasOtherGroup: has(/其他节点/),
    // --- rules ---
    providerCount: ruleSets.length ? new Set(ruleSets).size : 0,
    ruleSets: [...new Set(ruleSets)],
    ruleCount: (s.match(/^\s*"(?:RULE-SET|GEOIP|MATCH|DOMAIN|IP-CIDR|PROCESS)/gm) || []).length,
    hasAdBlock: has(/BanAD|AdBlock|reject/),
    hasGfwSplit: has(/ProxyGFWlist|gfw|ChinaDomain/),
    mutatesRules: has(/config\.rules\s*=|config\["rules"\]\s*=/),
    validatesTargets: has(/validTargets|validTargets|const valid = new Set/),
    noResolve: has(/no-resolve/),
    manualRulesHook: has(/myManualRules|myRules/),
    // --- assets ---
    iconHost: (s.match(/https:\/\/(testingcf\.jsdelivr\.net|cdn\.jsdelivr\.net|fastly\.jsdelivr\.net|raw\.githubusercontent\.com)/) || [])[1] || 'none',
    hosts,
    // --- tuning ---
    unifiedDelay: has(/unified-delay/),
    tcpConcurrent: has(/tcp-concurrent/),
    findProcessMode: has(/find-process-mode/),
    replacesProxies: has(/config\.proxies\s*=/),
    returnsOriginalProxies: has(/config\.proxies = originalProxies|config\.proxies = allProxies/),
  };
}

const F = files.map(feats);

// syntax check
const syntax = {};
for (const f of files) {
  try { new Function(read(f)); syntax[f] = 'ok'; }
  catch (e) { syntax[f] = 'ERROR: ' + e.message; }
}

// hashes of normalized logic -> identical logic clusters
const hashes = {};
for (const f of files) {
  const h = crypto.createHash('sha1').update(norm.get(f)).digest('hex').slice(0, 8);
  (hashes[h] ||= []).push(f);
}

const out = { nn, sim, F, syntax, hashes };
fs.writeFileSync(fileURLToPath(new URL('./analysis.json', import.meta.url)), JSON.stringify(out, null, 2));

// ---------- console report ----------
console.log('=== SYNTAX ===');
for (const f of files) if (syntax[f] !== 'ok') console.log(f, syntax[f]);
console.log('all ok:', files.every(f => syntax[f] === 'ok'));

console.log('\n=== IDENTICAL NORMALIZED LOGIC ===');
for (const [h, fs_] of Object.entries(hashes)) if (fs_.length > 1) console.log(h, fs_.join(', '));

console.log('\n=== NEAREST NEIGHBOUR (LCS jaccard %) ===');
console.log('file        normL  rawL   nn1 (jac / containment)      nn2                      nn3');
for (const r of nn) {
  const fmt = t => `${t.other} ${String(t.jaccard).padStart(5)}%/${String(t.containment).padStart(5)}%`;
  console.log(
    r.file.padEnd(12),
    String(r.normLines).padStart(4),
    String(r.rawLines).padStart(5),
    fmt(r.top[0]).padEnd(27),
    fmt(r.top[1]).padEnd(27),
    fmt(r.top[2])
  );
}

console.log('\n=== FEATURE MATRIX ===');
const cols = [
  ['file', 12], ['codeL', 6], ['filt', 5], ['ratio', 6], ['throw', 6], ['dedup', 6], ['norm', 5],
  ['region', 14], ['grps', 5], ['urlT', 5], ['sel', 4], ['incAll', 7], ['other', 6],
  ['prov', 5], ['rules', 6], ['mutR', 5], ['valid', 6], ['noRes', 6], ['manual', 7],
  ['iconHost', 24], ['uDel', 5], ['tcp', 4], ['fpm', 4], ['replP', 6],
];
console.log(cols.map(([c, w]) => c.padEnd(w)).join(''));
const b = v => (v ? 'Y' : '.').padEnd(5);
for (const x of F) {
  console.log([
    x.file.padEnd(12), String(x.codeLines).padEnd(6),
    b(x.filtersProxies), b(x.ratioFilter).padEnd(6), b(x.throwsOnEmpty).padEnd(6), b(x.dedupesNames).padEnd(6), b(x.normalizesNames),
    x.regionStyle.padEnd(14), String(x.groupCount).padEnd(5), String(x.urlTestGroups).padEnd(5), String(x.selectGroups).padEnd(4),
    b(x.includeAll).padEnd(7), b(x.hasOtherGroup).padEnd(6),
    String(x.providerCount).padEnd(5), String(x.ruleCount).padEnd(6), b(x.mutatesRules).padEnd(5), b(x.validatesTargets).padEnd(6),
    b(x.noResolve).padEnd(6), b(x.manualRulesHook).padEnd(7),
    x.iconHost.padEnd(24), b(x.unifiedDelay).padEnd(5), b(x.tcpConcurrent).padEnd(4), b(x.findProcessMode).padEnd(4), b(x.replacesProxies).padEnd(6),
  ].join(''));
}

console.log('\n=== RULE-SET PROVIDERS PER SCRIPT ===');
for (const x of F) console.log(x.file.padEnd(12), `${x.providerCount} providers:`, x.ruleSets.join(' '));
