function main(config) {

  const OPTIONS = {

    remoteDirect: true,
    blockQuic: true,

    subRulesPosition: 'before-cn',

    filterHighRate: true,
    maxRate: 1.5,

    lanShareDns: false,

    dnsIpv6: 'auto',

    aiBlockedRegions: ['香港节点', '澳门节点'],
  };

  const blackRe = /群|邀请|返利|官网|官方(?:网|群|通知|公告)|网址|订阅|购买|续费|到期|过期|邮箱|客服|工单|倒卖|失联|梯子|发布页|备用|重置|剩余|(?:^|[^A-Za-z])traffic(?!\S)|(?:^|[^A-Za-z])expire(?!\S)/i;

  const F = (re) => `(?i)(?:${re.source})`;

  const rateRe = /(?<![A-Za-z])[xX✕✖⨉×]\s*(\d+(?:\.\d+)?)|(?<![\dA-Za-z.])(\d+(?:\.\d+)?)\s*[xX✕✖⨉×倍](?![A-Za-z\d])|倍率[:：\s]*(\d+(?:\.\d+)?)/;
  const getRate = (name) => {
    const m = rateRe.exec(name);
    return m ? parseFloat(m[1] ?? m[2] ?? m[3]) : 1;
  };

  const providerNames = Object.keys(config['proxy-providers'] || {});
  const hasProviders = providerNames.length > 0;

  const rawProxies = (Array.isArray(config.proxies) ? config.proxies : [])
    .filter((p) => p && typeof p === 'object' && p.name !== undefined && p.name !== null)
    .map((p) => {
      if (typeof p.name !== 'string') p.name = String(p.name);
      p.name = p.name.trim();
      return p;
    })
    .filter((p) => p.name);

  const removedNames = new Set();

  let proxies = rawProxies.filter((p) => {
    if (blackRe.test(p.name)) {
      removedNames.add(p.name);
      return false;
    }
    return true;
  });

  const isHighRate = (p) => OPTIONS.filterHighRate && getRate(p.name) > OPTIONS.maxRate;
  proxies.forEach((p) => { p.__highRate = isHighRate(p); });

  {
    let changed = true;
    while (changed) {
      const names = new Set(proxies.map((p) => p.name));
      const next = proxies.filter((p) => {
        const dp = p['dialer-proxy'];
        if (!dp) return true;
        return hasProviders ? !removedNames.has(dp) : names.has(dp);
      });
      changed = next.length !== proxies.length;
      if (changed) {
        const keep = new Set(next);
        proxies.forEach((p) => { if (!keep.has(p)) removedNames.add(p.name); });
      }
      proxies = next;
    }
  }

  if (!proxies.length && !hasProviders) {
    throw new Error('无有效代理节点,请检查订阅配置(内联 proxies 均被过滤,或订阅本身没有节点)');
  }

  const mk = (cn, en, codes, flags) =>
    new RegExp(`${cn}|${en}|(?<![A-Za-z])(?:${codes})(?![A-Za-z])${flags ? `|${flags}` : ''}`, 'i');

  const REGIONS = [
    ['香港节点', mk('香港', 'Hong\\s?Kong', 'HK|HKG', '🇭🇰'), 'Hong_Kong.png'],
    ['澳门节点', mk('澳门', 'Macau|Macao', 'MO|MAC', '🇲🇴'), 'Macao.png'],
    ['台湾节点', mk('台湾|台北', 'Taiwan|Taipei', 'TW|TWN|TPE', '🇹🇼'), 'Taiwan.png'],
    ['狮城节点', mk('新加坡|狮城', 'Singapore', 'SG|SGP|SIN', '🇸🇬'), 'Singapore.png'],
    [
      '美国节点',

      mk(
        '美国|纽约|洛杉矶|旧金山|圣何塞|西雅图|芝加哥|达拉斯',
        'United\\s?States|(?<!Latin\\s)(?<!South\\s)(?<!Central\\s)America|New\\s?York|Los\\s?Angeles|San\\s?Jose|Seattle|Chicago|Dallas',
        'US|USA|LAX|SFO|SJC|ORD|DFW',
        '🇺🇸'
      ),
      'United_States.png',
    ],
    ['日本节点', mk('日本|东京|大阪', 'Japan|Tokyo|Osaka', 'JP|JPN|TYO|NRT|KIX', '🇯🇵'), 'Japan.png'],
    ['韩国节点', mk('韩国|首尔', 'Korea|Seoul', 'KR|KOR|SEL', '🇰🇷'), 'Korea.png'],
  ];

  const BUILTIN_NAMES = new Set(['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS', 'COMPATIBLE', 'GLOBAL']);
  const reservedNames = new Set([
    ...BUILTIN_NAMES,
    '节点选择', '其他节点', '国外AI', 'Telegram',
    '手动选择',
    '手动切换',

    '自动选择',
    ...REGIONS.map((r) => r[0]),
  ]);
  const usedNames = new Set(reservedNames);

  const renameMap = new Map();
  const processedProxies = proxies.map((p) => {
    const base = p.name;
    let name = base;
    let i = 0;
    while (usedNames.has(name)) name = `${base} #${++i}`;
    usedNames.add(name);

    if (name !== base && reservedNames.has(base) && !BUILTIN_NAMES.has(base) && !renameMap.has(base)) {
      renameMap.set(base, name);
    }
    p.name = name;
    return p;
  });

  processedProxies.forEach((p) => {
    const dp = p['dialer-proxy'];
    if (dp && renameMap.has(dp)) p['dialer-proxy'] = renameMap.get(dp);
  });

  const matchedNames = new Set();
  const regions = REGIONS.map(([name, re, icon]) => {
    const matched = processedProxies

      .filter((p) => !p.__highRate && !matchedNames.has(p.name) && re.test(p.name))
      .map((p) => p.name);
    matched.forEach((n) => matchedNames.add(n));

    return matched.length || hasProviders ? { name, icon, re, proxies: matched } : null;
  }).filter(Boolean);

  const otherProxies = processedProxies
    .filter((p) => !p.__highRate && !matchedNames.has(p.name))
    .map((p) => p.name);
  const OTHER = otherProxies.length || hasProviders ? ['其他节点'] : [];
  const regionNames = regions.map((r) => r.name);

  const promote = (list, first) =>
    list.includes(first) ? [first, ...list.filter((n) => n !== first)] : [...list];

  const MANUAL_SELECT = '手动选择';

  const aiBlocked = new Set(OPTIONS.aiBlockedRegions);
  const aiRegionNames = regionNames.filter((n) => !aiBlocked.has(n));
  const aiBase = aiRegionNames.length || OTHER.length ? aiRegionNames : regionNames;

  const aiProxies = [...promote(aiBase, '美国节点'), ...OTHER, MANUAL_SELECT];
  const tgProxies = [...promote(regionNames, '狮城节点'), ...OTHER, MANUAL_SELECT];

  const ICON_BASE_URL = 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/';

  const autoSpeedConfig = {
    type: 'url-test',
    url: 'https://www.gstatic.com/generate_204',
    interval: 300,
    tolerance: 50,
    lazy: true,
  };

  const otherExcludeFilter = `${F(blackRe)}|${REGIONS.map((r) => `(?:${r[1].source})`).join('|')}`;

  const manualGroup = {
    name: MANUAL_SELECT,

    icon: `${ICON_BASE_URL}Available.png`,
    type: 'select',
    'include-all': true,
    'exclude-filter': F(blackRe),
  };

  config['proxy-groups'] = [
    {
      name: '节点选择',
      icon: `${ICON_BASE_URL}Proxy.png`,
      type: 'select',
      proxies: [...regionNames, ...OTHER, MANUAL_SELECT, 'DIRECT'],
    },

    manualGroup,
    ...regions.map((g) => ({
      name: g.name,
      icon: `${ICON_BASE_URL}${g.icon}`,
      ...autoSpeedConfig,
      ...(g.proxies.length ? { proxies: g.proxies } : {}),

      ...(hasProviders ? { use: providerNames, filter: F(g.re), 'exclude-filter': F(blackRe) } : {}),
    })),
    ...(OTHER.length
      ? [{
          name: '其他节点',

          icon: `${ICON_BASE_URL}Final.png`,
          ...autoSpeedConfig,
          ...(otherProxies.length ? { proxies: otherProxies } : {}),
          ...(hasProviders ? { use: providerNames, 'exclude-filter': otherExcludeFilter } : {}),
        }]
      : []),
    {
      name: '国外AI',
      icon: `${ICON_BASE_URL}ChatGPT.png`,

      type: 'select',
      proxies: aiProxies,
    },
    { name: 'Telegram', icon: `${ICON_BASE_URL}Telegram.png`, type: 'select', proxies: tgProxies },
    {
      name: 'GLOBAL',
      icon: `${ICON_BASE_URL}Global.png`,
      type: 'select',
      proxies: ['节点选择', MANUAL_SELECT, '国外AI', 'Telegram', ...regionNames, ...OTHER, 'DIRECT'],
    },
  ];

  config['dns'] = {
    ...(config['dns'] || {}),
    enable: true,
    listen: OPTIONS.lanShareDns ? '0.0.0.0:1053' : '127.0.0.1:1053',
    ipv6: OPTIONS.dnsIpv6 === 'auto' ? config.ipv6 === true : !!OPTIONS.dnsIpv6,
    'use-hosts': true,
    'use-system-hosts': true,
    'respect-rules': true,
    'prefer-h3': false,
    'cache-algorithm': 'arc',
    'enhanced-mode': 'fake-ip',
    'fake-ip-range': '198.18.0.1/16',
    'fake-ip-filter': [
      '*.lan',
      '*.localdomain',
      '*.localhost',
      '*.local',
      'localhost.ptlogin2.qq.com',
      '+.msftconnecttest.com',
      '+.msftncsi.com',
      'time.*.com',
      'time.*.gov',
      'ntp.*.com',
      '+.pool.ntp.org',
      'geosite:private',
      'geosite:cn',
      'stun.*',
      '+.stun.*',
      'lens.l.google.com',
    ],
    'default-nameserver': ['223.5.5.5', '119.29.29.29'],
    'direct-nameserver': ['223.5.5.5', '119.29.29.29'],
    'proxy-server-nameserver': ['223.5.5.5', '119.29.29.29'],
    nameserver: ['https://dns.google/dns-query', 'https://cloudflare-dns.com/dns-query'],
    'nameserver-policy': {
      'geosite:private': ['system'],
      'geosite:cn': ['https://doh.pub/dns-query', 'https://dns.alidns.com/dns-query'],
    },
  };

  config['sniffer'] = {
    enable: true,
    'force-dns-mapping': true,
    'parse-pure-ip': true,
    'override-destination': true,
    'skip-domain': ['+.mijia.io', '+.push.apple.com'],
    sniff: { TLS: { ports: [443, 8443] }, HTTP: { ports: [80, '8080-8880'] } },
  };

  const MRS_BASE = 'https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/';
  const mrs = (behavior, url, path) => ({ type: 'http', format: 'mrs', behavior, interval: 86400, url, path });
  const ownProviders = {
    adblock: mrs('domain', 'https://fastly.jsdelivr.net/gh/217heidai/adblockfilters@main/rules/adblockmihomolite.mrs', './ruleset/adblockmihomolite.mrs'),
    'microsoft-cn': mrs('domain', `${MRS_BASE}geosite/microsoft@cn.mrs`, './ruleset/microsoft_cn.mrs'),
    microsoft: mrs('domain', `${MRS_BASE}geosite/microsoft.mrs`, './ruleset/microsoft.mrs'),
    google: mrs('domain', `${MRS_BASE}geosite/google.mrs`, './ruleset/google.mrs'),
    'category-ai': mrs('domain', `${MRS_BASE}geosite/category-ai-!cn.mrs`, './ruleset/category-ai-not-cn.mrs'),
    telegram: mrs('domain', `${MRS_BASE}geosite/telegram.mrs`, './ruleset/telegram.mrs'),
    httpdns: mrs('domain', `${MRS_BASE}geosite/category-httpdns-cn.mrs`, './ruleset/httpdns.mrs'),
    'telegram-ip': mrs('ipcidr', `${MRS_BASE}geoip/telegram.mrs`, './ruleset/telegram_ip.mrs'),
    'google-fcm': mrs('domain', `${MRS_BASE}geosite/googlefcm.mrs`, './ruleset/googlefcm.mrs'),
    'cn-domain': mrs('domain', `${MRS_BASE}geosite/cn.mrs`, './ruleset/cn_domain.mrs'),
    'cn-ip': mrs('ipcidr', `${MRS_BASE}geoip/cn.mrs`, './ruleset/cn_ip.mrs'),
  };
  const ownProviderNames = new Set(Object.keys(ownProviders));

  const subProviders = Object.fromEntries(
    Object.entries(config['rule-providers'] || {}).filter(([k]) => !ownProviderNames.has(k))
  );
  config['rule-providers'] = { ...subProviders, ...ownProviders };

  const MI_GROUPS = new Set(['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS', 'COMPATIBLE', 'GLOBAL']);

  const refsOwnProvider = (r) => {
    for (const m of r.matchAll(/RULE-SET\s*,\s*([^,()\s]+)/gi)) {
      if (ownProviderNames.has(m[1])) return true;
    }
    return false;
  };

  const prefixRules = ['GEOSITE,private,DIRECT', 'GEOIP,private,DIRECT,no-resolve'];
  if (OPTIONS.remoteDirect) {
    prefixRules.push('DST-PORT,5938,DIRECT', 'DST-PORT,7070,DIRECT', 'DST-PORT,21114-21119,DIRECT');
  }

  const quicRules = OPTIONS.blockQuic
    ? ['AND,((NETWORK,udp),(DST-PORT,443),(NOT,((RULE-SET,cn-domain))),(NOT,((RULE-SET,cn-ip)))),REJECT']
    : [];

  const validTargets = new Set([
    ...MI_GROUPS,
    ...config['proxy-groups'].map((g) => g.name),
    ...processedProxies.map((p) => p.name),
  ]);

  const knownSubRules = new Set(Object.keys(config['sub-rules'] || {}));

  const REJECT_RE = /拦截|广告|屏蔽|净化|追踪|reject|adblock|\bads?\b/i;
  const DIRECT_RE = /直连|国内|局域网|本地|domestic|direct|lan\b/i;
  const mapTarget = (t) => {
    const v = String(t).trim();
    if (validTargets.has(v)) return v;
    if (REJECT_RE.test(v)) return 'REJECT';
    if (DIRECT_RE.test(v)) return 'DIRECT';
    return '节点选择';
  };

  const RULE_FLAGS = new Set(['no-resolve', 'src']);

  const remapRule = (r, isSub) => {
    if (typeof r !== 'string') return null;
    const s = r.trim();
    if (!s) return null;

    if (/^(AND|OR|NOT),/i.test(s)) {
      const cut = s.lastIndexOf(',');
      if (cut < 0) return s;
      const target = s.slice(cut + 1).trim();
      if (!target || target.endsWith(')')) return s;
      const mapped = mapTarget(target);
      return mapped === target ? s : `${s.slice(0, cut + 1)}${mapped}`;
    }

    if (!isSub && refsOwnProvider(s)) return null;

    if (/^MATCH,/i.test(s)) {
      if (!isSub) return null;
      const p2 = s.split(',').map((x) => x.trim());
      if (p2.length >= 2) p2[1] = mapTarget(p2[1]);
      return p2.join(',');
    }

    if (/^SUB-RULE,/i.test(s)) {
      const m = s.match(/^SUB-RULE\s*,\s*\([^)]*\)\s*,\s*([^,]+)/i);
      if (m && !knownSubRules.has(m[1].trim()) && !validTargets.has(m[1].trim())) return null;
      return s;
    }

    const parts = s.split(',').map((x) => x.trim());
    if (parts.length < 3) return s;

    let idx = parts.length - 1;
    while (idx > 0 && RULE_FLAGS.has(parts[idx].toLowerCase())) idx--;
    if (idx < 1) return s;

    const t = mapTarget(parts[idx]);
    if (t === parts[idx]) return s;
    parts[idx] = t;
    return parts.join(',');
  };

  const mappedRules = (Array.isArray(config.rules) ? config.rules : [])
    .map((r) => remapRule(r, false))
    .filter((r) => r !== null);

  if (config['sub-rules'] && typeof config['sub-rules'] === 'object') {
    config['sub-rules'] = Object.fromEntries(
      Object.entries(config['sub-rules']).map(([k, list]) => [
        k,
        Array.isArray(list) ? list.map((r) => remapRule(r, true)).filter((r) => r !== null) : list,
      ])
    );
  }

  const subFirst = OPTIONS.subRulesPosition !== 'after-cn';

  config.rules = [
    ...prefixRules,
    'RULE-SET,adblock,REJECT',
    'RULE-SET,httpdns,REJECT',
    ...quicRules,
    'RULE-SET,microsoft-cn,DIRECT',
    'RULE-SET,category-ai,国外AI',
    'RULE-SET,telegram,Telegram',
    'RULE-SET,telegram-ip,Telegram,no-resolve',
    'RULE-SET,google-fcm,节点选择',
    'RULE-SET,microsoft,节点选择',
    'RULE-SET,google,节点选择',
    ...(subFirst ? mappedRules : []),
    'RULE-SET,cn-domain,DIRECT',
    'RULE-SET,cn-ip,DIRECT,no-resolve',
    ...(subFirst ? [] : mappedRules),
    'MATCH,节点选择',
  ];

  config.proxies = processedProxies;
  return config;
}
