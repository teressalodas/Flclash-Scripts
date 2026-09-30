/**
 * scripts-full.js 的行为断言测试
 * 用法: node test-full.mjs [脚本路径]
 */
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const SRC = process.argv[2] || fileURLToPath(new URL('../scripts-full.js', import.meta.url));
const code = fs.readFileSync(SRC, 'utf8');
function load(o = {}) {
  let s = code;
  for (const [k, v] of Object.entries(o)) {
    s = s.replace(new RegExp(`(\\b${k}:\\s*)(?:true|false|null|'[^']*'|"[^"]*"|[\\d.]+)`), `$1${JSON.stringify(v)}`);
  }
  const sb = {}; vm.createContext(sb); vm.runInContext(s, sb); return sb.main;
}
const base = (o = {}) => ({ proxies: [], 'proxy-providers': {}, 'proxy-groups': [], 'rule-providers': {}, rules: [], ...o });
const P = (n, extra = {}) => ({ name: n, type: 'ss', ...extra });
const PROVIDER = { SubA: { type: 'http', url: 'https://e.com/a', path: './p/a.yaml' } };

let pass = 0, fail = 0;
const t = (n, c, e = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (e ? '  → ' + e : '')); } };
const groupsOf = (out) => Object.fromEntries(out['proxy-groups'].map(g => [g.name, g]));

console.log('══ 语法 ══');
try { new Function(code); t('可编译', true); } catch (e) { t('可编译', false, e.message); }

console.log('\n══ 策略组结构与顺序 ══');
{
  const out = load({})(base({ proxies: [P('🇭🇰 香港 01'), P('🇩🇪 法兰克福')] }));
  const names = out['proxy-groups'].map(g => g.name);
  console.log('   顺序:', JSON.stringify(names));
  t('节点选择 在第一位', names[0] === '节点选择');
  t('手动选择 紧跟节点选择之后', names[1] === '手动选择', names[1]);
  t('地区分组排在手动选择之后', names.indexOf('香港节点') > names.indexOf('手动选择'));
  t('不存在「手动切换」组', !names.includes('手动切换'));
  t('不存在「自动选择」组', !names.includes('自动选择'));
  const icons = out['proxy-groups'].map(g => g.icon);
  t('各策略组图标互不重复', new Set(icons).size === icons.length,
    JSON.stringify(out['proxy-groups'].map(g => `${g.name}=${g.icon.split('/').pop()}`)));
  const g = groupsOf(out);
  t('其他节点 与 手动选择 图标不同', g['其他节点'].icon !== g['手动选择'].icon);
}

console.log('\n══ 国外AI / Telegram 含手动选择 ══');
{
  for (const [label, names] of Object.entries({
    '有美国+新加坡': ['🇺🇸 洛杉矶', '🇸🇬 新加坡', '🇯🇵 东京'],
    '无美国+无新加坡': ['🇯🇵 东京', '🇩🇪 法兰克福'],
    '只有香港': ['🇭🇰 香港'],
  })) {
    const out = load({})(base({ proxies: names.map(n => P(n)) }));
    const g = groupsOf(out);
    console.log(`   ${label}`);
    console.log(`     国外AI   : ${JSON.stringify(g['国外AI'].proxies)}`);
    console.log(`     Telegram : ${JSON.stringify(g['Telegram'].proxies)}`);
    t(`${label}: 国外AI 含手动选择`, g['国外AI'].proxies.includes('手动选择'));
    t(`${label}: Telegram 含手动选择`, g['Telegram'].proxies.includes('手动选择'));
    t(`${label}: 国外AI 不含港澳`, !g['国外AI'].proxies.includes('香港节点') || !g['节点选择'].proxies.includes('澳门节点'));
  }
  const out = load({})(base({ proxies: [P('🇺🇸 洛杉矶'), P('🇸🇬 新加坡'), P('🇯🇵 东京'), P('🇭🇰 香港')] }));
  const ai = groupsOf(out)['国外AI'].proxies;
  t('有美国时美国排第一', ai[0] === '美国节点');
  t('手动选择排在最后（兜底）', ai[ai.length - 1] === '手动选择');
  const onlyHk = load({})(base({ proxies: [P('🇭🇰 香港')] }));
  t('只有香港时国外AI 仍非空', groupsOf(onlyHk)['国外AI'].proxies.length > 0);
}

