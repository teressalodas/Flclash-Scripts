import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const DIR = fileURLToPath(new URL('../legacy', import.meta.url));
const files = fs.readdirSync(DIR).filter(f => /^scripts\d+\.js$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

const cfg = () => ({
  proxies: [
    { name: '🇭🇰 香港 01', type: 'ss' }, { name: '🇯🇵 东京 02', type: 'ss' },
    { name: '🇸🇬 新加坡 03', type: 'ss' }, { name: '🇺🇸 洛杉矶 04', type: 'ss' },
    { name: '🇹🇼 台湾 05', type: 'ss' }, { name: '🇰🇷 首尔 06', type: 'ss' },
    { name: '🇩🇪 德国 07', type: 'ss' },
  ],
  'proxy-groups': [], 'rule-providers': {}, rules: [],
});

const BUILTIN = new Set(['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS', 'GLOBAL']);
const RULE_TYPES = /^(DOMAIN|DOMAIN-SUFFIX|DOMAIN-KEYWORD|DOMAIN-REGEX|GEOIP|GEOSITE|IP-CIDR6?|SRC-IP-CIDR|IP-SUFFIX|SRC-PORT|DST-PORT|PROCESS-NAME|PROCESS-PATH|PROCESS-NAME-REGEX|PROCESS-PATH-REGEX|NETWORK|RULE-SET|MATCH|AND|OR|NOT|SUB-RULE|IN-TYPE|IN-USER|IN-NAME|UID)$/;

for (const f of files) {
  const sandbox = {};
  vm.createContext(sandbox);
  try { vm.runInContext(fs.readFileSync(`${DIR}\\${f}`, 'utf8'), sandbox); } catch (e) { console.log(f, 'LOAD ERR', e.message); continue; }
  const c = cfg();
  let out;
  try { out = sandbox.main(c); } catch (e) { console.log(f.padEnd(12), 'THREW:', e.message); continue; }

  const groups = new Set((out['proxy-groups'] || []).map(g => g.name));
  const provs = new Set(Object.keys(out['rule-providers'] || {}));
  const nodes = new Set((out.proxies || c.proxies || []).map(p => p.name));
  const targets = new Set([...BUILTIN, ...groups, ...nodes]);

  const problems = [];
  for (const r of out.rules || []) {
    const t = String(r).trim();
    if (/^(AND|OR|NOT|SUB-RULE),/i.test(t)) continue;         // nested, skip target check
    const p = t.split(',');
    if (!RULE_TYPES.test(p[0].trim().toUpperCase())) { problems.push(`BAD_TYPE "${t}"`); continue; }
    if (p[0].trim().toUpperCase() === 'MATCH') {
      if (p.length < 2 || !targets.has(p[1].trim())) problems.push(`MATCH target missing "${t}"`);
      continue;
    }
    if (p[0].trim().toUpperCase() === 'RULE-SET') {
      if (!provs.has(p[1].trim())) problems.push(`RULE-SET provider missing "${t}"`);
    }
    const tgt = p[2] !== undefined ? p[2].trim() : null;
    if (tgt === null) { problems.push(`NO_TARGET "${t}"`); continue; }
    if (!targets.has(tgt) && !/^(no-resolve|src|dns|via-proxy)$/i.test(tgt)) problems.push(`TARGET missing "${t}" -> "${tgt}"`);
  }
  console.log(f.padEnd(12), problems.length ? 'ISSUES:\n    ' + problems.join('\n    ') : 'clean');
}
