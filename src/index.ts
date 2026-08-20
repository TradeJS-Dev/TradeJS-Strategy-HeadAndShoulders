import { defineStrategyPlugin } from "@tradejs/core/config";
import type { ValidatedStrategyRegistryEntry } from "@tradejs/strategy-kit/config";
import type { StrategyConfig } from "@tradejs/types";
import { config as headAndShouldersDefaultConfig } from "./HeadAndShoulders/config";
import { HeadAndShouldersStrategyDefinition } from "./HeadAndShoulders/strategy";

export const strategyEntries: ValidatedStrategyRegistryEntry<any>[] = [
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