console.log('\n══ 倍率过滤：只挡自动分流，不挡手动选择 ══');
{
  const names = ['🇭🇰 香港 01', '🇭🇰 香港 5x 高倍率', '🇯🇵 东京 10x', '🇸🇬 新加坡 1.5x'];
  const out = load({})(base({ proxies: names.map(n => P(n)) }));
  const g = groupsOf(out);
  const hk = g['香港节点'].proxies;
  console.log('   config.proxies      :', JSON.stringify(out.proxies.map(p => p.name)));
  console.log('   香港节点(自动)       :', JSON.stringify(hk));
  console.log('   其他节点(自动)       :', JSON.stringify(g['其他节点']?.proxies));
  t('高倍率节点未被删除（仍在 config.proxies）', out.proxies.some(p => p.name.includes('5x')), JSON.stringify(out.proxies.map(p => p.name)));
  t('高倍率节点不进地区组', !hk.includes('🇭🇰 香港 5x 高倍率'), JSON.stringify(hk));
  t('高倍率节点不进其他节点', !JSON.stringify(g['其他节点']?.proxies || []).includes('10x'));
  t('未超标节点(1.5x)进地区组', (g['狮城节点']?.proxies || []).includes('🇸🇬 新加坡 1.5x'));
  t('手动选择 带 include-all（因而含高倍率节点）', g['手动选择']['include-all'] === true);
  t('手动选择的 exclude-filter 只排黑名单、不排倍率',
    /群|邀请/.test(g['手动选择']['exclude-filter']) && !/倍率/.test(g['手动选择']['exclude-filter']));

  const off = load({ filterHighRate: false })(base({ proxies: names.map(n => P(n)) }));
  t('filterHighRate=false 时高倍率节点进地区组', groupsOf(off)['香港节点'].proxies.includes('🇭🇰 香港 5x 高倍率'));
}

console.log('\n══ DNS / sniffer 防泄露设置（不得再被移除）══');
{
  // 这一组断言是回归护栏：曾经因为"不接管 DNS"而把这段整块删掉，导致 DNS 泄露。
  // 任何一次删除 respect-rules / fake-ip-filter / nameserver-policy 都会在这里失败。
  const out = load({})(base({ proxies: [P('HK 1')] }));
  t('dns.respect-rules 必须为 true（DNS 查询跟随规则表）', out.dns['respect-rules'] === true, String(out.dns['respect-rules']));
  t('dns.enhanced-mode 为 fake-ip', out.dns['enhanced-mode'] === 'fake-ip');
  t('dns.fake-ip-filter 含 geosite:cn', (out.dns['fake-ip-filter'] || []).includes('geosite:cn'));
  t('dns.fake-ip-filter 含 geosite:private', (out.dns['fake-ip-filter'] || []).includes('geosite:private'));
  t('nameserver 为 DoH（代理侧解析）', (out.dns.nameserver || []).every(u => u.startsWith('https://')));
  t('direct-nameserver 为境内明文', JSON.stringify(out.dns['direct-nameserver']) === JSON.stringify(['223.5.5.5', '119.29.29.29']));
  t('proxy-server-nameserver 为境内明文', JSON.stringify(out.dns['proxy-server-nameserver']) === JSON.stringify(['223.5.5.5', '119.29.29.29']));
  t('nameserver-policy 为 geosite:cn 指定境内 DoH',
    JSON.stringify(out.dns['nameserver-policy']?.['geosite:cn']) === JSON.stringify(['https://doh.pub/dns-query', 'https://dns.alidns.com/dns-query']));
  t('sniffer.enable 为 true', out.sniffer.enable === true);
  t('sniffer.parse-pure-ip 为 true', out.sniffer['parse-pure-ip'] === true);
  t('sniffer.override-destination 为 true', out.sniffer['override-destination'] === true);
  t('dns 合并而非替换：用户自定义字段保留',
    (() => {
      const o = load({})(base({ proxies: [P('HK 1')], dns: { fallback: ['https://1.1.1.1/dns-query'], 'fallback-filter': { geoip: true } } }));
      return JSON.stringify(o.dns.fallback) === JSON.stringify(['https://1.1.1.1/dns-query']) && !!o.dns['fallback-filter'];
    })());
}

