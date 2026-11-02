# tools/ —— 维护者说明

这里的测试用于**验证**根目录的 `scripts-lite.js`，不参与 FlClash 运行。
提交前请确保测试全绿：

```powershell
node tools/test-lite.mjs   # 期望: 37 passed, 0 failed
```

要求 Node.js 18+，**无第三方依赖**。

## 测试做什么

在 Node 沙箱里执行 `scripts-lite.js`，灌入构造的订阅样例
（含重名节点、国旗 emoji、中文策略组名、失效 RULE-SET 引用），
再对输出配置逐项断言。覆盖这些**踩过坑的场景**：

- 重名节点必须改名保留，不能丢弃
- 节点名撞上策略组名/内建名时要改名，且引用它的 `dialer-proxy` 要同步更新
- 悬空 `dialer-proxy` 要级联清理
- 黑名单不能误杀
- `US` 不得命中 `RUSSIA`，`SG` 不得命中 `MSG`（词边界）
- 引用不存在 provider 的 `RULE-SET` 必须被丢弃，否则配置加载失败
- 中文策略组名要按语义映射（`直连→DIRECT`、`拦截→REJECT`）
- `MATCH` 必须是最后一条，否则它后面的规则会被吞掉
- `dns` / `hosts` / `ntp` / `sniffer` / `tun` / `geodata-loader` 不得被触碰
- 一个有效节点都没有时要报错，而不是生成空配置
- `config.rules` 缺失或不是数组时不能崩
