<div align="center">
  <img src="https://raw.githubusercontent.com/chen08209/FlClash/main/assets_source/images/icon/glyph.svg" width="100" height="100" alt="FlClash Scripts">
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

订阅节点列表混乱、分组要手动一个个挑、坏规则还会让整个配置加载失败——把这个脚本全文粘贴进 FlClash 的覆写 / 脚本，这些问题自动解决。提供两个版本：极简版不注入任何规则，订阅自带规则原样生效；个人自用版由作者日常使用，不随公开版演进。

## 安装

装好 FlClash 后：打开 FlClash → `配置` → 选中你的订阅 → `覆写` / `脚本`，把 **[获取脚本](https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-lite.js)** 的全文粘贴进去保存，再更新一次订阅（或重启内核）即可生效。

脚本会重建整个 `proxy-groups`，首次使用前先备份订阅配置。

## 文件

| 文件 | 用途 |
| ---- | ---- |
| `scripts-lite.js` | 极简版（公开推荐）：只整理节点、修复配置错误，不注入任何分流规则 |
| `scripts-personal.js` | 个人自用版：作者日常在用的脚本，额外自带分流规则并接管 DNS 等系统字段，不随公开版演进 |
| `tools/` | 维护者工具：行为断言测试 |

## 功能

`scripts-lite.js` 做四件事：

- **清理节点**：剔除名字带「购买」「返利」「官网」等广告推销词的节点；同名节点改名保留，不丢失。
- **节点分组**：按地区自动分成 美国 / 日本 / 新加坡 / 香港 / 台湾 / 其他，支持自动测速选最快。
- **修复配置**：丢弃订阅里引用不存在规则集的坏规则（否则整个配置加载失败）；一个有效节点都没有时直接报错，不生成空配置。
- **不碰规则**：不注入任何分流规则，订阅自带的规则原样生效。

`scripts-personal.js` 除了以上四件事，还自带分流规则、接管 `dns` / `hosts` / `ntp` / `sniffer`——是作者的个人配置，按需取用。

## 隐私

- 脚本只在你自己的 FlClash 客户端内运行，不发起网络请求。
- 不读取、不收集、不上传任何订阅、节点或流量数据。
- 订阅配置与节点列表只存在于你的本地客户端配置中。

## 关于

- 脚本通过客户端的覆写 / 脚本机制注入，FlClash 更新可能导致行为变化，请关注仓库更新。
- 本仓库与 FlClash 官方无关，规则语法与字段以 Clash Meta 内核文档为准。

## 许可证

本项目基于 [Apache License 2.0](./LICENSE) 开源。
