# @tradejs/strategy-head-and-shoulders

TradeJS strategy plugin providing `HeadAndShoulders`.

## Strategy overview

`HeadAndShoulders` detects bearish head-and-shoulders and optional bullish
inverse formations from pivots. It checks shoulder symmetry, head prominence,
neckline slope, prior trend, and pattern age, then supports breakout,
close-acceptance, or retest entries with height-based risk geometry.

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

Publishing is triggered by a GitHub release and delegated to the pinned
`TradeJS-Workflows@v1` reusable workflow.

Keywords: ai, claude, codex.
