/** @jest-environment node */

import { config as DEFAULT_CONFIG } from "../config";
import {
  buildHeadAndShouldersSignalContext,
  createHeadAndShouldersEngine,
} from "../engine";

const makeCandle = (
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
) => ({
  timestamp: 1_700_000_000_000 + index * 60_000,
  dt: new Date(1_700_000_000_000 + index * 60_000).toISOString(),
  open,
  high,
  low,
  close,
  volume: 1_000,
  turnover: close * 1_000,
});

const makeConfig = (overrides: Record<string, unknown> = {}) =>
  ({
    ...DEFAULT_CONFIG,
    HEADSHOULDERS_PIVOT_LOOKBACK: 1,
    HEADSHOULDERS_SHOULDER_TOLERANCE_PCT: 50,
    HEADSHOULDERS_MIN_HEAD_PROMINENCE_RATIO: 0.1,
    HEADSHOULDERS_MIN_HEAD_HEIGHT_PCT: 0,
    HEADSHOULDERS_MIN_HEAD_HEIGHT_ATR: 0,
    HEADSHOULDERS_MIN_PATTERN_BARS: 4,
    HEADSHOULDERS_MIN_PATTERN_SYMMETRY_RATIO: 0,
    HEADSHOULDERS_MAX_NECKLINE_SLOPE_RATIO: 1,
    HEADSHOULDERS_MAX_PRIOR_MOVE_ATR: 0,
    HEADSHOULDERS_MIN_BREAKOUT_DISTANCE_ATR: 0,
    HEADSHOULDERS_MAX_BREAKOUT_DISTANCE_HEIGHT_RATIO: 0,
    HEADSHOULDERS_MAX_BREAKOUT_DISTANCE_PCT: 5,
    HEADSHOULDERS_ENTRY_MODE: "breakout",
    ...overrides,
  }) as any;

const makeClassicCandles = () => [
  makeCandle(0, 100, 102, 98, 100),
  makeCandle(1, 100, 110, 99, 105),
  makeCandle(2, 105, 105, 98, 104),
  makeCandle(3, 104, 104, 95, 97),
  makeCandle(4, 97, 108, 98, 105),
  makeCandle(5, 105, 120, 103, 117),
  makeCandle(6, 117, 110, 99, 103),
  makeCandle(7, 103, 106, 96, 98),
  makeCandle(8, 98, 109, 100, 106),
  makeCandle(9, 106, 111, 102, 109),
  makeCandle(10, 109, 105, 97, 99),
  makeCandle(11, 99, 101, 92, 94),
];

const makeInverseCandles = () => [
  makeCandle(0, 100, 102, 98, 100),
  makeCandle(1, 100, 101, 90, 94),
  makeCandle(2, 94, 102, 95, 99),
  makeCandle(3, 99, 105, 96, 103),
  makeCandle(4, 103, 102, 92, 96),
  makeCandle(5, 96, 97, 80, 83),
  makeCandle(6, 83, 103, 91, 100),
  makeCandle(7, 100, 104, 95, 102),
  makeCandle(8, 102, 101, 92, 96),
  makeCandle(9, 96, 100, 89, 92),
  makeCandle(10, 92, 103, 94, 101),
  makeCandle(11, 101, 108, 100, 107),
];

const retimeCandle = (
  candle: ReturnType<typeof makeCandle>,
  index: number,
) => ({
  ...candle,
  timestamp: 1_700_000_000_000 + index * 60_000,
  dt: new Date(1_700_000_000_000 + index * 60_000).toISOString(),
});

const makeWideContextCandles = ({
  pattern,
  direction,
  competingExtreme,
}: {
  pattern: ReturnType<typeof makeClassicCandles>;
  direction: "LONG" | "SHORT";
  competingExtreme?: number;
}) => {
  const prelude = Array.from({ length: 8 }, (_, index) => {
    const value = 90 + index;
    return makeCandle(index, value, value + 1, value - 1, value);
  });

  if (competingExtreme != null && direction === "SHORT") {
    prelude[1] = makeCandle(1, 91, competingExtreme, 90, 91);
    prelude[2] = makeCandle(2, 92, 93, 80, 92);
  } else if (competingExtreme != null) {
    prelude[1] = makeCandle(1, 91, 92, competingExtreme, 91);
    prelude[2] = makeCandle(2, 92, 120, 91, 92);
  }

  return [
    ...prelude,
    ...pattern.map((candle, index) => retimeCandle(candle, index + 8)),
  ];
};