console.log('\n══ 不接管的键确实未被触碰 ══');
{
  const cfg = {
    proxies: [P('HK 1')],
    hosts: { 'my.custom.host': '1.2.3.4' },
    ntp: { enable: false, server: 'my.ntp' },
    'geodata-loader': 'standard',
    tun: { enable: true, mtu: 9000 },
  };
  const out = load({})(JSON.parse(JSON.stringify(cfg)));
  t('hosts 完全不被触碰', JSON.stringify(out.hosts) === JSON.stringify(cfg.hosts));
  t('ntp 完全不被触碰', JSON.stringify(out.ntp) === JSON.stringify(cfg.ntp));
  t('geodata-loader 完全不被触碰', out['geodata-loader'] === 'standard');
  t('tun 完全不被触碰（mtu 保持 9000）', out.tun.mtu === 9000 && out.tun.gso === undefined);
  t('OPTIONS 里不再有 manageXxx / hostsGoogleCn / hostsBlockCdn / strictNameFilter / extraGroups',
    !/manageDns|manageHosts|manageNtp|manageSniffer|manageGeodataLoader|hostsGoogleCn|hostsBlockCdn|strictNameFilter|extraGroups/.test(code));
}

console.log('\n══ subRulesPosition（默认 before-cn）══');
{
  const cfg = () => base({ proxies: [P('HK 1')], rules: ['DOMAIN-SUFFIX,myown.com,DIRECT'] });
  const def = load({})(cfg());
  const iMy = def.rules.findIndex(r => r.includes('myown.com'));
  const iCn = def.rules.findIndex(r => r.startsWith('RULE-SET,cn-domain'));
  console.log(`   默认(before-cn): 订阅@${iMy + 1}  cn-domain@${iCn + 1}`);
  t('默认 before-cn：订阅规则排在 CN 分流之前', iMy < iCn, `my=${iMy} cn=${iCn}`);
  t('MATCH 是最后一条', def.rules.at(-1) === 'MATCH,节点选择');

  const after = load({ subRulesPosition: 'after-cn' })(cfg());
  const iMy2 = after.rules.findIndex(r => r.includes('myown.com'));
  const iCn2 = after.rules.findIndex(r => r.startsWith('RULE-SET,cn-domain'));
  console.log(`   after-cn       : 订阅@${iMy2 + 1}  cn-domain@${iCn2 + 1}`);
  t('after-cn：CN 分流排在订阅规则之前', iCn2 < iMy2, `my=${iMy2} cn=${iCn2}`);
  t('两种模式下 MATCH 都在最后', after.rules.at(-1) === 'MATCH,节点选择');
}

console.log('\n══ 容差固定 50 ══');
{
  const out = load({})(base({ proxies: [P('HK 1')] }));
  t('地区组 tolerance=50', groupsOf(out)['香港节点'].tolerance === 50);
}

