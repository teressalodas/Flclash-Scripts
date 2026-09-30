/**
 * FLClash 覆写脚本 —— 极简档 scripts-lite
 *
 * 定位（继承 scripts16~19 的"轻防护"路线）：
 *   只做三件事 —— 清洗节点名 → 建地区分组 → 修掉会报错的策略组指向。
 *   不注入任何分流规则，完全尊重订阅自带的规则与规则集。
 *
 * 与 scripts-core 的关系：
 *   两者共用同一套节点清洗 / 归一化 / 地区探测逻辑，行为一致；
 *   差别只在 core 额外提供倍率过滤、自动测速、手选节点组、去广告与 GFW 分流。
 *
 * 历史脚本对应关系：#16 #17 #18 #19（含修复，见下）
 */
function main(config) {
  // ============================ 档位开关 ============================
  const CONFIG = {
    // 地区分组是否启用自动测速。
    // false = select（纯手动，等同 scripts16~19 的实际行为）
    // true  = url-test（自动选延迟最低，即 README 承诺但历史脚本未实现的能力）
    autoTest: false,
    // 空配置防护：一个有效节点都没有时直接抛错，避免内核崩溃（scripts15 起的防护）
    throwWhenEmpty: true,
  };

  const ICON = "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/";

  const BLACK_RE = /(?<!集)群|邀请|返利|官方|官网|网址|订阅|购买|续费|剩余|到期|过期|流量|备用|邮箱|客服|联系|工单|倒卖|防止|梯子|tg|发布|重置/i;
  const FLAGS = { "🇺🇸": "US", "🇯🇵": "JP", "🇸🇬": "SG", "🇭🇰": "HK", "🇹🇼": "TW" };

  const REGIONS = [
    ["美国节点", "美国|美|US|USA|UnitedStates|United States|纽约|NewYork|NYC|JFK|洛杉矶|LosAngeles|LAX|旧金山|SanFrancisco|SFO|圣何塞|SanJose|SJC|西雅图|Seattle|SEA|芝加哥|Chicago|ORD|达拉斯|Dallas|DFW|硅谷|SiliconValley", "United_States.png"],
    ["日本节点", "日本|日|JP|JPN|Japan|东京|Tokyo|TYO|NRT|HND|大阪|Osaka|KIX", "Japan.png"],
    ["狮城节点", "新加坡|狮城|SG|SGP|Singapore|SIN", "Singapore.png"],
    ["香港节点", "香港|港|HK|HKG|HongKong|Hong Kong", "Hong_Kong.png"],
    ["台湾节点", "台湾|台|TW|TWN|Taiwan|台北|Taipei|TPE|新北|NewTaipei", "Taiwan.png"],
  ];

  // ============================ 1. 节点清洗 ============================
  const allProxies = config.proxies || [];
  const proxies = allProxies.filter(p => p?.name && !BLACK_RE.test(p.name));

  // scripts17 在无节点时静默返回、scripts19 在"过滤后为空但原始非空"时继续使用空列表，
  // 两者都会生成没有节点的配置。这里统一改为显式报错。
  if (!proxies.length && CONFIG.throwWhenEmpty) {
    throw new Error("无有效代理节点：请检查订阅或节点名过滤规则");
  }
  if (!proxies.length) return config;

  // 同名节点改名去重（scripts19 的方案，实测连续多次运行幂等，不会累加后缀）
  const seen = new Map();
  for (const p of proxies) {
    const n = seen.get(p.name) || 0;
    seen.set(p.name, n + 1);
    if (n > 0) p.name = `${p.name} #${n}`;
  }

  // ============================ 2. 名称归一化 ============================
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
        // 短纯字母码加词边界：US 不该命中 RUSSIA，SG 不该命中 MSG，JP 不该命中 JPEG
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
  const groupType = CONFIG.autoTest ? "url-test" : "select";
  const tuning = CONFIG.autoTest ? { interval: 300, tolerance: 50 } : {};

  config["proxy-groups"] = [
    { name: "节点选择", icon: `${ICON}Proxy.png`, type: "select", proxies: [...regionNames, ...(hasOther ? ["其他节点"] : [])] },
    ...regions.map(r => ({ name: r.name, icon: `${ICON}${r.icon}`, type: groupType, proxies: r.proxies, ...tuning })),
    ...(hasOther ? [{ name: "其他节点", icon: `${ICON}Available.png`, type: groupType, proxies: otherProxies, ...tuning }] : []),
    { name: "GLOBAL", icon: `${ICON}Global.png`, type: "select", proxies: ["节点选择", ...regionNames, ...(hasOther ? ["其他节点"] : [])] },
  ];

  // ============================ 5. 规则防护（不注入任何自带规则） ============================
  // 关键点：绝不动 config["rule-providers"]，订阅自带的规则集原样保留。
  // 同时丢弃引用了不存在 provider 的 RULE-SET 规则 —— scripts17~19 缺这一步，
  // 订阅里若有失效引用就会整份配置加载失败。
  const providerKeys = new Set(Object.keys(config["rule-providers"] || {}));

  const validTargets = new Set([
    "DIRECT", "REJECT", "REJECT-DROP", "PASS",
    ...config["proxy-groups"].map(g => g.name),
    ...proxies.map(p => p.name),
  ]);

  const mapTarget = t => {
    const v = String(t).trim();
    if (/直连|DIRECT|LAN|局域网/i.test(v)) return "DIRECT";
    if (/拦截|广告|净化|REJECT|DROP|PASS/i.test(v)) return "REJECT";
    return "节点选择";
  };

  const rules = (config.rules || []).map(r => {
    let t = String(r).trim();
    if (/^(AND|OR|NOT|SUB-RULE),/i.test(t)) return t;

    const parts = t.split(",");
    const head = parts[0].trim().toUpperCase();

    // MATCH 是兜底规则，必须排在最后；这里先剔除，统一在末尾重建，
    // 否则订阅里 MATCH 之后的自定义规则会被它吞掉、永远不会被匹配。
    if (head === "MATCH") return null;

    // 引用未知规则集的规则直接丢弃
    if (head === "RULE-SET" && !providerKeys.has(parts[1]?.trim())) return null;

    if (parts.length >= 3 && !validTargets.has(parts[2].trim())) parts[2] = mapTarget(parts[2]);
    if (/^(GEOIP|IP-CIDR|IP-CIDR6|SRC-IP-CIDR|IP-SUFFIX)/i.test(head) && !parts.includes("no-resolve")) parts.push("no-resolve");
    return parts.join(",");
  }).filter(Boolean);

  // 兜底规则始终放在最后一条
  rules.push("MATCH,节点选择");

  config.rules = rules;

  // 保留原始节点数组（本脚本不删除节点，只改名）
  config.proxies = allProxies;

  return config;
}