const makeLongSpanClassicCandles = () => {
  const keyPoints = [
    [0, 100],
    [100, 109],
    [125, 96],
    [150, 119],
    [175, 97],
    [200, 110],
    [202, 94],
  ] as const;

  return Array.from({ length: 203 }, (_, index) => {
    const rightKeyPointIndex = keyPoints.findIndex(([key]) => key >= index);
    const right = keyPoints[Math.max(1, rightKeyPointIndex)];
    const left = keyPoints[Math.max(0, rightKeyPointIndex - 1)];
    const progress = (index - left[0]) / (right[0] - left[0]);
    const value = left[1] + (right[1] - left[1]) * progress;
    return makeCandle(index, value, value + 1, value - 1, value);
  });
};

type TextbookFailure =
  | "wide-context"
  | "temporal-legs"
  | "lobe-balance"
  | "lobe-height"
  | "prior-move";

const makeTextbookPatternCandles = ({
  direction,
  failure,
}: {
  direction: "LONG" | "SHORT";
  failure?: TextbookFailure;
}) => {
  const positions =
    failure === "temporal-legs"
      ? ([0, 1, 2, 5, 8, 9, 11] as const)
      : ([0, 1, 3, 5, 7, 9, 11] as const);
  const shortValues =
    failure === "lobe-balance"
      ? ([100, 110, 95, 120, 96, 101, 94] as const)
      : failure === "lobe-height"
        ? ([100, 98, 95, 120, 96, 99, 94] as const)
        : ([100, 110, 95, 120, 96, 111, 94] as const);
  const values =
    direction === "SHORT"
      ? shortValues
      : shortValues.map((value) => 200 - value);
  const keyPoints = positions.map(
    (position, index) => [position, values[index]] as const,
  );

  return Array.from(
    { length: positions[positions.length - 1] + 1 },
    (_, index) => {
      const rightKeyPointIndex = keyPoints.findIndex(
        ([position]) => position >= index,
      );
      const right = keyPoints[Math.max(1, rightKeyPointIndex)];
      const left = keyPoints[Math.max(0, rightKeyPointIndex - 1)];
      const progress = (index - left[0]) / (right[0] - left[0]);
      const value = left[1] + (right[1] - left[1]) * progress;
      return makeCandle(index, value, value + 1, value - 1, value);
    },
  );
};

const makeTextbookCandles = ({
  direction,
  failure,
}: {
  direction: "LONG" | "SHORT";
  failure?: TextbookFailure;
}) => {
  const pattern = makeTextbookPatternCandles({ direction, failure });
  const candles = makeWideContextCandles({
    pattern,
    direction,
    competingExtreme:
      failure === "wide-context"
        ? direction === "SHORT"
          ? 122
          : 78
        : undefined,
  });

  if (failure === "prior-move") {
    candles[1] =
      direction === "SHORT"
        ? makeCandle(1, 115, 116, 114, 115)
        : makeCandle(1, 85, 86, 84, 85);
  }
  return candles;
};

const makeTextbookConfig = (overrides: Record<string, unknown> = {}) =>
  makeConfig({
    HEADSHOULDERS_REQUIRE_TEXTBOOK_GEOMETRY: true,
    HEADSHOULDERS_PRIOR_TREND_LOOKBACK: 8,
    ...overrides,
  });

