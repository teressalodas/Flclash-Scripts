# Flclash-scripts

脚本专为 **FlClash** 制作，或可用于 **Clash Verge Rev**（未测试，不保证可用性与稳定性）。

> **本仓库已于 2026-09 完成瘦身整理。** 原先并存的 20 个脚本（`scripts1.js`~`scripts20.js`）
> 已收敛为 **2 个脚本**，历史版本全部保留在 [`legacy/`](./legacy/) 目录中，可随时查阅、回滚。
> 整理依据与完整分析见 [`docs/仓库梳理报告.md`](./docs/仓库梳理报告.md)。

---

## 选哪个脚本？

只需要回答一个问题：**你想要脚本替你管分流规则，还是只让脚本帮你整理节点？**

| | [`scripts-full.js`](./scripts-full.js) | [`scripts-core.js`](./scripts-core.js) | [`scripts-lite.js`](./scripts-lite.js) |
|---|---|---|---|
| **定位** | 功能最全，专为动态订阅优化 | 功能完整，通用 | 极简，只做必要防护 |
| **分流规则** | 自带：去广告 + AI/Telegram 专组 + GFW + CN 兜底 | 自带：去广告 + GFW + CN 兜底 | **不注入任何规则**，完全用订阅自带的 |
| **支持 `proxy-providers`** | ✅ 地区组挂 `use`+`filter`，动态填充 | ❌ 只处理内联节点 | ❌ |
| **节点名过滤** | ✅ | ✅ | ✅ |
| **国旗 emoji / 名称归一化** | ✅ | ✅ | ✅ |
| **地区分组** | ✅（自动测速） | ✅（自动测速） | ✅（手动选择） |
| **倍率过滤** | ✅ 只挡自动分流，手动选择仍可用 | ✅ | ❌ |
| **逐个挑节点** | ✅「手动选择」组 | ✅「手动切换」组 | ❌ |
| **AI / Telegram 专用组** | ✅ | ❌ | ❌ |
| **自定义规则入口** | ❌ | ✅ `myManualRules` | ❌ |
| **QUIC 拦截** | ✅ | ✅ | ❌ |
| **保留订阅自带规则** | ✅ | ✅ | ✅ |
| **接管 DNS/hosts/sniffer** | ❌ 一律不碰 | ❌ | ❌ |
| **代码行数** | ~354 行 | ~168 行 | ~107 行 |

**选哪个？**
- 订阅是**机场动态订阅**（用 `proxy-providers`）→ 选 `scripts-full.js`
- 普通订阅、想要规则多一点 → `scripts-core.js`
- 只想让脚本帮忙整理节点，规则全交给订阅 → `scripts-lite.js`

**不确定就选 `scripts-core.js`。**

---

## 快速开始

1. 打开 FlClash → `配置` → 选中你的订阅 → `覆写` / `脚本`
2. 把选定脚本的**全部内容**粘贴进去，保存
3. 更新一次订阅（或重启内核）使脚本生效

> ⚠️ 首次使用前请先备份当前订阅配置。脚本会重建整个 `proxy-groups`。

---

## 自定义

### `scripts-full.js`

可调项在文件顶部的 `OPTIONS` 里：

```js
const OPTIONS = {
  remoteDirect: true,       // 远控端口直连（TeamViewer 5938 / AnyDesk 7070 / 向日葵 21114-21119）
                            // 开了延迟更好，但对端能看到你的真实 IP
  blockQuic: true,          // 拦截 QUIC(UDP 443)，避免绕过 TCP 分流
  filterHighRate: true,     // 倍率过滤：只挡自动分流，「手动选择」里仍然可用高倍率节点
  maxRate: 1.5,             // 超过此倍率的不进地区分组/其他节点
  aiBlockedRegions: ['香港节点', '澳门节点'],  // 「国外AI」组排除的地区
};
```

**它固定的行为**（不提供开关）：
- 订阅自带规则排在自带 CN 分流**之后**，国内流量不会被订阅规则抢先送进代理
- 不接管 `dns` / `hosts` / `ntp` / `sniffer` / `tun` / `geodata-loader`，这些交给 FlClash 界面和订阅自己管
- 黑名单只用宽松档，只剔除明确的广告/续费/公告节点

### `scripts-core.js`

所有可调项都集中在文件顶部的 `CONFIG` 对象里，改一行即可切换行为，**不需要另存新文件**：

```js
const CONFIG = {
  filterNames: true,          // 节点名黑名单过滤
  filterRatio: true,          // 倍率过滤开关
  maxRatio: 3.0,              // 剔除高于此倍率的节点
  regionGroupType: "url-test",// "url-test" 自动测速 / "select" 纯手动
  manualSwitchGroup: true,    // 是否保留「手动切换」组（可逐个挑节点）
  injectRules: true,          // 是否注入自带分流规则
  lightweightRuleSets: true,  // 规则集档位：true=仅 AdBlock+gfw（轻量）
  myManualRules: [
    // 在这里写你自己的规则，会被放在规则列表最前面（优先级最高）
    // "DOMAIN-SUFFIX,example.com,DIRECT",
  ],
};
```

**常见改法**

| 我想…… | 怎么改 |
|---|---|
| 关闭倍率过滤 | `filterRatio: false` |
| 不想让脚本自动测速 | `regionGroupType: "select"` |
| 完全不用脚本自带规则 | `injectRules: false`（等效于 `scripts-lite.js`） |
| 让某个域名直连 | 加进 `myManualRules` |

### `scripts-lite.js`

