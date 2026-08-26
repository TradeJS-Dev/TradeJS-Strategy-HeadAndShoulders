import type { AiPayload, Direction, Signal } from "@tradejs/types";
import { headAndShouldersAiAdapter } from "../adapters/ai";

const evaluateLocalGate = ({
  direction = "SHORT",
  upperWickPct = 0.3,
  altBasketReturn24h = -0.005,
  distanceToPointOfControlAtr = 2,
  centerlineSlope = 0,
}: {
  direction?: Direction;
  upperWickPct?: number;
  altBasketReturn24h?: number;
  distanceToPointOfControlAtr?: number;
  centerlineSlope?: number;
} = {}) =>
  headAndShouldersAiAdapter.postProcessLocalAnalysis?.({
    signal: {
      direction,
      prices: { takeProfitPrice: 90, stopLossPrice: 105 },
    } as Signal,
    payload: {
      additionalIndicators: {
        baseContext: {
          structure: { candleQuality: { upperWickPct } },
          relative: { btcAltRegime: { altBasketReturn24h } },
          participation: {
            priceVolumeProfile: { distanceToPointOfControlAtr },
          },
          regime: { trend: { adaptiveChannel: { centerlineSlope } } },
        },
      },
    } as unknown as AiPayload,
    analysis: { direction, quality: 5 },
  });

describe("HeadAndShoulders AI adapter", () => {
  it("copies strategy geometry into the AI payload", () => {
    const context = {
      patternKind: "head_and_shoulders",
      shoulderDifferencePct: 5,
    };
    const payload = headAndShouldersAiAdapter.buildPayload?.({
      signal: {
        additionalIndicators: { headAndShouldersContext: context },
      } as any,
      basePayload: { additionalIndicators: { baseContext: {} } } as any,
    });

    expect((payload as any).additionalIndicators.headAndShouldersContext).toBe(
      context,
    );
  });

  it("approves the rounded SHORT wick/breadth boundary", () => {
    expect(evaluateLocalGate()).toEqual(
      expect.objectContaining({
        direction: "SHORT",
        quality: 4,
        approved: true,
        gateDecision: "approved",
      }),
    );
  });

  it("approves the frozen LONG POC/slope boundary", () => {
    expect(evaluateLocalGate({ direction: "LONG" })).toEqual(
      expect.objectContaining({
        direction: "LONG",
        quality: 4,
        approved: true,
        gateDecision: "approved",
      }),
    );
  });

  it.each([
    ["upper wick above boundary", { upperWickPct: 0.300001 }],
    ["breadth below boundary", { altBasketReturn24h: -0.005001 }],
  ])("rejects %s", (_name, overrides) => {
    expect(evaluateLocalGate(overrides)).toEqual(
      expect.objectContaining({
        direction: null,
        quality: 3,
        approved: false,
        gateDecision: "rejected",
      }),
    );
  });

  it.each([
    ["POC distance below boundary", { distanceToPointOfControlAtr: 1.999999 }],
    ["negative channel slope", { centerlineSlope: -0.000001 }],
  ])("rejects LONG when %s", (_name, overrides) => {
    expect(evaluateLocalGate({ direction: "LONG", ...overrides })).toEqual(
      expect.objectContaining({
        direction: null,
        quality: 3,
        approved: false,
        gateDecision: "rejected",
      }),
    );
  });

  it("rejects when a required causal feature is missing", () => {
    const result = headAndShouldersAiAdapter.postProcessLocalAnalysis?.({
      signal: {
        direction: "SHORT",
        prices: { takeProfitPrice: 90, stopLossPrice: 105 },
      } as Signal,
      payload: {
        additionalIndicators: { baseContext: {} },
      } as unknown as AiPayload,
      analysis: { direction: "SHORT", quality: 5 },
    });

    expect(result).toEqual(
      expect.objectContaining({
        direction: null,
        quality: 3,
        approved: false,
        gateDecision: "rejected",
      }),
    );
  });
});
