import { defineStrategyPlugin } from "@tradejs/core/config";
import type { StrategyConfig, StrategyRegistryEntry } from "@tradejs/types";
import { config as headAndShouldersDefaultConfig } from "./HeadAndShoulders/config";
import { HeadAndShouldersStrategyDefinition } from "./HeadAndShoulders/strategy";

export const strategyEntries: StrategyRegistryEntry[] = [
  HeadAndShouldersStrategyDefinition,
];

const defaultConfigs: Record<string, StrategyConfig> = {
  HeadAndShoulders: headAndShouldersDefaultConfig,
};

export const getBuiltInStrategyDefaultConfig = (
  strategyName: string,
): StrategyConfig | undefined => defaultConfigs[strategyName];

export { HeadAndShouldersStrategyDefinition } from "./HeadAndShoulders/strategy";
export { headAndShouldersDefaultConfig };
export { headAndShouldersManifest } from "./HeadAndShoulders/manifest";
export { headAndShouldersAiAdapter } from "./HeadAndShoulders/adapters/ai";

export default defineStrategyPlugin({ strategyEntries });
