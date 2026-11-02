<div align="center">
  <img src="https://raw.githubusercontent.com/chen08209/FlClash/main/assets_source/images/icon/glyph.svg" width="100" height="100" alt="FlClash Scripts">
  <h1>FlClash Scripts</h1>
</div>

<p align="center">
  <a href="https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-full.js">
    <img src="https://img.shields.io/badge/GitHub-Get%20the%20Script-red?style=for-the-badge&logo=github" alt="Get the Script" />
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=for-the-badge" alt="License: Apache License 2.0" />
  </a>
</p>

<p align="center"><a href="./README.md">简体中文</a> | English</p>

Enhancement scripts for FlClash subscriptions. Paste the full script into the client's Overwrite / Script section to auto-organize nodes and inject routing rules. Three tiers: full-featured, general-purpose and minimal; may also work with Clash Verge Rev (untested).

## Install

Install FlClash first, then open FlClash → Config → select your subscription → Overwrite / Script, paste the full text of the **[Get the Script](https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-full.js)** and save. Update the subscription once (or restart the kernel) to apply.

Back up your current subscription config before first use — the script rebuilds the whole `proxy-groups`.

## Files

| File | Purpose |
| ---- | ---- |
| `scripts-full.js` | Full-featured; supports `proxy-providers` dynamic subscriptions; bundles ad-blocking, AI/Telegram groups, GFW and CN fallback rules |
| `scripts-core.js` | General-purpose; complete features; exposes a `myManualRules` entry |
| `scripts-lite.js` | Minimal; injects no rules, relies entirely on the subscription's own |
| `scripts-personal.js` | Personal variant based on an early `scripts-full`; keeps hosts/ntp/geodata-loader takeover; not part of public releases |
| `tools/` | Maintainer tools: behavior assertion tests |

## Features

- **Node organizing**: blacklist filtering, flag emoji / name normalization, region grouping (auto speed-test or manual), ratio filtering.
- **Routing rules**: `scripts-full.js` / `scripts-core.js` bundle ad-blocking plus GFW and CN fallback; subscription rules are kept and placed after CN-direct.
- **Dynamic subscriptions**: `scripts-full.js` fills region groups via `use` + `filter` for `proxy-providers`.
- **Manual control**: "Manual Select" / "Manual Switch" groups let you pick individual nodes; ratio filtering in `scripts-full.js` only affects auto routing.
- **Behavior boundary**: `scripts-full.js` manages `dns` (fake-ip) and `sniffer`; none of the three public scripts touches `hosts` / `ntp` / `tun` / `geodata-loader` — those stay with FlClash and the subscription.

## Privacy

- Scripts run only inside your own FlClash client and make no network requests.
- No subscription, node or traffic data is read, collected or uploaded.
- Subscription config and node list stay only in your local client config.

## About

- Old scripts1~20 were removed in a cleanup; retrieve historical versions from Git history.
- Scripts inject through the client's Overwrite / Script mechanism; FlClash updates may change behavior — watch this repo for updates.
- This repo is not affiliated with FlClash; rule syntax and fields follow the Clash Meta kernel docs.
- The script rebuilds the whole `proxy-groups`; back up your subscription config before use.
- Auto-routing may mis-route; assess before relying on it for critical or compliance-sensitive use. Follow FlClash and your provider's terms. Issues and PRs are welcome; stars appreciated.

## License

Licensed under the [Apache License 2.0](./LICENSE).
