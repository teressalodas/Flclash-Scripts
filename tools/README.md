# tools/ —— 维护者说明

这里的脚本用于**验证**根目录的三个覆写脚本，不参与 FlClash 运行。
提交前请确保三个测试全绿：

```powershell
node tools/test-full.mjs   # 期望: 115 passed, 0 failed
node tools/test-core.mjs   # 期望:  51 passed, 0 failed
node tools/test-lite.mjs   # 期望:  37 passed, 0 failed
```

要求 Node.js 18+，**无第三方依赖**。

## 测试做什么

三个测试都在 Node 沙箱里执行对应脚本，灌入构造的订阅样例
（含重名节点、国旗 emoji、倍率标记、中文策略组名、失效 RULE-SET 引用、
`proxy-providers` 场景），再对输出配置逐项断言。覆盖这些**踩过坑的场景**：

- 重名节点必须改名保留，不能丢弃（`scripts18` 的教训）
- 节点名撞上策略组名/内建名时要改名，且引用它的 `dialer-proxy` 要同步更新
- 悬空 `dialer-proxy` 要级联清理；但有 `provider` 时不能误删指向 provider 节点的引用
- 倍率过滤要能识别 `[3x]` / `5x` / `×3` / `3倍`，且不误判 `10Gbps`
- 倍率过滤只挡自动分流，「手动选择」组里高倍率节点仍须可用
- 黑名单不能误杀（`traffic` 只在整串结尾时判定，放过 `Traffic-01`）
- `US` 不得命中 `RUSSIA`，`SG` 不得命中 `MSG`（词边界）
- `America` 不得命中 `Latin America` / `South America`
- `proxy-providers` 场景下地区组必须挂上 `use` + `filter`
- 引用不存在 provider 的 `RULE-SET` 必须被丢弃，否则配置加载失败
- `SUB-RULE` 引用不存在的 `sub-rules` 主规则必须被丢弃
- 逻辑规则（`AND`/`OR`/`NOT`）的内层结构不能被破坏，但目标要按语义映射
- 中文策略组名要按语义映射（`直连→DIRECT`、`拦截→REJECT`）
- `MATCH` 必须是最后一条，否则它后面的规则会被吞掉
- `dns` / `hosts` / `ntp` / `sniffer` / `tun` / `geodata-loader` 不得被触碰
- 一个有效节点都没有时要报错，而不是生成空配置
- `config.rules` 缺失或不是数组时不能崩

> `test-full.mjs` 只覆盖 `scripts-full.js`；`test-core.mjs` / `test-lite.mjs`
> 里的少数断言编码的是那两个脚本各自的旧约定（例如「自动选择」组的存在性），
> 与 `scripts-full.js` 的行为差异是**有意为之**，不要为了统一而改。

