function main(config) {
  const options = {
    filterKeywords: true,
    filterHighRate: true,
    maxRate: 1.5,
    autoTest: false,
    remoteDirect: true,
    blockQuic: true,
  };

  const blacklistRe = /群|邀请|返利|官网|官方(?:网|群|通知|公告)|网址|订阅|购买|续费|到期|过期|邮箱|客服|工单|倒卖|失联|梯子|发布页|备用|重置|剩余|延迟\s*[≠=!<>]+\s*速度|(?:^|[^A-Za-z])traffic(?!\S)|(?:^|[^A-Za-z])expire(?!\S)/i;
  const rateRe = /(?<![A-Za-z])[xX✕✖⨉×]\s*(\d+(?:\.\d+)?)|(?<![\dA-Za-z.])(\d+(?:\.\d+)?)\s*[xX✕✖⨉×倍](?![A-Za-z\d])|倍率[:：\s]*(\d+(?:\.\d+)?)/;

  const toCaseInsensitive = (regex) => `(?i)(?:${regex.source})`;
  const getRate = (name) => {
    const match = rateRe.exec(name);
    return match ? parseFloat(match[1] ?? match[2] ?? match[3]) : 1;
  };

  const providerNames = Object.keys(config['proxy-providers'] || {});
  const hasProviders = providerNames.length > 0;

  const rawProxies = (Array.isArray(config.proxies) ? config.proxies : [])
    .filter((proxy) => proxy && typeof proxy === 'object' && proxy.name !== undefined && proxy.name !== null)
    .map((proxy) => {
      if (typeof proxy.name !== 'string') proxy.name = String(proxy.name);
      proxy.name = proxy.name.trim();
      return proxy;
    })
    .filter((proxy) => proxy.name);

  if (!rawProxies.length && !hasProviders) {
    throw new Error('无有效代理节点,请检查订阅配置(订阅本身没有节点)');
  }

  const removedNames = new Set();
  let proxies = rawProxies.filter((proxy) => {
    if (options.filterKeywords && blacklistRe.test(proxy.name)) {
      removedNames.add(proxy.name);
      return false;
    }
    return true;
  });

  const highRateSet = new Set();
  proxies.forEach((proxy) => {
    if (options.filterHighRate && getRate(proxy.name) > options.maxRate) {
      highRateSet.add(proxy);
    }
  });

  {
    let changed = true;
    while (changed) {
      const names = new Set(proxies.map((proxy) => proxy.name));
      const nextProxies = proxies.filter((proxy) => {
        const dialerProxy = proxy['dialer-proxy'];
        if (!dialerProxy) return true;
        return hasProviders ? !removedNames.has(dialerProxy) : names.has(dialerProxy);
      });
      changed = nextProxies.length !== proxies.length;
      if (changed) {
        const keptNext = new Set(nextProxies);
        proxies.forEach((proxy) => {
          if (!keptNext.has(proxy)) removedNames.add(proxy.name);
        });
      }
      proxies = nextProxies;
    }
  }

  const keptSet = new Set(proxies);

  const buildRegionRe = (cn, en, codes, flags) =>
    new RegExp(`${cn}|${en}|(?<![A-Za-z])(?:${codes})(?![A-Za-z])${flags ? `|${flags}` : ''}`, 'i');

  const regionConfigs = [
    [
      '美国节点',
      buildRegionRe(
        '美国|美西|美东|纽约|洛杉矶|旧金山|圣何塞|硅谷|西雅图|芝加哥|达拉斯',
        'United[\\s_-]*States|(?<!Latin[\\s_-])(?<!South[\\s_-])(?<!Central[\\s_-])America|New[\\s_-]*York|Los[\\s_-]*Angeles|San[\\s_-]*Francisco|San[\\s_-]*Jose|Silicon[\\s_-]*Valley|Seattle|Chicago|Dallas',
        'US|USA|LAX|SFO|SJC|ORD|DFW',
        '🇺🇸'
      ),
      'United_States.png',
    ],
    ['日本节点', buildRegionRe('日本|东京|大阪|埼玉', 'Japan|Tokyo|Osaka|Saitama', 'JP|JPN|TYO|NRT|KIX', '🇯🇵'), 'Japan.png'],
    ['狮城节点', buildRegionRe('新加坡|狮城', 'Singapore', 'SG|SGP|SIN', '🇸🇬'), 'Singapore.png'],
    ['香港节点', buildRegionRe('香港', 'Hong[\\s_-]*Kong', 'HK|HKG', '🇭🇰'), 'Hong_Kong.png'],
    ['台湾节点', buildRegionRe('台湾|台北|新北|彰化|台中|高雄', 'Taiwan|Taipei', 'TW|TWN|TPE', '🇹🇼'), 'Taiwan.png'],
  ];

  const allNodesName = '全部节点';
  const builtinNames = new Set(['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS', 'COMPATIBLE', 'GLOBAL']);
  const reservedNames = new Set([
    ...builtinNames,
    '节点选择',
    '其他节点',
    allNodesName,
    '手动选择',
    '手动切换',
    '自动选择',
    ...regionConfigs.map((region) => region[0]),
  ]);
  const usedNames = new Set(reservedNames);

  const renameMap = new Map();
  const allProxies = rawProxies.map((proxy) => {
    const baseName = proxy.name;
    let name = baseName;
    let suffix = 0;
    while (usedNames.has(name)) name = `${baseName} #${++suffix}`;
    usedNames.add(name);
    if (name !== baseName && reservedNames.has(baseName) && !builtinNames.has(baseName) && !renameMap.has(baseName)) {
      renameMap.set(baseName, name);
    }
    proxy.name = name;
    return proxy;
  });

  allProxies.forEach((proxy) => {
    const dialerProxy = proxy['dialer-proxy'];
    if (dialerProxy && renameMap.has(dialerProxy)) {
      proxy['dialer-proxy'] = renameMap.get(dialerProxy);
    }
  });

  const processedProxies = allProxies.filter((proxy) => keptSet.has(proxy));

  const matchedNames = new Set();
  const regions = regionConfigs
    .map(([name, regex, icon]) => {
      const matched = processedProxies
        .filter((proxy) => !highRateSet.has(proxy) && !matchedNames.has(proxy.name) && regex.test(proxy.name))
        .map((proxy) => proxy.name);
      matched.forEach((proxyName) => matchedNames.add(proxyName));
      return matched.length || hasProviders ? { name, icon, regex, proxies: matched } : null;
    })
    .filter(Boolean);

  const otherProxies = processedProxies
    .filter((proxy) => !highRateSet.has(proxy) && !matchedNames.has(proxy.name))
    .map((proxy) => proxy.name);
  const otherGroupNames = otherProxies.length || hasProviders ? ['其他节点'] : [];
  const regionNames = regions.map((region) => region.name);

  const iconBaseUrl = 'https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/';
  const regionExcludeParts = regionConfigs.map((region) => `(?:${region[1].source})`).join('|');
  const otherExcludeFilter = options.filterKeywords
    ? `${toCaseInsensitive(blacklistRe)}|${regionExcludeParts}`
    : `(?i)(?:${regionExcludeParts})`;

  const healthCheckConfig = {
    url: 'https://www.gstatic.com/generate_204',
    interval: 300,
    lazy: true,
  };

  const regionGroupConfig = options.autoTest
    ? {
        type: 'url-test',
        ...healthCheckConfig,
        tolerance: 50,
      }
    : {
        type: 'select',
        ...healthCheckConfig,
      };

  const allNodesGroup = {
    name: allNodesName,
    icon: `${iconBaseUrl}Available.png`,
    type: 'select',
    'include-all': true,
  };

  config['proxy-groups'] = [
    {
      name: '节点选择',
      icon: `${iconBaseUrl}Proxy.png`,
      type: 'select',
      proxies: [...regionNames, ...otherGroupNames, allNodesName],
    },
    ...regions.map((group) => ({
      name: group.name,
      icon: `${iconBaseUrl}${group.icon}`,
      ...regionGroupConfig,
      ...(group.proxies.length ? { proxies: group.proxies } : {}),
      ...(hasProviders
        ? {
            use: providerNames,
            filter: toCaseInsensitive(group.regex),
            ...(options.filterKeywords ? { 'exclude-filter': toCaseInsensitive(blacklistRe) } : {}),
          }
        : {}),
    })),
    ...(otherGroupNames.length
      ? [
          {
            name: '其他节点',
            icon: `${iconBaseUrl}Final.png`,
            ...regionGroupConfig,
            ...(otherProxies.length ? { proxies: otherProxies } : {}),
            ...(hasProviders ? { use: providerNames, 'exclude-filter': otherExcludeFilter } : {}),
          },
        ]
      : []),
    allNodesGroup,
    {
      name: 'GLOBAL',
      icon: `${iconBaseUrl}Global.png`,
      type: 'select',
      hidden: true,
      proxies: ['节点选择', ...regionNames, ...otherGroupNames, allNodesName],
    },
  ];

  config['unified-delay'] = true;
  config['tcp-concurrent'] = true;
  config.ipv6 = true;
  config['geodata-loader'] = 'memconservative';

  config.dns = {
    enable: true,
    ipv6: true,
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

  config.hosts = {
    ...(config.hosts || {}),
    'services.googleapis.cn': 'services.googleapis.com',
    '+.mcdn.bilivideo.com': '0.0.0.0',
    '+.mcdn.bilivideo.cn': '0.0.0.0',
    '+.edge.mountaintoys.cn': '0.0.0.0',
    '+.h2.smtcdns.net': '0.0.0.0',
  };

  config.ntp = {
    enable: true,
    server: 'ntp.aliyun.com',
    port: 123,
    interval: 30,
    'write-to-system': false,
  };

  config.sniffer = {
    enable: true,
    'force-dns-mapping': true,
    'parse-pure-ip': true,
    'override-destination': true,
    'skip-domain': ['+.mijia.io', '+.push.apple.com'],
    sniff: {
      TLS: { ports: [443, 8443] },
      HTTP: { ports: [80, '8080-8880'] },
    },
  };

  const mrsBaseUrl = 'https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/';
  const createMrsProvider = (behavior, url, path) => ({
    type: 'http',
    format: 'mrs',
    behavior,
    interval: 86400,
    url,
    path,
  });

  const ownProviders = {
    adblock: createMrsProvider('domain', 'https://fastly.jsdelivr.net/gh/217heidai/adblockfilters@main/rules/adblockmihomolite.mrs', './ruleset/adblockmihomolite.mrs'),
    'microsoft-cn': createMrsProvider('domain', `${mrsBaseUrl}geosite/microsoft@cn.mrs`, './ruleset/microsoft_cn.mrs'),
    microsoft: createMrsProvider('domain', `${mrsBaseUrl}geosite/microsoft.mrs`, './ruleset/microsoft.mrs'),
    google: createMrsProvider('domain', `${mrsBaseUrl}geosite/google.mrs`, './ruleset/google.mrs'),
    'category-ai': createMrsProvider('domain', `${mrsBaseUrl}geosite/category-ai-!cn.mrs`, './ruleset/category-ai-not-cn.mrs'),
    telegram: createMrsProvider('domain', `${mrsBaseUrl}geosite/telegram.mrs`, './ruleset/telegram.mrs'),
    httpdns: createMrsProvider('domain', `${mrsBaseUrl}geosite/category-httpdns-cn.mrs`, './ruleset/httpdns.mrs'),
    'telegram-ip': createMrsProvider('ipcidr', `${mrsBaseUrl}geoip/telegram.mrs`, './ruleset/telegram_ip.mrs'),
    'google-fcm': createMrsProvider('domain', `${mrsBaseUrl}geosite/googlefcm.mrs`, './ruleset/googlefcm.mrs'),
    'cn-domain': createMrsProvider('domain', `${mrsBaseUrl}geosite/cn.mrs`, './ruleset/cn_domain.mrs'),
    'cn-ip': createMrsProvider('ipcidr', `${mrsBaseUrl}geoip/cn.mrs`, './ruleset/cn_ip.mrs'),
  };
  const ownProviderNames = new Set(Object.keys(ownProviders));

  const subProviders = Object.fromEntries(
    Object.entries(config['rule-providers'] || {}).filter(([key]) => !ownProviderNames.has(key))
  );
  config['rule-providers'] = { ...subProviders, ...ownProviders };

  const refsOwnProvider = (rule) => {
    for (const match of rule.matchAll(/RULE-SET\s*,\s*([^,()\s]+)/gi)) {
      if (ownProviderNames.has(match[1])) return true;
    }
    return false;
  };

  const prefixRules = ['GEOSITE,private,DIRECT', 'GEOIP,private,DIRECT,no-resolve'];
  if (options.remoteDirect) {
    prefixRules.push('DST-PORT,5938,DIRECT', 'DST-PORT,7070,DIRECT', 'DST-PORT,21114-21119,DIRECT');
  }

  const quicRules = options.blockQuic
    ? ['AND,((NETWORK,udp),(DST-PORT,443),(NOT,((RULE-SET,cn-domain))),(NOT,((RULE-SET,cn-ip)))),REJECT']
    : [];

  const validTargets = new Set([
    ...builtinNames,
    ...config['proxy-groups'].map((group) => group.name),
    ...allProxies.map((proxy) => proxy.name),
  ]);

  const knownSubRules = new Set(Object.keys(config['sub-rules'] || {}));
  const rejectRe = /拦截|广告|屏蔽|净化|追踪|reject|adblock|\bads?\b/i;
  const directRe = /直连|国内|局域网|本地|domestic|direct|lan\b/i;
  const ruleFlags = new Set(['no-resolve', 'src']);

  const mapTarget = (target) => {
    const trimmedTarget = String(target).trim();
    if (validTargets.has(trimmedTarget)) return trimmedTarget;
    if (rejectRe.test(trimmedTarget)) return 'REJECT';
    if (directRe.test(trimmedTarget)) return 'DIRECT';
    return '节点选择';
  };

  const remapRule = (rule, isSubRule) => {
    if (typeof rule !== 'string') return null;
    const trimmedRule = rule.trim();
    if (!trimmedRule) return null;

    if (/^(AND|OR|NOT),/i.test(trimmedRule)) {
      const lastCommaIndex = trimmedRule.lastIndexOf(',');
      if (lastCommaIndex < 0) return trimmedRule;
      const target = trimmedRule.slice(lastCommaIndex + 1).trim();
      if (!target || target.endsWith(')')) return trimmedRule;
      const mappedTarget = mapTarget(target);
      return mappedTarget === target ? trimmedRule : `${trimmedRule.slice(0, lastCommaIndex + 1)}${mappedTarget}`;
    }

    if (!isSubRule && refsOwnProvider(trimmedRule)) return null;

    if (/^MATCH,/i.test(trimmedRule)) {
      if (!isSubRule) return null;
      const matchParts = trimmedRule.split(',').map((part) => part.trim());
      if (matchParts.length >= 2) matchParts[1] = mapTarget(matchParts[1]);
      return matchParts.join(',');
    }

    if (/^SUB-RULE,/i.test(trimmedRule)) {
      const match = trimmedRule.match(/^SUB-RULE\s*,\s*\([^)]*\)\s*,\s*([^,]+)/i);
      if (match && !knownSubRules.has(match[1].trim()) && !validTargets.has(match[1].trim())) return null;
      return trimmedRule;
    }

    const parts = trimmedRule.split(',').map((part) => part.trim());
    if (parts.length < 3) return trimmedRule;

    let targetIndex = parts.length - 1;
    while (targetIndex > 0 && ruleFlags.has(parts[targetIndex].toLowerCase())) targetIndex--;
    if (targetIndex < 1) return trimmedRule;

    const mappedTarget = mapTarget(parts[targetIndex]);
    if (mappedTarget === parts[targetIndex]) return trimmedRule;
    parts[targetIndex] = mappedTarget;
    return parts.join(',');
  };

  const mappedRules = (Array.isArray(config.rules) ? config.rules : [])
    .map((rule) => remapRule(rule, false))
    .filter((rule) => rule !== null);

  if (config['sub-rules'] && typeof config['sub-rules'] === 'object') {
    config['sub-rules'] = Object.fromEntries(
      Object.entries(config['sub-rules']).map(([key, list]) => [
        key,
        Array.isArray(list) ? list.map((rule) => remapRule(rule, true)).filter((rule) => rule !== null) : list,
      ])
    );
  }

  config.rules = [
    ...prefixRules,
    'RULE-SET,adblock,REJECT',
    'RULE-SET,httpdns,REJECT',
    ...quicRules,
    'RULE-SET,microsoft-cn,DIRECT',
    'RULE-SET,category-ai,节点选择',
    'RULE-SET,telegram,节点选择',
    'RULE-SET,telegram-ip,节点选择,no-resolve',
    'RULE-SET,google-fcm,节点选择',
    'RULE-SET,microsoft,节点选择',
    'RULE-SET,google,节点选择',
    'RULE-SET,cn-domain,DIRECT',
    'RULE-SET,cn-ip,DIRECT,no-resolve',
    ...mappedRules,
    'MATCH,节点选择',
  ];

  config.proxies = allProxies;
  return config;
}
