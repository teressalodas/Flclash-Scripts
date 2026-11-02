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

为 FlClash 订阅准备的增强脚本，把脚本全文粘贴进客户端的覆写 / 脚本即可自动整理节点。提供两个版本：极简版不注入任何规则、订阅自带规则原样生效；个人自用版接管更多系统字段，不随公开版演进。

## 安装

先装好 FlClash，然后打开 FlClash → `配置` → 选中你的订阅 → `覆写` / `脚本`，把 **[获取脚本](https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-lite.js)** 的全文粘贴进去保存，再更新一次订阅（或重启内核）即可生效。

首次使用前先备份当前订阅配置——脚本会重建整个 `proxy-groups`。

## 文件

| 文件 | 用途 |
| ---- | ---- |
| `scripts-lite.js` | 极简版：清洗节点名、建地区分组、修掉会报错的策略组指向，不注入任何规则，订阅自带规则原样生效 |
| `scripts-personal.js` | 个人自用版：基于旧版全功能脚本修改，接管 `dns`/`hosts`/`ntp`/`sniffer`/`geodata-loader`，不随公开版演进 |
| `tools/` | 维护者工具：行为断言测试 |

## 功能

- **节点整理**：黑名单过滤、国旗 emoji / 名称归一化、地区分组（可自动测速或手动）、同名节点去重保留。
- **规则边界**：`scripts-lite.js` 不注入任何规则集，订阅自带的第三方规则原样生效。
- **空配置防护**：一个有效节点都没有时直接报错，不生成空配置。
- **系统字段**：`scripts-lite.js` 不碰 `dns`/`hosts`/`ntp`/`sniffer`/`tun`；`scripts-personal.js` 会接管其中多项（见文件表）。

## 隐私

- 脚本只在你自己的 FlClash 客户端内运行，不发起网络请求。
- 不读取、不收集、不上传任何订阅、节点或流量数据。
- 订阅配置与节点列表只存在于你的本地客户端配置中。

## 关于

- 脚本通过客户端的覆写 / 脚本机制注入，FlClash 更新可能导致行为变化，请关注仓库更新。
- 本仓库与 FlClash 官方无关，规则语法与字段以 Clash Meta 内核文档为准。

## 许可证

本项目基于 [Apache License 2.0](./LICENSE) 开源。