```js
const CONFIG = {
  autoTest: false,        // 地区分组是否自动测速（true = url-test）
  throwWhenEmpty: true,   // 无有效节点时报错，而不是生成空配置
};
```

---

## 与旧脚本的对应关系

老用户请按下表迁移。**所有旧脚本仍保留在 [`legacy/`](./legacy/)，URL 不会失效。**

| 你在用 | 迁移到 | 需要注意 |
|---|---|---|
| `scripts1` | `scripts-full.js` | 策略组从 27 个减到 9 个；流媒体/AI/游戏专组不再由脚本提供 |
| `scripts2` `scripts3` `scripts4` | `scripts-lite.js` | 不再自带广告拦截规则 |
| `scripts5` `scripts6` | `scripts-lite.js` | 无功能损失 |
| `scripts7`~`scripts12` | `scripts-full.js` | 保留倍率过滤；地区组改为自动测速 |
| `scripts10` | `scripts-full.js` | 规则集从 23 个降到 11 个 |
| `scripts13` `scripts14` | `scripts-full.js` | 自定义规则改写到规则数组里（不再有 `myManualRules`） |
| `scripts15` | `scripts-full.js` | 保留 mrs 规则集与 QUIC 拦截；不再接管 dns/sniffer/tun |
| `scripts16` | `scripts-lite.js` | 定位完全一致 |
| `scripts17` `scripts18` `scripts19` | `scripts-lite.js` | 若你本意是"自动测速"，请改用 `scripts-full.js` 或 `scripts-core.js` |
| `scripts20` | `scripts-full.js` | google/microsoft mrs 规则已内置；支持 `proxy-providers` |

---

## 整理过程中修复的问题

| 问题 | 说明 |
|---|---|
| **"自动测速"从未生效** | `scripts18/19/20` 写了 `autoSpeedConfig = { type: "select", interval: 300 }` —— `interval` 对 `select` 组无效，实测三个脚本输出的 `url-test` 组数量为 **0**。README 承诺的自动测速并不存在，用户仍需手动点选节点。已修正。 |
| **订阅规则集被丢弃** | `scripts1`~`scripts13`、`scripts16` 整体替换 `rule-providers`，订阅自带的规则集与引用它们的规则会变成失效引用（`rule set [xxx] not found`，导致整份配置加载失败）。新脚本改为**合并**而非替换。 |
| **悬空 RULE-SET 引用** | `scripts17/18/19` 保留订阅 provider 但不过滤失效引用，同样会 `not found`。新脚本会丢弃引用不存在 provider 的规则。 |
| **手选节点能力丢失** | `scripts16` 起删除了 `include-all` 的「手动切换」组，用户无法再直接选中单个节点。新脚本以「手动选择」组恢复。 |
| **中文策略组名被反转** | 订阅里的 `GEOIP,CN,🎯 全球直连` 会被原逻辑改成走代理、`🛑 广告拦截` 也变成走代理。新脚本按语义映射（直连类→`DIRECT`、拦截类→`REJECT`）。 |
| **订阅规则抢在国内分流之前** | 原逻辑把订阅自带规则排在自带 CN 分流之前，一条把国内域名走代理的订阅规则会让国内流量走代理且极难排查。新脚本固定 CN 直连优先。 |
| **`proxy-providers` 下地区分组失效** | 只对内联节点做正则匹配，provider 拉来的节点进不了任何地区组（纯 provider 订阅下地区分组能力归零）。新脚本给地区组挂 `use` + `filter` 动态填充。 |
| **悬空 `dialer-proxy`** | 指向已不存在节点的 `dialer-proxy` 会保留下来导致连接失败。新脚本做级联清理，并同步改名后的引用。 |
| **MATCH 兜底位置** | 订阅里 `MATCH` 之后的自定义规则会被它吞掉、永不生效。新脚本强制把兜底规则移到最后一条。 |
| **短码误匹配** | `US` 会命中 `RUSSIA`、`SG` 会命中 `MSG`、`SEA` 会把东南亚归成美国。新脚本对 1~3 位纯字母码加词边界，并移除歧义短码 `SEA`。 |

---

## 目录结构

```
Flclash-scripts/
├─ scripts-full.js          # 功能最全，支持 proxy-providers
├─ scripts-core.js          # 通用，功能完整
├─ scripts-lite.js          # 极简档
├─ legacy/                  # 20 个历史脚本，原样保留，不再维护
│  ├─ README-legacy.md      # 原 README 全文 + 每个脚本的归宿说明
│  └─ scripts1.js ~ scripts20.js
├─ docs/
│  └─ 仓库梳理报告.md        # 完整梳理过程：功能对比、相似度分析、决策依据
└─ tools/
   ├─ README.md             # 维护者说明：如何验证脚本
   └─ *.mjs                 # 分析脚本与行为断言测试
```

---

## 维护约定

为避免再次膨胀成 20 个文件，本仓库遵循以下约定：

1. **不按编号新增脚本。** 改动直接改现有脚本。历史上 20 个文件中有 11 个是"只改一处"的产物，这是膨胀的根因。
2. **档位用开关，不用新文件。** 用文件顶部的 `OPTIONS` / `CONFIG` 对象切换行为。
3. **改完跑测试。** 三个脚本都有对应测试，必须全绿：

   ```powershell
   node tools/test-full.mjs    # 期望: 103 passed, 0 failed
   node tools/test-core.mjs    # 期望:  41 passed, 0 failed
   node tools/test-lite.mjs    # 期望:  30 passed, 0 failed
   ```

4. **README 与代码同一次提交更新。**

---

**持续优化中，欢迎反馈使用体验！**
