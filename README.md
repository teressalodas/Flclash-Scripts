# Flclash-scripts

脚本专为 **FlClash** 制作，或可用于 **Clash Verge Rev**（未测试，不保证可用性与稳定性）。

> **本仓库已于 2026-09 完成瘦身整理。** 原先并存的 20 个脚本（`scripts1.js`~`scripts20.js`）
> 已收敛为 **2 个脚本**，历史版本全部保留在 [`legacy/`](./legacy/) 目录中，可随时查阅、回滚。
> 整理依据与完整分析见 [`docs/仓库梳理报告.md`](./docs/仓库梳理报告.md)。

---

## 选哪个脚本？

只需要回答一个问题：**你想要脚本替你管分流规则，还是只让脚本帮你整理节点？**

| | [`scripts-core.js`](./scripts-core.js) | [`scripts-lite.js`](./scripts-lite.js) |
|---|---|---|
| **定位** | 默认推荐，功能完整 | 极简，只做必要防护 |
| **分流规则** | 脚本自带：去广告 + GFW 分流 + CN 兜底 | **不注入任何规则**，完全用订阅自带的 |
| **节点名过滤** | ✅ | ✅ |
| **国旗 emoji / 名称归一化** | ✅ | ✅ |
| **地区分组** | ✅（自动测速选用最低延迟） | ✅（手动选择） |
| **倍率过滤** | ✅（默认剔除 3 倍以上） | ❌ |
| **逐个挑节点**（手动切换组） | ✅ | ❌ |
| **自定义规则入口** | ✅ `myManualRules` | ❌ |
| **QUIC 拦截 + 性能参数** | ✅ | ❌ |
| **保留订阅自带规则** | ✅ | ✅ |
| **代码行数** | ~168 行 | ~107 行 |

**不确定就选 `scripts-core.js`。**

---

## 快速开始

1. 打开 FlClash → `配置` → 选中你的订阅 → `覆写` / `脚本`
2. 把选定脚本的**全部内容**粘贴进去，保存
3. 更新一次订阅（或重启内核）使脚本生效

> ⚠️ 首次使用前请先备份当前订阅配置。脚本会重建整个 `proxy-groups`。

---

## 自定义

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
| `scripts1` | `scripts-core.js` | 策略组从 27 个减到 8 个；流媒体/AI/游戏专组不再由脚本提供 |
| `scripts2` `scripts3` `scripts4` | `scripts-lite.js` | 不再自带广告拦截规则 |
| `scripts5` `scripts6` | `scripts-lite.js` | 无功能损失 |
| `scripts7`~`scripts12` | `scripts-core.js` | 保留倍率过滤；地区组改为自动测速 |
| `scripts10` | `scripts-core.js` | 规则集从 23 个降到 2 个，性能明显改善 |
| `scripts13` `scripts14` | `scripts-core.js` | `myManualRules` 移到文件顶部 `CONFIG` 区 |
| `scripts15` | `scripts-core.js` | 保留 mrs 规则集与 QUIC 拦截；不再强制设 `find-process-mode` |
| `scripts16` | `scripts-lite.js` | 定位完全一致 |
| `scripts17` `scripts18` `scripts19` | `scripts-lite.js` | 若你本意是"自动测速"，请改用 `scripts-core.js` |
| `scripts20` | `scripts-core.js` | google/microsoft mrs 规则已内置 |

---

## 整理过程中修复的问题

| 问题 | 说明 |
|---|---|
| **"自动测速"从未生效** | `scripts18/19/20` 写了 `autoSpeedConfig = { type: "select", interval: 300 }` —— `interval` 对 `select` 组无效，实测三个脚本输出的 `url-test` 组数量为 **0**。README 承诺的自动测速并不存在，用户仍需手动点选节点。已在 `scripts-core.js` 修正。 |
| **订阅规则集被丢弃** | `scripts1`~`scripts13`、`scripts16` 整体替换 `rule-providers`，订阅自带的规则集与引用它们的规则会变成失效引用（`rule set [xxx] not found`，导致整份配置加载失败）。新脚本改为**合并**而非替换。 |
| **悬空 RULE-SET 引用** | `scripts17/18/19` 保留订阅 provider 但不过滤失效引用，同样会 `not found`。新脚本会丢弃引用不存在 provider 的规则。 |
| **手选节点能力丢失** | `scripts16` 起删除了 `include-all` 的「手动切换」组，用户无法再直接选中单个节点。`scripts-core.js` 已恢复。 |
| **MATCH 兜底位置** | 订阅里 `MATCH` 之后的自定义规则会被它吞掉、永不生效。新脚本强制把兜底规则移到最后一条。 |
| **短码误匹配** | `US` 会命中 `RUSSIA`、`SG` 会命中 `MSG`。新脚本对 1~3 位纯字母码加词边界（`\bUS\b`）。 |

---

## 目录结构

```
Flclash-scripts/
├─ scripts-core.js          # 默认推荐
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

1. **不按编号新增脚本。** 改动直接改 `scripts-core.js` 或 `scripts-lite.js`。
   历史上 20 个文件中有 11 个是"只改一处"的产物，这是膨胀的根因。
2. **档位用开关，不用新文件。** 用文件顶部的 `CONFIG` 对象切换行为。
3. **改完跑测试。** `node tools/test-core.mjs` 与 `node tools/test-lite.mjs` 必须全绿。
4. **README 与代码同一次提交更新。**

---

**持续优化中，欢迎反馈使用体验！**