describe("HeadAndShoulders engine", () => {
  it("detects a classic head-and-shoulders neckline breakdown", () => {
    const engine = createHeadAndShouldersEngine({ config: makeConfig() });
    const states = makeClassicCandles().map((candle) =>
      engine.next(candle as any),
    );
    const pattern = states[states.length - 1].pattern;

    expect(pattern?.kind).toBe("head_and_shoulders");
    expect(pattern?.direction).toBe("SHORT");
    expect(pattern?.pivots.map((pivot) => pivot.value)).toEqual([
      110, 95, 120, 96, 111,
    ]);
    expect(pattern?.neckline).toBe(97);
    expect(pattern?.breakoutDelayBars).toBe(2);
    expect(pattern?.targetPrice).toBeLessThan(pattern?.neckline ?? 0);
    expect(pattern?.stopLossPrice).toBeGreaterThan(120);
  });

  it("detects an inverse head-and-shoulders neckline breakout", () => {
    const engine = createHeadAndShouldersEngine({ config: makeConfig() });
    const states = makeInverseCandles().map((candle) =>
      engine.next(candle as any),
    );
    const pattern = states[states.length - 1].pattern;

    expect(pattern?.kind).toBe("inverse_head_and_shoulders");
    expect(pattern?.direction).toBe("LONG");
    expect(pattern?.pivots.map((pivot) => pivot.value)).toEqual([
      90, 105, 80, 104, 89,
    ]);
    expect(pattern?.neckline).toBe(103);
    expect(pattern?.targetPrice).toBeGreaterThan(pattern?.neckline ?? Infinity);
    expect(pattern?.stopLossPrice).toBeLessThan(80);
  });

  it("accepts an isolated classic pattern in its full wide context", () => {
    const candles = makeWideContextCandles({
      pattern: makeClassicCandles(),
      direction: "SHORT",
    });
    const engine = createHeadAndShouldersEngine({
      config: makeConfig({
        HEADSHOULDERS_REQUIRE_WIDE_CONTEXT_ISOLATION: true,
      }),
    });
    const states = candles.map((candle) => engine.next(candle as any));
    const pattern = states[states.length - 1].pattern;

    expect(pattern?.kind).toBe("head_and_shoulders");
    expect(pattern?.wideContextIsolationRatio).toBeGreaterThan(0);
    expect(pattern?.wideContextBars).toBe(19);
    expect(pattern?.wideContextStartTimestamp).toBe(candles[1].timestamp);
    expect(pattern?.wideContextCompetingExtreme).toBe(111);
  });

  it("rejects a classic pattern nested under a prior higher high", () => {
    const candles = makeWideContextCandles({
      pattern: makeClassicCandles(),
      direction: "SHORT",
      competingExtreme: 121,
    });
    const engine = createHeadAndShouldersEngine({
      config: makeConfig({
        HEADSHOULDERS_REQUIRE_WIDE_CONTEXT_ISOLATION: true,
      }),
    });
    const states = candles.map((candle) => engine.next(candle as any));

    expect(states[states.length - 1].pattern).toBeNull();
  });

  it("rejects the LONG mirror nested above a prior lower low", () => {
    const candles = makeWideContextCandles({
      pattern: makeInverseCandles(),
      direction: "LONG",
      competingExtreme: 79,
    });
    const engine = createHeadAndShouldersEngine({
      config: makeConfig({
        HEADSHOULDERS_REQUIRE_WIDE_CONTEXT_ISOLATION: true,
      }),
    });
    const states = candles.map((candle) => engine.next(candle as any));

    expect(states[states.length - 1].pattern).toBeNull();
  });

  it("accepts an equal competing extreme", () => {
    const candles = makeWideContextCandles({
      pattern: makeClassicCandles(),
      direction: "SHORT",
      competingExtreme: 120,
    });
    const engine = createHeadAndShouldersEngine({
      config: makeConfig({
        HEADSHOULDERS_REQUIRE_WIDE_CONTEXT_ISOLATION: true,
      }),
    });
    const states = candles.map((candle) => engine.next(candle as any));
    const pattern = states[states.length - 1].pattern;

    expect(pattern?.kind).toBe("head_and_shoulders");
    expect(pattern?.wideContextIsolationRatio).toBe(0);
    expect(pattern?.wideContextCompetingExtreme).toBe(120);
  });

  it("rejects when the full pre-left-shoulder context is unavailable", () => {
    const engine = createHeadAndShouldersEngine({
      config: makeConfig({
        HEADSHOULDERS_REQUIRE_WIDE_CONTEXT_ISOLATION: true,
      }),
    });
    const states = makeClassicCandles().map((candle) =>
      engine.next(candle as any),
    );

    expect(states[states.length - 1].pattern).toBeNull();
  });

  it("does not consult candles after the breakout", () => {
    const candles = makeWideContextCandles({
      pattern: makeClassicCandles(),
      direction: "SHORT",
    });
    const engine = createHeadAndShouldersEngine({
      config: makeConfig({
        HEADSHOULDERS_REQUIRE_WIDE_CONTEXT_ISOLATION: true,
      }),
    });
    const accepted = candles.reduce(
      (_, candle) => engine.next(candle as any),
      engine.getState(),
    );

    expect(accepted.pattern?.kind).toBe("head_and_shoulders");
    expect(
      engine.next(makeCandle(20, 94, 130, 90, 100) as any).pattern,
    ).toBeNull();
    expect(accepted.pattern?.wideContextCompetingExtreme).toBe(111);
  });

  it("retains enough history for a pattern wider than the legacy buffer", () => {
    const candles = makeLongSpanClassicCandles();
    const engine = createHeadAndShouldersEngine({
      config: makeConfig({
        HEADSHOULDERS_MAX_PATTERN_BARS: 120,
        HEADSHOULDERS_REQUIRE_WIDE_CONTEXT_ISOLATION: true,
      }),
    });
    const states = candles.map((candle) => engine.next(candle as any));
    const pattern = states[states.length - 1].pattern;

    expect(pattern?.kind).toBe("head_and_shoulders");
    expect(pattern?.patternDurationBars).toBe(100);
    expect(pattern?.wideContextBars).toBe(203);
    expect(pattern?.wideContextStartTimestamp).toBe(candles[0].timestamp);
  });

  it("omits optional geometry from patterns and signals when disabled", () => {
    const implicit = createHeadAndShouldersEngine({ config: makeConfig() });
    const explicit = createHeadAndShouldersEngine({
      config: makeConfig({
        HEADSHOULDERS_REQUIRE_WIDE_CONTEXT_ISOLATION: false,
      }),
    });
    const implicitStates = makeClassicCandles().map((candle) =>
      implicit.next(candle as any),
    );
    const explicitStates = makeClassicCandles().map((candle) =>
      explicit.next(candle as any),
    );
    const pattern = implicitStates[implicitStates.length - 1].pattern;

    expect(implicitStates).toEqual(explicitStates);
    expect(pattern).not.toBeNull();
    expect(pattern).not.toHaveProperty("wideContextIsolationRatio");
    expect(pattern).not.toHaveProperty("textbookTemporalLegBalanceRatio");
    const signalContext = buildHeadAndShouldersSignalContext(pattern!);
    expect(signalContext).not.toHaveProperty("wideContextIsolationRatio");
    expect(signalContext).not.toHaveProperty("textbookTemporalLegBalanceRatio");
  });

  it("exports wide-context telemetry into the signal context", () => {
    const candles = makeWideContextCandles({
      pattern: makeClassicCandles(),
      direction: "SHORT",
    });
    const engine = createHeadAndShouldersEngine({
      config: makeConfig({
        HEADSHOULDERS_REQUIRE_WIDE_CONTEXT_ISOLATION: true,
      }),
    });
    const states = candles.map((candle) => engine.next(candle as any));
    const pattern = states[states.length - 1].pattern;

    expect(pattern).not.toBeNull();
    expect(buildHeadAndShouldersSignalContext(pattern!)).toEqual(
      expect.objectContaining({
        wideContextIsolationRatio: pattern?.wideContextIsolationRatio,
        wideContextBars: 19,
        wideContextStartTimestamp: candles[1].timestamp,
        wideContextCompetingExtreme: 111,
      }),
    );
  });

  it.each(["SHORT", "LONG"] as const)(
    "accepts isolated, balanced %s textbook geometry",
    (direction) => {
      const candles = makeTextbookCandles({ direction });
      const engine = createHeadAndShouldersEngine({
        config: makeTextbookConfig(),
      });
      const states = candles.map((candle) => engine.next(candle as any));
      const pattern = states[states.length - 1].pattern;

      expect(pattern?.direction).toBe(direction);
      expect(pattern?.wideContextIsolationRatio).toBeGreaterThanOrEqual(0);
      expect(pattern?.textbookTemporalLegBalanceRatio).toBe(1);
      expect(pattern?.textbookShoulderLobeBalanceRatio).toBe(1);
      expect(pattern?.textbookMinShoulderLobeHeightRatio).toBeGreaterThan(0.2);
      expect(pattern?.priorMoveAtr).toBeGreaterThanOrEqual(0);
    },
  );

  it.each(
    (
      [
        "wide-context",
        "temporal-legs",
        "lobe-balance",
        "lobe-height",
        "prior-move",
      ] as const
    ).flatMap((failure) =>
      (["SHORT", "LONG"] as const).map(
        (direction) => [direction, failure] as const,
      ),
    ),
  )("rejects %s textbook geometry with invalid %s", (direction, failure) => {
    const candles = makeTextbookCandles({ direction, failure });
    const engine = createHeadAndShouldersEngine({
      config: makeTextbookConfig(),
    });
    const states = candles.map((candle) => engine.next(candle as any));

    expect(states[states.length - 1].pattern).toBeNull();
  });

  it.each(["SHORT", "LONG"] as const)(
    "keeps the accepted %s textbook decision causal after a future extreme",
    (direction) => {
      const candles = makeTextbookCandles({ direction });
      const engine = createHeadAndShouldersEngine({
        config: makeTextbookConfig(),
      });
      const accepted = candles.reduce(
        (_, candle) => engine.next(candle as any),
        engine.getState(),
      );
      const acceptedSnapshot = structuredClone(accepted);
      const future =
        direction === "SHORT"
          ? makeCandle(20, 100, 130, 90, 100)
          : makeCandle(20, 100, 110, 70, 100);

      expect(accepted.pattern?.direction).toBe(direction);
      engine.next(future as any);
      expect(accepted).toEqual(acceptedSnapshot);
    },
  );

  it("waits for close acceptance and emits a setup once per timestamp", () => {
    const engine = createHeadAndShouldersEngine({
      config: makeConfig({
        HEADSHOULDERS_ENTRY_MODE: "close_acceptance",
      }),
    });
    const breakout = makeClassicCandles().reduce(
      (_, candle) => engine.next(candle as any),
      engine.getState(),
    );

    expect(breakout.pattern).toBeNull();
    expect(breakout.pending?.stage).toBe("neckline_crossed");

    const confirmation = makeCandle(12, 94, 98, 91, 93);
    const accepted = engine.next(confirmation as any);
    expect(accepted.pattern?.entryStage).toBe("close_accepted");
    expect(accepted.pattern?.confirmationBars).toBe(1);
    expect(accepted.pattern?.confirmationBodyAtr).toBeGreaterThan(0);
    expect(accepted.pattern?.confirmationCloseLocation).toBeCloseTo(2 / 7);
    expect(engine.next(confirmation as any)).toEqual(accepted);
    expect(
      engine.next(makeCandle(13, 93, 96, 90, 92) as any).pattern,
    ).toBeNull();
  });

  it("accepts a neckline retest that closes on the breakdown side", () => {
    const engine = createHeadAndShouldersEngine({
      config: makeConfig({
        HEADSHOULDERS_ENTRY_MODE: "retest",
        HEADSHOULDERS_RETEST_TOLERANCE_ATR: 0.25,
      }),
    });
    for (const candle of makeClassicCandles()) engine.next(candle as any);

    const held = engine.next(makeCandle(12, 94, 98, 91, 93) as any);

    expect(held.pattern?.entryStage).toBe("retest_held");
    expect(held.pending).toBeNull();
  });

  it("rejects a weak confirmation close while the setup is pending", () => {
    const engine = createHeadAndShouldersEngine({
      config: makeConfig({
        HEADSHOULDERS_ENTRY_MODE: "close_acceptance",
        HEADSHOULDERS_MAX_CONFIRMATION_CLOSE_LOCATION: 0.25,
      }),
    });
    for (const candle of makeClassicCandles()) engine.next(candle as any);

    const weakConfirmation = engine.next(makeCandle(12, 93, 98, 91, 94) as any);

    expect(weakConfirmation.pattern).toBeNull();
    expect(weakConfirmation.pending?.stage).toBe("neckline_crossed");
  });

  it("rejects a breakout that is stale relative to the right shoulder", () => {
    const engine = createHeadAndShouldersEngine({
      config: makeConfig({
        HEADSHOULDERS_MAX_BREAKOUT_DELAY_BARS: 1,
      }),
    });
    const states = makeClassicCandles().map((candle) =>
      engine.next(candle as any),
    );

    expect(states[states.length - 1].pattern).toBeNull();
  });

  it("rejects a pattern after an excessive move into the left shoulder", () => {
    const engine = createHeadAndShouldersEngine({
      config: makeConfig({
        HEADSHOULDERS_PRIOR_TREND_LOOKBACK: 1,
        HEADSHOULDERS_MAX_PRIOR_MOVE_ATR: 0.1,
      }),
    });
    const states = makeClassicCandles().map((candle) =>
      engine.next(candle as any),
    );

    expect(states[states.length - 1].pattern).toBeNull();
  });

  it("rebuilds pending state by replaying initial candles", () => {
    const config = makeConfig({
      HEADSHOULDERS_ENTRY_MODE: "close_acceptance",
    });
    const history = makeClassicCandles();
    const confirmation = makeCandle(12, 94, 98, 91, 93);
    const continuous = createHeadAndShouldersEngine({ config });
    for (const candle of history) continuous.next(candle as any);
    const continuousState = continuous.next(confirmation as any);

    const restored = createHeadAndShouldersEngine({
      config,
      initialCandles: history as any,
    });
    expect(restored.next(confirmation as any)).toEqual(continuousState);
  });
});
