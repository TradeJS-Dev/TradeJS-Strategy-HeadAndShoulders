import { createStrategyConfigParser } from "@tradejs/strategy-kit/config";
import type { ValidatedStrategyRegistryEntry } from "@tradejs/strategy-kit/config";
import { config as DEFAULT_CONFIG, HeadAndShouldersConfig } from "./config";
import { createHeadAndShouldersCore } from "./core";
import { headAndShouldersManifest } from "./manifest";

export const HeadAndShouldersStrategyDefinition: ValidatedStrategyRegistryEntry<HeadAndShouldersConfig> =
  {
    defaults: DEFAULT_CONFIG,
    parseConfig: createStrategyConfigParser({
      strategyName: "HeadAndShoulders",
      defaults: DEFAULT_CONFIG,
    }),
    createCore: createHeadAndShouldersCore,
    manifest: headAndShouldersManifest,
  };
