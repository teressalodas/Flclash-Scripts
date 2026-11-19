<div align="center">
  <img src="./icon.svg" width="100" height="100" alt="FlClash Scripts">
  <h1>FlClash Scripts</h1>
</div>

<p align="center"><a href="./README.md">简体中文</a> | English</p>

Subscription enhancement scripts for FlClash. Add the script via the client's Extension section to auto-clean nodes, group them by region, and fix config errors. Two versions are provided: the minimal one injects no routing rules and keeps the subscription's own; the personal one additionally bundles its own routing rules and takes over system fields. Both share the same core logic and evolve in sync.

## Install

Install FlClash first, then open FlClash → `Config` → select your subscription → `Extension` (`Overwrite` / `Script` in older versions).

### Option 1: Import via URL (recommended for easy updates)

Copy one of the script URLs below, paste and save, then update the subscription once (or restart the kernel) to apply.

**Minimal (recommended):**

```text
https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-lite.js
```

**Personal:**

```text
https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-personal.js
```

### Option 2: Paste manually

Open **[Minimal Script](https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-lite.js)** or **[Personal Script](https://raw.githubusercontent.com/teressalodas/FlClash-Scripts/main/scripts-personal.js)** and paste the full text into the editor (useful if you want to customize the `options` switches at the top).

The script rebuilds the whole `proxy-groups`; back up your subscription config before first use.

## Files

| File | Purpose |
| ---- | ---- |
| `scripts-lite.js` | Minimal (recommended): only cleans nodes and fixes config errors; injects no routing rules |
| `scripts-personal.js` | Personal: for the author's own use; shares the same core logic with the public version, additionally bundles routing rules and takes over DNS and other system fields |
| `tools/` | Maintainer tools: behavior assertion tests |

## Features

`scripts-lite.js` provides the following capabilities:

- **Node cleaning**: filters out nodes whose names contain advertising or marketing keywords (with optional high-rate filtering); renames duplicates instead of dropping them.
- **Region grouping**: groups nodes into US / Japan / Singapore / Hong Kong / Taiwan / Others and keeps an "All Nodes" group; defaults to periodic speed-test with manual selection, with an option to auto-select the lowest-latency node.
- **Config fixing**: drops rules referencing rule sets the subscription does not declare, preventing the whole config from failing to load; throws instead of emitting an empty config when no valid node exists.
- **Rule neutrality**: injects no routing rules; the subscription's own rules are preserved and remain effective.

Beyond the above, `scripts-personal.js` additionally bundles its own routing rules and takes over system fields such as `dns` / `hosts` / `ntp` / `sniffer`. This version is for the author's personal use; adopt it at your own discretion.

## Privacy

- Scripts run only inside your own FlClash client and make no network requests.
- No subscription, node or traffic data is read, collected or uploaded.
- Subscription config and node list stay only in your local client config.

## About

- Scripts inject through the client's Extension / Overwrite mechanism; FlClash updates may change behavior — watch this repo for updates.
- This repo is not affiliated with FlClash; rule syntax and fields follow the Clash Meta kernel docs.

## License

Licensed under the [Apache License 2.0](./LICENSE).
