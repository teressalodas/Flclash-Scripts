<div align="center">
  <img src="https://raw.githubusercontent.com/chen08209/FlClash/main/assets_source/images/icon/glyph.svg" width="100" height="100" alt="FlClash Scripts">
  <h1>FlClash Scripts</h1>
</div>

<p align="center">
  <a href="https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-lite.js">
    <img src="https://img.shields.io/badge/GitHub-Get%20the%20Script-red?style=for-the-badge&logo=github" alt="Get the Script" />
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=for-the-badge" alt="License: Apache License 2.0" />
  </a>
</p>

<p align="center"><a href="./README.md">简体中文</a> | English</p>

Enhancement scripts for FlClash subscriptions. Paste the full script into the client's Overwrite / Script section to auto-organize nodes. Two versions: the minimal one injects no rules and keeps the subscription's own; the personal one takes over more system fields and is not part of public releases.

## Install

Install FlClash first, then open FlClash → Config → select your subscription → Overwrite / Script, paste the full text of the **[Get the Script](https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-lite.js)** and save. Update the subscription once (or restart the kernel) to apply.

Back up your current subscription config before first use — the script rebuilds the whole `proxy-groups`.

## Files

| File | Purpose |
| ---- | ---- |
| `scripts-lite.js` | Minimal: cleans node names, builds region groups, fixes broken group references; injects no rules, the subscription's own rules stay untouched |
| `scripts-personal.js` | Personal variant based on an early full-featured script; takes over `dns`/`hosts`/`ntp`/`sniffer`/`geodata-loader`; not part of public releases |
| `tools/` | Maintainer tools: behavior assertion tests |

## Features

- **Node organizing**: blacklist filtering, flag emoji / name normalization, region grouping (auto speed-test or manual), duplicate-name retention.
- **Rule boundary**: `scripts-lite.js` injects no rule sets; the subscription's third-party rules stay in effect.
- **Empty-config guard**: throws instead of emitting an empty config when no valid node exists.
- **System fields**: `scripts-lite.js` never touches `dns`/`hosts`/`ntp`/`sniffer`/`tun`; `scripts-personal.js` takes over several of them (see Files).

## Privacy

- Scripts run only inside your own FlClash client and make no network requests.
- No subscription, node or traffic data is read, collected or uploaded.
- Subscription config and node list stay only in your local client config.

## About

- Scripts inject through the client's Overwrite / Script mechanism; FlClash updates may change behavior — watch this repo for updates.
- This repo is not affiliated with FlClash; rule syntax and fields follow the Clash Meta kernel docs.

## License

Licensed under the [Apache License 2.0](./LICENSE).
