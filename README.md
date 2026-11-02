<div align="center">
  <img src="./icon.svg" width="100" height="100" alt="FlClash Scripts">
  <h1>FlClash Scripts</h1>
</div>

<p align="center">
  <a href="https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-lite.js">
    <img src="https://img.shields.io/badge/GitHub-%E8%8E%B7%E5%8F%96%E8%84%9A%E6%9C%AC-red?style=for-the-badge&logo=github" alt="获取脚本" />
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=for-the-badge" alt="License: Apache License 2.0" />
  </a>
</p>

<p align="center">简体中文 | <a href="./README.en.md">English</a></p>

面向 FlClash 的订阅增强脚本，粘贴至客户端覆写 / 脚本入口即可自动完成节点清洗、地区分组与配置修复。提供极简版与个人自用版两个版本：极简版不注入任何分流规则，订阅自带规则原样生效；个人自用版额外内置分流规则并接管系统字段。两版共享同一套核心逻辑，改动同步演进。

## 安装

装好 FlClash 后：打开 FlClash → `配置` → 选中你的订阅 → `覆写` / `脚本`，把 **[获取脚本](https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-lite.js)** 的全文粘贴进去保存，再更新一次订阅（或重启内核）即可生效。

脚本会重建整个 `proxy-groups`，首次使用前先备份订阅配置。

## 文件

| 文件 | 用途 |
| ---- | ---- |
| `scripts-lite.js` | 极简版（公开推荐）：只整理节点、修复配置错误，不注入任何分流规则 |
| `scripts-personal.js` | 个人自用版：作者个人使用，与公开版共享核心逻辑，额外内置分流规则并接管 DNS 等系统字段 |
| `tools/` | 维护者工具：行为断言测试 |

## 功能

`scripts-lite.js` 提供以下能力：

- **节点清洗**：剔除名称含广告、营销等关键词的节点；同名节点自动去重并保留，不产生丢失。
- **地区分组**：按地区将节点划分为 美国 / 日本 / 新加坡 / 香港 / 台湾 / 其他，可启用自动测速选取延迟最低节点。
- **配置修复**：剔除引用未声明规则集的失效规则，避免整个配置加载失败；无有效节点时直接报错，不生成空配置。
- **规则中立**：不注入任何分流规则，订阅自带的规则原样保留并生效。

`scripts-personal.js` 在前述能力之外，额外内置分流规则并接管 `dns` / `hosts` / `ntp` / `sniffer` 等系统字段。该版本为作者个人使用，请按需选用。

## 隐私

- 脚本只在你自己的 FlClash 客户端内运行，不发起网络请求。
- 不读取、不收集、不上传任何订阅、节点或流量数据。
- 订阅配置与节点列表只存在于你的本地客户端配置中。

## 关于

- 脚本通过客户端的覆写 / 脚本机制注入，FlClash 更新可能导致行为变化，请关注仓库更新。
- 本仓库与 FlClash 官方无关，规则语法与字段以 Clash Meta 内核文档为准。

## 许可证

本项目基于 [Apache License 2.0](./LICENSE) 开源。
