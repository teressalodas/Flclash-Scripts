import fs from 'node:fs';
import vm from 'node:vm';

import { fileURLToPath } from 'node:url';
const SRC = fileURLToPath(new URL('../scripts-lite.js', import.meta.url));
const code = fs.readFileSync(SRC, 'utf8');

function loadMain(overrides = {}) {
  let src = code;
  for (const [k, v] of Object.entries(overrides)) {
    src = src.replace(new RegExp(`(\\b${k}:\\s*)(?:true|false|[0-9.]+|"[^"]*")`), `$1${JSON.stringify(v)}`);
  }
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.main;
}

const baseConfig = () => ({
  proxies: [
    { name: '🇭🇰 香港 01', type: 'ss' },
    { name: '🇭🇰 香港 01', type: 'ss' },
    { name: '🇯🇵 东京 5x', type: 'vmess' },          // lite 不做倍率过滤，应保留
    { name: '🇸🇬 Singapore 02', type: 'trojan' },
    { name: '🇺🇸 洛杉矶 GIA', type: 'ss' },
    { name: '🇹🇼 台湾 CHT', type: 'ss' },
    { name: '剩余流量：100GB', type: 'ss' },           // 黑名单
    { name: '🇩🇪 法兰克福', type: 'ss' },             // 其他节点
    { name: 'RUSSIA Moscow', type: 'ss' },            // 不得进美国节点
    { name: 'MSG 中转', type: 'ss' },                 // 不得进狮城节点
  ],
  'proxy-groups': [{ name: '节点选择', type: 'select', proxies: ['X'] }],
  'rule-providers': { SubOwn: { type: 'http', format: 'yaml', behavior: 'domain', url: 'https://e.com/a.yaml', path: './r/a.yaml' } },
  rules: [
    'RULE-SET,SubOwn,DIRECT',              // 订阅自有，保留
    'RULE-SET,NotThere,节点选择',           // 悬空，丢弃
    'DOMAIN-SUFFIX,a.com,🎯 全球直连',      // -> DIRECT
    'DOMAIN-SUFFIX,b.com,🛑 广告拦截',      // -> REJECT
    'DOMAIN-SUFFIX,c.com,🏢 办公网',        // -> 节点选择
    'IP-CIDR,1.2.3.0/24,节点选择',          // 补 no-resolve
    'MATCH,漏网之鱼',                       // 重写为 MATCH,节点选择
    'AND,((NETWORK,UDP),(DST-PORT,443)),REJECT',
  ],
});

let pass = 0, fail = 0;
const t = (n, c, e = '') => { if (c) { pass++; console.log('  PASS ', n); } else { fail++; console.log('  FAIL ', n, e); } };

console.log('=========== scripts-lite: default (手动档) ===========');
{
  const main = loadMain({});
  const cfg = baseConfig();
  const out = main(cfg);
  const named = Object.fromEntries(out['proxy-groups'].map(g => [g.name, g]));
  console.log('groups:', out['proxy-groups'].map(g => `${g.name}(${g.type})`).join(' '));
  console.log('providers:', Object.keys(out['rule-providers']).join(','));
  console.log('rules:'); out.rules.forEach(r => console.log('   ' + r));
  console.log('--- assertions ---');
  t('区域组为 select', named['香港节点'].type === 'select');
  t('select 组不带 interval', named['香港节点'].interval === undefined);
  t('不做倍率过滤（5x 保留）', named['日本节点'].proxies.includes('🇯🇵 东京 5x'));
  t('黑名单生效', !JSON.stringify(named).includes('剩余流量'));
  t('重名节点改名保留', named['香港节点'].proxies.join() === '🇭🇰 香港 01,🇭🇰 香港 01 #1', JSON.stringify(named['香港节点'].proxies));
  t('RUSSIA 未进美国组', !named['美国节点'].proxies.includes('RUSSIA Moscow'));
  t('MSG 未进狮城组', !named['狮城节点'].proxies.includes('MSG 中转'));
  t('德国进其他组', named['其他节点']?.proxies.includes('🇩🇪 法兰克福'));
  t('订阅 provider 保留', 'SubOwn' in out['rule-providers']);
  t('未注入自带 provider', !('AdBlock' in out['rule-providers']));
  t('悬空 RULE-SET 丢弃', !out.rules.some(r => r.includes('NotThere')));
  t('订阅 RULE-SET 保留', out.rules.includes('RULE-SET,SubOwn,DIRECT'));
  t('中文组名 -> DIRECT', out.rules.includes('DOMAIN-SUFFIX,a.com,DIRECT'));
  t('中文组名 -> REJECT', out.rules.includes('DOMAIN-SUFFIX,b.com,REJECT'));
  t('未知组名 -> 节点选择', out.rules.includes('DOMAIN-SUFFIX,c.com,节点选择'));
  t('IP 规则补 no-resolve', out.rules.includes('IP-CIDR,1.2.3.0/24,节点选择,no-resolve'));
  t('MATCH 重写且唯一', out.rules.filter(r => r.startsWith('MATCH')).length === 1 && out.rules.includes('MATCH,节点选择'));
  t('逻辑规则保留', out.rules.some(r => r.startsWith('AND,')));
  t('MATCH 必须是最后一条', out.rules[out.rules.length - 1] === 'MATCH,节点选择', JSON.stringify(out.rules.slice(-3)));
  t('AND 规则排在 MATCH 之前（未被吞掉）', out.rules.indexOf(out.rules.find(r => r.startsWith('AND,'))) < out.rules.length - 1);
  // 被过滤的节点不再写回 config.proxies（旧版本会保留它们，属遗留行为）
  t('被黑名单过滤的节点不写回 config.proxies',
    !out.proxies.some(p => p.name.includes('剩余流量')),
    JSON.stringify(out.proxies.map(p => p.name)));
  t('无悬空策略组引用', !JSON.stringify(out['proxy-groups']).includes('"X"'));
}

