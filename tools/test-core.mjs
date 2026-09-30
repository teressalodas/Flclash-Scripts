import fs from 'node:fs';
import vm from 'node:vm';

import { fileURLToPath } from 'node:url';
const SRC = fileURLToPath(new URL('../scripts-core.js', import.meta.url));
const code = fs.readFileSync(SRC, 'utf8');

function loadMain(overrides = {}) {
  // allow patching CONFIG per test
  let src = code;
  for (const [k, v] of Object.entries(overrides)) {
    src = src.replace(new RegExp(`(\\b${k}:\\s*)(?:true|false|[0-9.]+|"[^"]*")`), `$1${JSON.stringify(v)}`);
  }
  const sandbox = { config: null };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.main;
}

const baseConfig = () => ({
  proxies: [
    { name: '🇭🇰 香港 01', type: 'ss' },
    { name: '🇭🇰 香港 01', type: 'ss' },              // duplicate
    { name: '🇯🇵 东京 IEPL [3x]', type: 'vmess' },
    { name: '🇯🇵 大阪 5x 高倍率', type: 'vmess' },     // filtered by ratio
    { name: '🇸🇬 Singapore 02', type: 'trojan' },
    { name: '🇺🇸 洛杉矶 GIA', type: 'ss' },
    { name: '🇹🇼 台湾 CHT', type: 'ss' },
    { name: '剩余流量：100GB', type: 'ss' },           // filtered by blacklist
    { name: '官网 example.com', type: 'ss' },          // filtered by blacklist
    { name: '🇩🇪 法兰克福', type: 'ss' },              // -> 其他节点
    { name: 'RUSSIA Moscow', type: 'ss' },             // must NOT match 美国节点 (US)
    { name: 'MSG 中转', type: 'ss' },                  // must NOT match 狮城节点 (SG)
    { name: 'HKT 10Gbps 香港', type: 'ss' },           // "10G" must not be read as ratio
  ],
  'proxy-groups': [{ name: '节点选择', type: 'select', proxies: ['旧节点'] }],
  'rule-providers': { CustomSub: { type: 'http', format: 'yaml', behavior: 'domain', url: 'https://example.com/x.yaml', path: './ruleset/x.yaml' } },
  rules: [
    'RULE-SET,CustomSub,DIRECT',            // subscription provider -> must be KEPT
    'RULE-SET,MissingProvider,节点选择',     // dangling provider -> must be DROPPED
    'DOMAIN-SUFFIX,google.com,🎯 全球直连',  // CN group name -> DIRECT
    'DOMAIN-SUFFIX,ads.com,🛑 广告拦截',     // CN group name -> REJECT
    'DOMAIN-SUFFIX,corp.example,🏢 办公网',  // unknown -> 节点选择
    'IP-CIDR,1.2.3.0/24,节点选择',           // IP rule -> append no-resolve
    'GEOIP,CN,全球直连',                     // GEOIP -> DIRECT + no-resolve
    'MATCH,漏网之鱼',                        // dropped, script owns MATCH
    'AND,((NETWORK,UDP),(DST-PORT,443)),REJECT', // logical rule preserved
  ],
});

function run(label, overrides) {
  const main = loadMain(overrides);
  const cfg = baseConfig();
  let out;
  try { out = main(cfg); } catch (e) { console.log(`\n### ${label}\nTHREW: ${e.message}`); return null; }
  console.log(`\n############ ${label} ############`);
  console.log('proxy-groups:');
  for (const g of out['proxy-groups']) {
    console.log(`  - ${g.name.padEnd(12)} type=${String(g.type).padEnd(9)} ${g['include-all'] ? 'include-all ' : ''}interval=${g.interval ?? '-'} n=${g.proxies ? g.proxies.length : '-'}`);
  }
  console.log('rule-providers:', Object.keys(out['rule-providers']).join(' '));
  console.log('rules:');
  out.rules.forEach(r => console.log('   ' + r));
  return out;
}