console.log('\n══ P0-1 目标按语义映射 ══');
{
  const out = load({})(base({ proxies: [P('HK 1')], rules: [
    'GEOIP,CN,🎯 全球直连', 'DOMAIN-SUFFIX,ads.example,🛑 广告拦截', 'DOMAIN-SUFFIX,x.example,🛡 应用净化',
    'DOMAIN-SUFFIX,ok.example,🚀 节点选择', 'IP-CIDR,9.9.9.0/24,🌍 国外媒体',
    'DOMAIN-SUFFIX,myads.com,DIRECT', 'DOMAIN-SUFFIX,d.example,🏢 局域网直连',
  ] }));
  const R = out.rules;
  t('全球直连 → DIRECT', R.includes('GEOIP,CN,DIRECT'));
  t('广告拦截 → REJECT', R.includes('DOMAIN-SUFFIX,ads.example,REJECT'));
  t('应用净化 → REJECT', R.includes('DOMAIN-SUFFIX,x.example,REJECT'));
  t('局域网直连 → DIRECT', R.includes('DOMAIN-SUFFIX,d.example,DIRECT'));
  t('节点选择 保持', R.includes('DOMAIN-SUFFIX,ok.example,节点选择'));
  t('国外媒体 → 节点选择', R.includes('IP-CIDR,9.9.9.0/24,节点选择'));
  t('域名含 ads 不误判', R.includes('DOMAIN-SUFFIX,myads.com,DIRECT'));
}

console.log('\n══ P0-2 provider 节点进入地区组 ══');
{
  const withInline = load({})(base({ proxies: [P('🇭🇰 香港 01')], 'proxy-providers': PROVIDER }));
  const hk = groupsOf(withInline)['香港节点'];
  t('地区组挂 use', JSON.stringify(hk.use) === JSON.stringify(['SubA']));
  t('地区组挂 filter', typeof hk.filter === 'string' && hk.filter.length > 0);
  t('地区组保留内联 proxies', JSON.stringify(hk.proxies) === JSON.stringify(['🇭🇰 香港 01']));
  const pure = load({})(base({ proxies: [], 'proxy-providers': PROVIDER }));
  const names = pure['proxy-groups'].map(g => g.name);
  t('纯 provider 下 7 个地区组齐备', ['香港节点','澳门节点','台湾节点','狮城节点','美国节点','日本节点','韩国节点'].every(n => names.includes(n)));
  const other = groupsOf(pure)['其他节点'];
  t('其他节点 exclude-filter 含地区正则', /香港/.test(other['exclude-filter']));
  t('手动选择 在纯 provider 下仍存在', names.includes('手动选择'));
}

console.log('\n══ dialer-proxy 三者并集 + 级联 ══');
{
  for (const [label, providers] of [['无 provider', {}], ['有 provider', PROVIDER]]) {
    const out = load({})(base({ proxies: [
      P('HK 1'), P('A', { 'dialer-proxy': 'SubNodeX' }), P('B', { 'dialer-proxy': 'GHOST' }),
      P('剩余流量 1GB'), P('C', { 'dialer-proxy': '剩余流量 1GB' }),
    ], 'proxy-providers': providers }));
    const n = out.proxies.map(p => p.name);
    console.log(`   [${label}] 保留 = ${JSON.stringify(n)}`);
    t(`${label}: 黑名单节点被剔除`, !n.includes('剩余流量 1GB'));
    t(`${label}: C(指向被剔除节点)被剔除`, !n.includes('C'));
    if (label === '无 provider') t(`${label}: B(指向不存在)被剔除`, !n.includes('B'));
    else { t(`${label}: A(指向provider节点)保留`, n.includes('A')); t(`${label}: B(无法证伪)保留`, n.includes('B')); }
  }
  const out = load({})(base({ proxies: [
    P('HK 1'), P('P', { 'dialer-proxy': 'Q' }), P('Q', { 'dialer-proxy': 'GHOST' }), P('R', { 'dialer-proxy': 'P' }),
  ] }));
  const kn = out.proxies.map(p => p.name);
  console.log('   级联结果:', JSON.stringify(kn));
  t('级联：Q 被剔除', !kn.includes('Q'));
  t('级联：P 被连带剔除', !kn.includes('P'));
  t('级联：R 被连带剔除', !kn.includes('R'));
  t('级联：不相关节点保留', kn.includes('HK 1'));
}

