<div align="center">
  <img src="./icon.svg" width="100" height="100" alt="FlClash Scripts">
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

Subscription enhancement scripts for FlClash. Paste the full script into the client's Overwrite / Script section to auto-clean nodes, group them by region and fix config errors. Two versions are provided: the minimal one injects no routing rules and keeps the subscription's own; the personal one is used daily by the author and is not part of public releases.

## Install

Install FlClash first, then open FlClash → Config → select your subscription → Overwrite / Script, paste the full text of the **[Get the Script](https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-lite.js)** and save. Update the subscription once (or restart the kernel) to apply.

The script rebuilds the whole `proxy-groups`; back up your subscription config before first use.

## Files

| File | Purpose |
| ---- | ---- |
| `scripts-lite.js` | Minimal (recommended): only cleans nodes and fixes config errors; injects no routing rules |
| `scripts-personal.js` | Personal: what the author uses daily; additionally bundles routing rules and takes over DNS and other system fields; not part of public releases |
| `tools/` | Maintainer tools: behavior assertion tests |

## Features

`scripts-lite.js` does four things:

- **Node cleaning**: removes nodes whose names contain ad words like "buy", "rebate", "official"; renames duplicates instead of dropping them.
- **Node grouping**: auto-groups nodes into US / Japan / Singapore / Hong Kong / Taiwan / Others by region, with optional auto speed-test.
- **Config fixing**: drops rules that reference rule sets not declared by the subscription (they would fail the whole config); throws instead of emitting an empty config when no valid node exists.
- **No rule injection**: injects no routing rules; the subscription's own rules stay untouched.

`scripts-personal.js` does all of the above, plus bundles its own routing rules and takes over `dns` / `hosts` / `ntp` / `sniffer` — a personal setup; use at your own discretion.

## Privacy

- Scripts run only inside your own FlClash client and make no network requests.
- No subscription, node or traffic data is read, collected or uploaded.
- Subscription config and node list stay only in your local client config.

## About

- Scripts inject through the client's Overwrite / Script mechanism; FlClash updates may change behavior — watch this repo for updates.
- This repo is not affiliated with FlClash; rule syntax and fields follow the Clash Meta kernel docs.

## License

Licensed under the [Apache License 2.0](./LICENSE).
