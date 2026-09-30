/**
 * FLClash 覆写脚本 —— 合并版参考实现（候选 scripts-core）
 *
 * 设计目标：把 scripts1~scripts20 的能力收敛为「一个内核 + 少量档位」。
 * 只保留经过实战验证的逻辑，并修掉历史脚本里的已知缺陷。
 *
 * 档位由文件顶部的 CONFIG 控制，使用者只需改这里，不用再挑脚本。
 */
function main(config) {
  // ============================ 档位开关 ============================
  const CONFIG = {
    // 节点名过滤（黑名单关键词）：scripts3~20 的公共能力
    filterNames: true,
    // 倍率过滤：只保留 <= maxRatio 的节点（scripts7~15 的能力）
    filterRatio: true,
    maxRatio: 3.0,
    // 地区分组类型："url-test" 自动测速 / "select" 纯手动
    // 注意：scripts18~20 声称"节点自动测速"，但写的是 type:"select"，
    //       interval/lazy 对 select 组无效 —— 测速实际从未生效。这里用显式开关修掉。
    regionGroupType: "url-test",
    // 是否保留「手动切换」组（可逐个选节点）：scripts3~15 有，scripts16+ 丢失的能力
    manualSwitchGroup: true,
    // 是否注入内置分流规则（去广告/GFW/CN 兜底）：scripts16 的档位
    injectRules: true,
    // 内置规则集：true=仅 AdBlock + gfw(mrs，轻量)；false=不注入任何规则
    lightweightRuleSets: true,
    // 需要个人自定义的规则写这里（对应 scripts14 的 myManualRules）
    myManualRules: [
      // "DOMAIN-SUFFIX,example.com,DIRECT",
    ],
  };

  // ============================ 0. 常量 ============================
  const ICON = "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/";
  const ACL = "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/";
  const MRS = "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo";

  // scripts12~20 迭代出来的黑名单（负向后顾避免误杀「集合」类名称）
  const BLACK_RE = /(?<!集)群|邀请|返利|官方|官网|网址|订阅|购买|续费|剩余|到期|过期|流量|备用|邮箱|客服|联系|工单|倒卖|防止|梯子|tg|发布|重置/i;

  // 倍率识别：兼容 [3x] / 3x / ×3 / 3倍；用后顾断言避免把 "HKT 10Gbps" 之类误判
  const RATIO_RE = /(?<![a-z0-9.])(?:\[(\d+(?:\.\d+)?)\s*[xX×]\]|(\d+(?:\.\d+)?)\s*(?:[xX×]|倍)(?![a-z0-9]))/i;

  const FLAGS = { "🇺🇸": "US", "🇯🇵": "JP", "🇸🇬": "SG", "🇭🇰": "HK", "🇹🇼": "TW" };

  // 地区表：元组数组（scripts14 起的形式），pattern 用 | 分隔关键词
  const REGIONS = [
    ["美国节点", "美国|美|US|USA|UnitedStates|United States|纽约|NewYork|NYC|JFK|洛杉矶|LosAngeles|LAX|旧金山|SanFrancisco|SFO|圣何塞|SanJose|SJC|西雅图|Seattle|SEA|芝加哥|Chicago|ORD|达拉斯|Dallas|DFW|硅谷|SiliconValley", "United_States.png"],
    ["日本节点", "日本|日|JP|JPN|Japan|东京|Tokyo|TYO|NRT|HND|大阪|Osaka|KIX", "Japan.png"],
    ["狮城节点", "新加坡|狮城|SG|SGP|Singapore|SIN", "Singapore.png"],
    ["香港节点", "香港|港|HK|HKG|HongKong|Hong Kong", "Hong_Kong.png"],
    ["台湾节点", "台湾|台|TW|TWN|Taiwan|台北|Taipei|TPE|新北|NewTaipei", "Taiwan.png"],
  ];

  const BUILTIN_PROVIDERS = CONFIG.injectRules && CONFIG.lightweightRuleSets
    ? {
        AdBlock: { type: "http", format: "text", behavior: "classical", interval: 86400, url: "https://fastly.jsdelivr.net/gh/fmz200/wool_scripts@main/Loon/rule/rejectAd.list", path: "./ruleset/AdBlock.list" },
        gfw: { type: "http", format: "mrs", behavior: "domain", interval: 86400, url: `${MRS}/geosite/gfw.mrs`, path: "./ruleset/gfw.mrs" },
      }
    : {};

  // ============================ 1. 节点清洗 ============================
  const allProxies = config.proxies || [];

  const proxies = allProxies.filter(p => {
    if (!p?.name) return false;
    if (CONFIG.filterNames && BLACK_RE.test(p.name)) return false;
    if (CONFIG.filterRatio) {
      const m = p.name.match(RATIO_RE);
      const ratio = m && parseFloat(m[1] ?? m[2]);
      if (ratio && ratio > CONFIG.maxRatio) return false;
    }
    return true;
  });

  // 一个节点都不剩就直接抛错，避免生成空配置让内核崩掉（scripts15 起引入的防护）
  if (!proxies.length) throw new Error("无有效代理节点：请检查订阅或放宽过滤条件");

  // ============================ 2. 名称归一化 ============================
  // 同名节点不能丢弃（scripts18 之前的教训），也不能让 UI 里出现两个同名项。
  // 采用 scripts19 的改名去重方案：#N 后缀是幂等的（重复运行不会累加）。
  const seen = new Map();
  for (const p of proxies) {
    const n = seen.get(p.name) || 0;
    seen.set(p.name, n + 1);
    if (n > 0) p.name = `${p.name} #${n}`;
  }

  const norm = name => {
    let s = String(name).trim().replace(/\s+/g, "").replace(/[【】[\]（）()]/g, "");
    for (const [flag, code] of Object.entries(FLAGS)) s = s.replaceAll(flag, code);
    return s;
  };

  // ============================ 3. 地区探测 ============================
  const matched = new Set();
  const regions = REGIONS.map(([name, pattern, icon]) => {
    const re = new RegExp(
      pattern.split("|").map(k => {
        const e = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // 短纯字母码（US/JP/SG...）加词边界，避免 SG 命中 "MSG"、US 命中 "RUSSIA"
        return /^[A-Za-z]+$/.test(e) && e.length <= 3 ? `\\b${e}\\b` : e;
      }).join("|"),
      "i"
    );
    const hit = proxies.filter(p => !matched.has(p.name) && re.test(norm(p.name))).map(p => p.name);
    hit.forEach(n => matched.add(n));
    return hit.length ? { name, icon, proxies: hit } : null;
  }).filter(Boolean);

  const otherProxies = proxies.map(p => p.name).filter(n => !matched.has(n));
  const hasOther = otherProxies.length > 0;
  const regionNames = regions.map(r => r.name);

  // ============================ 4. 组装策略组 ============================
  const regionGroup = r => ({
    name: r.name,
    icon: `${ICON}${r.icon}`,
    type: CONFIG.regionGroupType,
    proxies: r.proxies,
    // url-test 需要 interval/tolerance；select 组带上也无害但无意义
    ...(CONFIG.regionGroupType === "url-test" ? { interval: 300, tolerance: 50 } : {}),
  });

  // 节点选择的可选项：地区组 + 可选的其他节点 + 手动切换
  const selectable = [
    ...regionNames,
    ...(hasOther ? ["其他节点"] : []),
    ...(CONFIG.manualSwitchGroup ? ["手动切换"] : []),
    "DIRECT",
  ];

  config["proxy-groups"] = [
    { name: "节点选择", icon: `${ICON}Proxy.png`, type: "select", proxies: selectable },
    ...regions.map(regionGroup),
    ...(hasOther
      ? [{ name: "其他节点", icon: `${ICON}Available.png`, type: CONFIG.regionGroupType, proxies: otherProxies, ...(CONFIG.regionGroupType === "url-test" ? { interval: 300, tolerance: 50 } : {}) }]
      : []),
    // 手动切换 = include-all，订阅里每个节点都能单独选（scripts3~15 的能力，这里补回来）
    ...(CONFIG.manualSwitchGroup
      ? [{ name: "手动切换", icon: `${ICON}Available.png`, "include-all": true, type: "select" }]
      : []),
    { name: "GLOBAL", icon: `${ICON}Global.png`, type: "select", proxies: ["节点选择", ...regionNames, ...(hasOther ? ["其他节点"] : []), ...(CONFIG.manualSwitchGroup ? ["手动切换"] : []), "DIRECT"] },
  ];

  // ============================ 5. 规则合并 ============================
  // 关键：合并订阅自带的 rule-providers，只覆盖同名项，绝不整体替换。
  // scripts13~16 直接整体替换 rule-providers，导致订阅里引用其它 provider 的
  // RULE-SET 规则报 "rule set [xxx] not found" —— 这里从根上避免。
  // 反向也要防：只有真正声明了 provider 才注入引用它的规则（否则同样是 not found）。
  if (Object.keys(BUILTIN_PROVIDERS).length) {
    config["rule-providers"] = { ...(config["rule-providers"] || {}), ...BUILTIN_PROVIDERS };
  }
  const providerKeys = new Set(Object.keys(config["rule-providers"] || {}));

  const validTargets = new Set([
    "DIRECT", "REJECT", "REJECT-DROP", "PASS",
    ...config["proxy-groups"].map(g => g.name),
    ...proxies.map(p => p.name),
  ]);

  // 中文策略组名按语义映射，而不是一律打成「节点选择」（scripts14 的改进）
  const mapTarget = t => {
    const v = String(t).trim();
    if (/直连|DIRECT|LAN|局域网/i.test(v)) return "DIRECT";
    if (/拦截|广告|净化|REJECT|DROP|PASS/i.test(v)) return "REJECT";
    return "节点选择";
  };

  const inherited = (config.rules || [])
    // MATCH 由脚本兜底，不继承
    .filter(r => !/^MATCH,/i.test(r))
    // 引用了不存在 provider 的 RULE-SET 规则直接丢弃，避免加载失败
    .filter(r => {
      const t = r.trim();
      if (!/^RULE-SET,/i.test(t)) return true;
      return providerKeys.has(t.split(",")[1]?.trim());
    })
    .map(r => {
      let t = r.trim();
      // 逻辑规则（AND/OR/NOT/SUB-RULE 嵌套）原样保留
      if (/^(AND|OR|NOT|SUB-RULE),/i.test(t)) return t;
      const p = t.split(",");
      if (p.length < 3) return t;
      if (!validTargets.has(p[2].trim())) p[2] = mapTarget(p[2]);
      // IP 类规则补 no-resolve，省掉无意义的 DNS 解析
      if (/^(GEOIP|IP-CIDR|IP-CIDR6|SRC-IP-CIDR|IP-SUFFIX)/i.test(p[0]) && !p.includes("no-resolve")) p.push("no-resolve");
      return p.join(",");
    });

  // 内置规则集按拓扑排序：去广告 → GFW → 订阅自带 → CN 兜底
  const ownRules = [...providerKeys]
    .filter(k => Object.keys(BUILTIN_PROVIDERS).includes(k))
    .map(k => (k === "AdBlock" ? `RULE-SET,${k},REJECT` : `RULE-SET,${k},节点选择`));

  // QUIC 拦截：命中 gfw / cn 的 UDP 443 直接丢弃，避免走 QUIC 绕过分流。
  // 仅在本脚本自己声明了 gfw provider 时才注入，否则引用为空会报 not found。
  if (providerKeys.has("gfw")) {
    ownRules.unshift(
      "AND,((NETWORK,UDP),(DST-PORT,443),(NOT,((OR,((RULE-SET,gfw),(GEOIP,CN,no-resolve)))))),REJECT"
    );
  }

  config.rules = [
    ...CONFIG.myManualRules,
    ...ownRules,
    ...inherited,
    "GEOIP,LAN,DIRECT,no-resolve",
    "GEOIP,CN,DIRECT,no-resolve",
    "MATCH,节点选择",
  ];

  // ============================ 6. 性能开关 ============================
  config["unified-delay"] = true;
  config["tcp-concurrent"] = true;

  return config;
}