console.log('\n══ 重命名后 dialer-proxy 同步 ══');
{
  const out = load({})(base({ proxies: [P('香港节点'), P('A', { 'dialer-proxy': '香港节点' })] }));
  const a = out.proxies.find(p => p.name === 'A');
  t('撞组名被改名', out.proxies.some(p => p.name === '香港节点 #1'));
  t('dialer-proxy 同步到新名', a && a['dialer-proxy'] === '香港节点 #1', a && a['dialer-proxy']);
  const out2 = load({})(base({ proxies: [P('手动选择'), P('B', { 'dialer-proxy': '手动选择' })] }));
  const b = out2.proxies.find(p => p.name === 'B');
  t('撞「手动选择」组名也被改名', out2.proxies.some(p => p.name === '手动选择 #1'));
  t('并同步 dialer-proxy', b && b['dialer-proxy'] === '手动选择 #1');
}

console.log('\n══ P1-1 AI 组 ══');
{
  const out = load({})(base({ proxies: [P('🇭🇰 香港 01'), P('🇲🇴 澳门 01'), P('🇺🇸 洛杉矶 01'), P('🇯🇵 东京 01')] }));
  const ai = groupsOf(out)['国外AI'];
  t('AI 组无香港', !ai.proxies.includes('香港节点'));
  t('AI 组无澳门', !ai.proxies.includes('澳门节点'));
  t('AI 组美国第一', ai.proxies[0] === '美国节点');
  t('AI 组是 select', ai.type === 'select');
}

console.log('\n══ 黑名单（宽松档）══');
{
  const names = ['低流量倍率节点', '香港 01 高速', '联系节点', 'Traffic-01', '日本 IEPL 流量优化', '套餐A-HK', '距离短-香港', '重置密码节点', '新加坡 01', 'traffic'];
  const out = load({})(base({ proxies: names.map(n => P(n)) }));
  const kept = out.proxies.map(p => p.name);
  console.log('   保留:', JSON.stringify(kept));
  for (const n of ['低流量倍率节点', '联系节点', 'Traffic-01', '日本 IEPL 流量优化', '套餐A-HK', '距离短-香港', '新加坡 01'])
    t(`不误杀「${n}」`, kept.includes(n));
  t('剔除纯 traffic 公告名', !kept.includes('traffic'));
  t('剔除重置密码节点', !kept.includes('重置密码节点'));
}

console.log('\n══ P2-b/c/d/e ══');
{
  const out = load({})(base({ proxies: [P('HK 1')],
    'sub-rules': { 'my-main': ['DOMAIN-SUFFIX,a.com,DIRECT'] },
    rules: ['SUB-RULE,(NETWORK,tcp),my-main', 'SUB-RULE,(NETWORK,udp),压根不存在'] }));
  t('有效 SUB-RULE 保留', out.rules.includes('SUB-RULE,(NETWORK,tcp),my-main'));
  t('悬空 SUB-RULE 被剔除', !out.rules.some(r => r.includes('压根不存在')));

  const num = load({})(base({ proxies: [{ name: 12345, type: 'ss' }, P('🇭🇰 香港 01')] }));
  t('数字型节点名保留', num.proxies.some(p => p.name === '12345'));

  const geo = load({})(base({ proxies: [P('SEA-01'), P('Latin America 1'), P('South America'), P('Central America'), P('America-2'), P('西雅图 SEA'), P('US 洛杉矶')] }));
  const us = groupsOf(geo)['美国节点'].proxies;
  console.log('   美国组:', JSON.stringify(us));
  t('SEA-01 不入美国', !us.includes('SEA-01'));
  t('Latin America 不入美国', !us.includes('Latin America 1'));
  t('South America 不入美国', !us.includes('South America'));
  t('Central America 不入美国', !us.includes('Central America'));
  t('America-2 入美国', us.includes('America-2'));
  t('西雅图 SEA 入美国', us.includes('西雅图 SEA'));

  const flag = load({})(base({ proxies: [P('🇭🇰 01'), P('🇲🇴 01'), P('🇰🇷 01'), P('🇺🇸 01')] }));
  const fn = flag['proxy-groups'].map(g => g.name);
  t('国旗 emoji 四国全中', ['香港节点','澳门节点','韩国节点','美国节点'].every(n => fn.includes(n)));
}