console.log('\n=========== scripts-lite: autoTest=true ===========');
{
  const main = loadMain({ autoTest: true });
  const out = main(baseConfig());
  const named = Object.fromEntries(out['proxy-groups'].map(g => [g.name, g]));
  t('区域组为 url-test', named['香港节点'].type === 'url-test');
  t('url-test 带 interval=300', named['香港节点'].interval === 300);
  t('其它节点也为 url-test', named['其他节点'].type === 'url-test');
  t('节点选择仍为 select', named['节点选择'].type === 'select');
}

console.log('\n=========== scripts-lite: 无有效节点 ===========');
{
  const main = loadMain({});
  let threw = null;
  try { main({ proxies: [{ name: '剩余流量 1GB', type: 'ss' }], rules: [] }); } catch (e) { threw = e.message; }
  t('抛错而非静默返回', !!threw, String(threw));
  const main2 = loadMain({ throwWhenEmpty: false });
  let threw2 = null;
  try { main2({ proxies: [{ name: '剩余流量 1GB', type: 'ss' }], rules: [] }); } catch (e) { threw2 = e.message; }
  t('关闭防护时静默返回', threw2 === null);
}

console.log('\n=========== scripts-lite: 空规则订阅 ===========');
{
  const main = loadMain({});
  const out = main({ proxies: [{ name: '🇭🇰 HK 01', type: 'ss' }], rules: [] });
  t('自动补 MATCH 兜底', out.rules.includes('MATCH,节点选择'));
  t('无 rule-providers 时不报错', out['rule-providers'] === undefined);
}

console.log('\n=========== scripts-lite: 悬空 dialer-proxy 清理 + 改名同步 ===========');
{
  const main = loadMain({});
  const out = main({
    proxies: [
      { name: 'HK 1', type: 'ss' },
      { name: '剩余流量 1GB', type: 'ss' },
      { name: 'C', type: 'ss', 'dialer-proxy': '剩余流量 1GB' },
      { name: 'B', type: 'ss', 'dialer-proxy': 'GHOST' },
      { name: 'P', type: 'ss', 'dialer-proxy': 'Q' },
      { name: 'Q', type: 'ss', 'dialer-proxy': '也不存在' },
      { name: 'R', type: 'ss', 'dialer-proxy': 'P' },
    ],
    rules: [],
  });
  const names = out.proxies.map(p => p.name);
  console.log('  保留:', JSON.stringify(names));
  t('C(指向被过滤节点)被剔除', !names.includes('C'));
  t('B(指向不存在的名字)被剔除', !names.includes('B'));
  t('级联：Q/P/R 全被剔除', !['Q', 'P', 'R'].some(n => names.includes(n)));
  t('不相关节点保留', names.includes('HK 1'));
  t('结果中不含任何悬空引用',
    out.proxies.filter(p => p['dialer-proxy'] && !names.includes(p['dialer-proxy'])).length === 0);

  const out2 = loadMain({})({
    proxies: [
      { name: 'HK 1', type: 'ss' },
      { name: 'HK 1', type: 'ss' },
      { name: 'D', type: 'ss', 'dialer-proxy': 'HK 1' },
    ],
    rules: [],
  });
  const n2 = out2.proxies.map(p => p.name);
  const d = out2.proxies.find(p => p.name === 'D');
  console.log('  保留:', JSON.stringify(n2), ' D.dialer-proxy =', JSON.stringify(d && d['dialer-proxy']));
  t('重名节点被改名', n2.includes('HK 1 #1'));
  t('指向被改名节点的 dialer-proxy 已同步', d && d['dialer-proxy'] === 'HK 1 #1', d && d['dialer-proxy']);
}

console.log(`\n================ ${pass} passed, ${fail} failed ================`);
process.exit(fail ? 1 : 0);