// ---------- assertions ----------
let pass = 0, fail = 0;
const t = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${extra}`); }
};

console.log('=========== TEST 1: defaults (url-test + manual switch + rules) ===========');
const o1 = run('defaults', {});
{
  const groups = o1['proxy-groups'];
  const named = Object.fromEntries(groups.map(g => [g.name, g]));
  console.log('\n--- assertions ---');
  t('all region groups url-test', groups.filter(g => /节点$/.test(g.name)).every(g => g.type === 'url-test' || g.name === '其他节点'));
  const hk = named['香港节点'].proxies;
  t('香港 duplicate renamed not dropped', hk.includes('🇭🇰 香港 01') && hk.includes('🇭🇰 香港 01 #1'), JSON.stringify(hk));
  t('香港 group has no other stray names', hk.length === 3, JSON.stringify(hk));
  t('ratio 5x filtered out', !JSON.stringify(named).includes('高倍率'));
  t('3x kept', JSON.stringify(named).includes('3x'));
  t('blacklist removed', !JSON.stringify(named).includes('剩余流量') && !JSON.stringify(named).includes('官网'));
  t('RUSSIA not US group', !named['美国节点'].proxies.includes('RUSSIA Moscow'));
  t('MSG not SG group', !named['狮城节点'].proxies.includes('MSG 中转'));
  t('HKT 10Gbps kept as HK', named['香港节点'].proxies.includes('HKT 10Gbps 香港'));
  t('德国 -> 其他节点', named['其他节点']?.proxies.includes('🇩🇪 法兰克福'));
  t('手动切换 group exists with include-all', named['手动切换']?.['include-all'] === true);
  t('节点选择 can reach 手动切换', named['节点选择'].proxies.includes('手动切换'));
  t('no 旧节点 dangling', !JSON.stringify(groups).includes('旧节点'));
  t('subscription provider preserved', 'CustomSub' in o1['rule-providers']);
  t('builtin providers added', 'AdBlock' in o1['rule-providers'] && 'gfw' in o1['rule-providers']);
  t('dangling RULE-SET dropped', !o1.rules.some(r => r.includes('MissingProvider')));
  t('subscription RULE-SET kept', o1.rules.some(r => r === 'RULE-SET,CustomSub,DIRECT'));
  t('CN 直连 group -> DIRECT', o1.rules.some(r => r.startsWith('DOMAIN-SUFFIX,google.com,DIRECT')));
  t('CN 广告 group -> REJECT', o1.rules.some(r => r.startsWith('DOMAIN-SUFFIX,ads.com,REJECT')));
  t('unknown group -> 节点选择', o1.rules.some(r => r.startsWith('DOMAIN-SUFFIX,corp.example,节点选择')));
  t('IP-CIDR got no-resolve', o1.rules.some(r => r === 'IP-CIDR,1.2.3.0/24,节点选择,no-resolve'));
  t('GEOIP,CN -> DIRECT + no-resolve', o1.rules.some(r => r === 'GEOIP,CN,DIRECT,no-resolve'), o1.rules.find(r => r.startsWith('GEOIP,CN')));
  t('logical rule preserved', o1.rules.some(r => r.startsWith('AND,')));
  t('no inherited MATCH', o1.rules.filter(r => r.startsWith('MATCH')).length === 1 && o1.rules.find(r => r.startsWith('MATCH')) === 'MATCH,节点选择');
  t('MATCH is the last rule', o1.rules[o1.rules.length - 1] === 'MATCH,节点选择', JSON.stringify(o1.rules.slice(-2)));
  t('GEOIP,CN sits before MATCH', o1.rules.indexOf('GEOIP,CN,DIRECT,no-resolve') < o1.rules.length - 1);
  t('AdBlock rule injected', o1.rules.some(r => r === 'RULE-SET,AdBlock,REJECT'));
  t('gfw rule injected', o1.rules.some(r => r === 'RULE-SET,gfw,节点选择'));
  t('QUIC block injected only when gfw present', o1.rules.some(r => r.startsWith('AND,((NETWORK,UDP),(DST-PORT,443)')));
  t('performance flags set', o1['unified-delay'] === true && o1['tcp-concurrent'] === true);
}

console.log('\n=========== TEST 2: pure manual mode (regionGroupType=select, no manual group, no rules) ===========');
const o2 = run('manual-minimal', { regionGroupType: 'select', manualSwitchGroup: false, injectRules: false, filterRatio: false, filterNames: false });
{
  const named = Object.fromEntries(o2['proxy-groups'].map(g => [g.name, g]));
  console.log('\n--- assertions ---');
  t('region groups are select', named['香港节点'].type === 'select');
  t('no interval on select groups', named['香港节点'].interval === undefined);
  t('no 手动切换 group', named['手动切换'] === undefined);
  t('ratio filter off -> 5x kept', JSON.stringify(named).includes('高倍率'));
  t('name filter off -> 官网 kept', JSON.stringify(named).includes('官网'));
  t('no builtin providers', !('AdBlock' in o2['rule-providers']));
  t('subscription provider still preserved', 'CustomSub' in o2['rule-providers']);
  t('no injected AdBlock rule', !o2.rules.includes('RULE-SET,AdBlock,REJECT'));
  t('no dangling builtin rules when not injected', !o2.rules.some(r => /RULE-SET,(AdBlock|gfw)/.test(r)));
  t('rule-providers untouched (no clobber)', JSON.stringify(Object.keys(o2['rule-providers'])) === JSON.stringify(['CustomSub']), JSON.stringify(Object.keys(o2['rule-providers'])));
}

console.log('\n=========== TEST 3: no valid proxies -> throws ===========');
{
  const main = loadMain({});
  const cfg = { proxies: [{ name: '剩余流量 1GB', type: 'ss' }], rules: [] };
  let threw = null;
  try { main(cfg); } catch (e) { threw = e.message; }
  t('throws on empty proxy list', !!threw, String(threw));
}

console.log('\n=========== TEST 4: 悬空 dialer-proxy 清理 + 改名同步 ===========');
{
  const main = loadMain({});
  const cfg = {
    proxies: [
      { name: 'HK 1', type: 'ss' },
      { name: '剩余流量 1GB', type: 'ss' },                          // 会被黑名单过滤
      { name: 'C', type: 'ss', 'dialer-proxy': '剩余流量 1GB' },      // 指向被过滤掉的节点
      { name: 'B', type: 'ss', 'dialer-proxy': 'GHOST' },            // 指向不存在的名字
      { name: 'P', type: 'ss', 'dialer-proxy': 'Q' },                // 级联链
      { name: 'Q', type: 'ss', 'dialer-proxy': '也不存在' },
      { name: 'R', type: 'ss', 'dialer-proxy': 'P' },
    ],
    'proxy-groups': [], 'rule-providers': {}, rules: [],
  };
  const out = main(cfg);
  const names = out.proxies.map(p => p.name);
  console.log('  保留:', JSON.stringify(names));
  t('C(指向被过滤节点)被剔除', !names.includes('C'));
  t('B(指向不存在的名字)被剔除', !names.includes('B'));
  t('级联：Q 被剔除', !names.includes('Q'));
  t('级联：P 被连带剔除', !names.includes('P'));
  t('级联：R 被连带剔除', !names.includes('R'));
  t('不相关节点保留', names.includes('HK 1'));
  const dangling = out.proxies.filter(p => p['dialer-proxy'] && !names.includes(p['dialer-proxy']));
  t('结果中不含任何悬空引用', dangling.length === 0, JSON.stringify(dangling.map(p => p.name)));

  console.log('\n--- 改名后 dialer-proxy 同步 ---');
  const main2 = loadMain({});
  const out2 = main2({
    proxies: [
      { name: 'HK 1', type: 'ss' },
      { name: 'HK 1', type: 'ss' },                       // 重名 -> 改成 "HK 1 #1"
      { name: 'D', type: 'ss', 'dialer-proxy': 'HK 1' },  // 引用的是被改名走的那一个
    ],
    'proxy-groups': [], 'rule-providers': {}, rules: [],
  });
  const n2 = out2.proxies.map(p => p.name);
  const d = out2.proxies.find(p => p.name === 'D');
  console.log('  保留:', JSON.stringify(n2), ' D.dialer-proxy =', JSON.stringify(d && d['dialer-proxy']));
  t('重名节点被改名', n2.includes('HK 1 #1'));
  t('指向被改名节点的 dialer-proxy 已同步', d && d['dialer-proxy'] === 'HK 1 #1', d && d['dialer-proxy']);
  const dangling2 = out2.proxies.filter(p => p['dialer-proxy'] && !n2.includes(p['dialer-proxy']));
  t('同步后无悬空引用', dangling2.length === 0, JSON.stringify(dangling2.map(p => p.name)));
}

console.log(`\n================ ${pass} passed, ${fail} failed ================`);
process.exit(fail ? 1 : 0);
