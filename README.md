<div align="center">
  <img src="https://raw.githubusercontent.com/chen08209/FlClash/main/assets_source/images/icon/glyph.svg" width="100" height="100" alt="FlClash Scripts">
  <h1>FlClash Scripts</h1>
</div>

<p align="center">
  <a href="https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-full.js">
    <img src="https://img.shields.io/badge/GitHub-%E8%8E%B7%E5%8F%96%E8%84%9A%E6%9C%AC-red?style=for-the-badge&logo=github" alt="获取脚本" />
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=for-the-badge" alt="License: Apache License 2.0" />
  </a>
</p>

<p align="center">简体中文 | <a href="./README.en.md">English</a></p>

为 FlClash 订阅准备的增强脚本，把脚本全文粘贴进客户端的覆写 / 脚本即可自动整理节点、注入分流规则。提供功能最全、通用、极简三档，也可用于 Clash Verge Rev（未测试）。

## 安装

先装好 FlClash，然后打开 FlClash → `配置` → 选中你的订阅 → `覆写` / `脚本`，把 **[获取脚本](https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-full.js)** 的全文粘贴进去保存，再更新一次订阅（或重启内核）即可生效。

首次使用前先备份当前订阅配置——脚本会重建整个 `proxy-groups`。

## 文件

| 文件 | 用途 |
| ---- | ---- |
| `scripts-full.js` | 功能最全，支持 `proxy-providers` 动态订阅，自带去广告 + AI/Telegram 专组 + GFW + CN 兜底规则 |
| `scripts-core.js` | 通用档，功能完整，带 `myManualRules` 自定义规则入口 |
| `scripts-lite.js` | 极简档，不注入任何规则，完全用订阅自带的 |
| `legacy/` | 20 个历史脚本原样保留，可随时回滚 |
| `docs/仓库梳理报告.md` | 瘦身整理过程：功能对比、相似度分析、决策依据 |
| `tools/` | 维护者工具：分析脚本与行为断言测试 |

## 功能

- **节点整理**：黑名单过滤、国旗 emoji / 名称归一化、地区分组（自动测速或手动）、倍率过滤。
- **分流规则**：`scripts-full.js` / `scripts-core.js` 自带去广告与 GFW + CN 兜底，订阅自带规则保留并排在国内分流之后。
- **动态订阅**：`scripts-full.js` 给地区组挂 `use` + `filter`，`proxy-providers` 拉来的节点自动进组。
- **手动控制**：「手动选择」/「手动切换」组可逐个挑节点；`scripts-full.js` 的倍率过滤只挡自动分流，不挡手动。
- **克制接管**：不接管 `dns` / `hosts` / `ntp` / `sniffer` / `tun`，全部交给 FlClash 和订阅自己管。

## 隐私

- 脚本只在你自己的 FlClash 客户端内运行，不发起网络请求。
- 不读取、不收集、不上传任何订阅、节点或流量数据。
- 订阅配置与节点列表只存在于你的本地客户端配置中。

## 关于

- 脚本通过客户端的覆写 / 脚本机制注入，FlClash 更新可能导致行为变化，请关注仓库更新。
- 本仓库与 FlClash 官方无关，规则语法与字段以 Clash Meta 内核文档为准。
- 脚本会重建整个 `proxy-groups`，使用前务必备份订阅配置。
- 自动分流存在误配风险，涉及重要业务或合规要求时请自行评估；请遵守 FlClash 与订阅服务商的相关规定。欢迎提交 Issue / PR，也欢迎点 Star。

## 许可证

本项目基于 [Apache License 2.0](./LICENSE) 开源。
