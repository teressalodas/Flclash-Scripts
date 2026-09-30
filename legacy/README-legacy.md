# legacy/ 说明

本目录保留 **scripts1.js ~ scripts20.js** 全部 20 个历史脚本，**原样未改**。

- 保留原因：部分老用户仍在直接引用这些链接，直接删除会造成 404。
- 维护状态：**不再维护**。新功能与新修复只进入根目录的 `scripts-core.js` / `scripts-lite.js`。
- 完整的功能对比与删留依据：[`../docs/仓库梳理报告.md`](../docs/仓库梳理报告.md)

## 每个脚本的归宿

| 脚本 | 结论 | 理由 | 迁移到 |
|---|---|---|---|
| `scripts1.js` | 归档 | 唯一提供 27 组、流媒体/AI/游戏专组的方案，但与后续版本无继承关系（相似度 <5%） | core |
| `scripts2.js` | 归档 | 与 3 功能等价，但保留 `自动选择`/`广告拦截`/`应用净化`/`漏网之鱼` 四个组 | lite |
| `scripts3.js` | 淘汰 | 与 4 逻辑 100% 相同，仅 CDN 主机不同（`testingcf`） | lite |
| `scripts4.js` | 淘汰 | 3 的 CDN 变体（`cdn.jsdelivr.net`，加载更优），已被 5/6 取代 | lite |
| `scripts5.js` | 淘汰 | 用手写大小写变体替代 `i` 标志，是走偏的一步，6 又改回 | lite |
| `scripts6.js` | 淘汰 | icon/rule 改变量拼接，7 已是其超集 | lite |
| `scripts7.js` | 淘汰 | 新增倍率过滤的枢纽版本，但被 8~11 叠加后收敛 | core |
| `scripts8.js` | 淘汰 | 仅比 7 多 3 个规则集，已被 10/11 吸收 | core |
| `scripts9.js` | 淘汰 | 地区组改为显式节点名，使分组变成静态快照，属退步 | core |
| `scripts10.js` | 归档 | 唯一使用 Loyalsoldier + ACL4SSR 双源、23 个规则集的"重去广告"方案 | core |
| `scripts11.js` | 淘汰 | 10 的精简版，后续 12~15 在其上继续演进 | core |
| `scripts12.js` | 淘汰 | **死枝**：13 把其 `normalizeName()`/`buildRegionRegex()` 内联删除后重写 | core |
| `scripts13.js` | 淘汰 | 首个"规则合并 + 修失效指向"版本，但缺少 `myManualRules` | core |
| `scripts14.js` | 保留并升级 | 引入 `myManualRules`、中文策略组名映射、`no-resolve` —— 并入 core | core |
| `scripts15.js` | 保留并升级 | 功能最完整：mrs 规则集、QUIC 拦截、性能开关 —— 并入 core | core |
| `scripts16.js` | 保留并升级 | 唯一的"零本地规则 + 极简"档位 —— 并入 lite | lite |
| `scripts17.js` | 淘汰 | `myRules` 是永不被填充的空数组，自定义规则钩子形同虚设 | lite |
| `scripts18.js` | 淘汰 | 唯一实质改动是未生效的测速配置 | lite |
| `scripts19.js` | 淘汰 | 只加了同名节点 `#N` 改名去重，该逻辑被 20 完整继承 | core |
| `scripts20.js` | 保留并升级 | 唯一**合并**而非替换 `rule-providers` 的版本 —— 并入 core | core |

汇总：活跃 **3 个**（14/15/16）→ 最终 **2 个脚本**；归档 **3 个**（1/2/10）；其余 **14 个**仅作历史留档。
