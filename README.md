# @tradejs/strategy-head-and-shoulders

TradeJS strategy plugin providing `HeadAndShoulders`.

## Strategy overview

`HeadAndShoulders` detects bearish head-and-shoulders and optional bullish
inverse formations from pivots. It checks shoulder symmetry, head prominence,
neckline slope, prior trend, and pattern age, then supports breakout,
close-acceptance, or retest entries with height-based risk geometry.

## Logic at a glance

![HeadAndShoulders strategy logic](https://raw.githubusercontent.com/TradeJS-Dev/TradeJS-Strategy-HeadAndShoulders/main/docs/strategy-logic.svg)

## Install

```bash
yarn add @tradejs/strategy-head-and-shoulders
```

Register the package in `tradejs.config.ts`:

```ts
import { defineConfig } from "@tradejs/core/config";

export default defineConfig({
  strategies: ["@tradejs/strategy-head-and-shoulders"],
});
```

The package exports `strategyEntries` for the TradeJS plugin loader together
with its strategy definitions, manifests, default configs, and public AI/ML
adapters. Strategy implementation changes are released from this repository,
independently of the TradeJS engine.

## Development

```bash
yarn install --immutable
yarn checks
```

Publishing is beta-first and delegated to the pinned
`TradeJS-Workflows@v1` reusable workflow. A relevant push publishes a unique
prerelease and moves the npm `beta` tag only after the production-like Project
image passes. The current verified beta is promoted to one stable `latest`
release by the weekly automation; production never consumes prereleases.

Keywords: ai, claude, codex.
