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
    { name: '🇹🇼 台湾 05', type: 'ss' }, { name: '🇩🇪 德国 06', type: 'ss' },
  ],
  'proxy-groups': [{ name: '节点选择', type: 'select', proxies: ['X'] }],
  'rule-providers': { SubOwn: { type: 'http', format: 'yaml', behavior: 'domain', url: 'https://e.com/a.yaml', path: './r/a.yaml' } },
  rules: ['RULE-SET,SubOwn,DIRECT', 'RULE-SET,NotThere,节点选择', 'DOMAIN-SUFFIX,a.com,🎯 全球直连', 'MATCH,漏网之鱼'],
});

console.log('file         #groups  group names (type)  ||  rule-providers kept?  #rules  first3rules');
const rows = [];
for (const f of files) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(`${DIR}\\${f}`, 'utf8'), sandbox);
  const c = cfg();
  let out;
  try { out = sandbox.main(c); }
  catch (e) { console.log(f.padEnd(12), 'THREW:', e.message); continue; }
  const groups = out['proxy-groups'] || [];
  const rp = Object.keys(out['rule-providers'] || {});
  const rules = out.rules || [];
  const desc = groups.map(g => `${g.name}(${g.type}${g['include-all'] ? ',all' : ''}${g.proxies ? ',' + g.proxies.length : ''})`).join(' ');
  console.log(
    f.padEnd(12),
    String(groups.length).padStart(6), ' ',
    desc
  );
  console.log(' '.repeat(13), 'rule-providers:', rp.join(',') || '(none)', '| kept SubOwn:', rp.includes('SubOwn') ? 'YES' : 'no', '| #rules:', rules.length);
  rows.push({ f, groups: groups.map(g => g.name), rp, rules });
}

console.log('\n=== does the config keep the subscription rule-provider AND avoid dangling ? ===');
for (const r of rows) {
  const dangling = r.rules.filter(x => /^RULE-SET,/.test(x) && !r.rp.includes(x.split(',')[1]));
  const hasManual = r.groups.includes('手动切换');
  console.log(
    r.f.padEnd(12),
    'SubOwn kept:', (r.rp.includes('SubOwn') ? 'YES' : 'NO ').padEnd(4),
    '| nulls dangling RULE-SET:', (dangling.length ? 'PRESENT: ' + dangling.join(' ') : 'none').padEnd(30),
    '| 手动切换:', hasManual ? 'Y' : 'n'
  );
}