console.log('\n══ 逻辑规则完整性 ══');
{
  const out = load({})(base({ proxies: [P('HK 1')], rules: [
    'AND,((NETWORK,tcp),(DST-PORT,443)),某不存在组',
    'OR,((DOMAIN-SUFFIX,a.com),(DOMAIN-SUFFIX,b.com)),🎯 全球直连',
    'NOT,((DOMAIN-SUFFIX,c.com)),🛑 广告拦截'] }));
  const and = out.rules.find(r => r.startsWith('AND,((NETWORK,tcp)')) || '';
  const or = out.rules.find(r => r.startsWith('OR,')) || '';
  const not = out.rules.find(r => r.startsWith('NOT,')) || '';
  t('AND 结构完整且目标被映射', and.includes('(NETWORK,tcp)') && and.includes('(DST-PORT,443)') && and.endsWith(',节点选择'), and);
  t('OR 结构完整且目标→DIRECT', or.includes('(DOMAIN-SUFFIX,a.com)') && or.endsWith(',DIRECT'), or);
  t('NOT 结构完整且目标→REJECT', not.includes('(DOMAIN-SUFFIX,c.com)') && not.endsWith(',REJECT'), not);
  const noTarget = load({})(base({ proxies: [P('HK 1')], rules: ['AND,((NETWORK,tcp),(DST-PORT,443))'] }));
  t('AND 无目标段时原样保留', noTarget.rules.some(r => r === 'AND,((NETWORK,tcp),(DST-PORT,443))'));
}

console.log('\n══ 回归 ══');
{
  const out = load({})(base({ proxies: [P('🇭🇰 香港 01'), P('🇭🇰 香港 01'), P('DIRECT'), P('香港节点'), P('剩余流量')] }));
  const n = out.proxies.map(p => p.name);
  t('重名节点改名保留', n.includes('🇭🇰 香港 01') && n.includes('🇭🇰 香港 01 #1'));
  t('内建名撞名改名', n.includes('DIRECT #1'));
  t('组名撞名改名', n.includes('香港节点 #1'));
  t('黑名单生效', !n.includes('剩余流量'));

  const rp = load({})(base({ proxies: [P('HK 1')],
    'rule-providers': { 'sub-only': { type: 'http', format: 'yaml', behavior: 'domain', url: 'https://e.com/r.yaml', path: './r.yaml' } },
    rules: ['RULE-SET,sub-only,DIRECT'] }));
  t('订阅 provider 保留', 'sub-only' in rp['rule-providers']);
  t('订阅规则保留', rp.rules.includes('RULE-SET,sub-only,DIRECT'));
  t('自带 11 个 provider 全部声明', Object.keys(rp['rule-providers']).length === 12, String(Object.keys(rp['rule-providers']).length));

  let threw = null;
  try { load({})(base({ proxies: [P('剩余流量')] })); } catch (e) { threw = e.message; }
  t('无有效节点且无 providers 时报错', !!threw);
  t('无节点但有 providers 不报错', load({})(base({ proxies: [], 'proxy-providers': PROVIDER }))['proxy-groups'].length > 0);

  const once = load({})(base({ proxies: [P('🇭🇰 香港 01'), P('🇭🇰 香港 01')] }));
  const twice = load({})(once);
  t('幂等', JSON.stringify(once.proxies.map(p => p.name)) === JSON.stringify(twice.proxies.map(p => p.name)));

  let noCrash = true, msg = '';
  for (const bad of [undefined, null, 'a,b,c', { x: 1 }]) {
    try { load({})(base({ proxies: [P('HK 1')], rules: bad })); } catch (e) { noCrash = false; msg = `${JSON.stringify(bad)} -> ${e.message}`; }
  }
  t('config.rules 非数组时不崩', noCrash, msg);
}

console.log(`\n════════════════ ${pass} passed, ${fail} failed ════════════════`);
process.exit(fail ? 1 : 0);

