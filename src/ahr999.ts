import {
  FIT_A,
  FIT_B,
  GENESIS,
  MA_WINDOW,
  QUANTILE_MIN_OBS,
  QUANTILE_WINDOW,
} from "./config.js";
import type { Ahr999Point, BtcClosePoint } from "./schema.js";
import { dateToUtcMs } from "./time.js";
import { DAY_MS } from "./config.js";

export function computeFittedValue(date: string): number {
  const coinAgeDays = Math.floor(
    (dateToUtcMs(date) - dateToUtcMs(GENESIS)) / DAY_MS,
  );
  if (coinAgeDays <= 0) {
    throw new Error(`Invalid BTC coin age for ${date}`);
  }
  return 10 ** (FIT_A * Math.log10(coinAgeDays) + FIT_B);
}

export function computeAhr999Value(params: {
  close: number;
  ma200: number;
  date: string;
}): number {
  const fittedValue = computeFittedValue(params.date);
  return (params.close / params.ma200) * (params.close / fittedValue);
}

function average(values: number[]): number {
  let sum = 0;
  for (const value of values) {
    sum += value;
  }
  return sum / values.length;
}

function quantileRank(window: number[], current: number): number | null {
  if (window.length === 0) {
    return null;
  }
  let rank = 0;
  for (const value of window) {
    if (value <= current) {
      rank += 1;
    }
  }
  return rank / window.length;
}

export interface Ahr999Options {
  minAhrObservations?: number;
  rollingWindowDays?: number;
}

export function computeAhr999Series(
  closes: BtcClosePoint[],
  options?: Ahr999Options,
): Ahr999Point[] {
  const sorted = [...closes].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  const minAhrObservations = options?.minAhrObservations ?? QUANTILE_MIN_OBS;
  const rollingWindowDays = options?.rollingWindowDays ?? QUANTILE_WINDOW;
  const seenCloses: number[] = [];
  const validAhrValues: number[] = [];
  const points: Ahr999Point[] = [];

  for (const point of sorted) {
    const close = point.close;
    seenCloses.push(close);

    if (seenCloses.length < MA_WINDOW) {
      points.push({
        date: point.date,
        close,
        ma200: null,
        ahr999: null,
        quantile5y: null,
        windowKind: "insufficient_samples",
      });
      continue;
    }

    const ma200 = average(seenCloses.slice(-MA_WINDOW));
    const ahr999 = computeAhr999Value({ close, ma200, date: point.date });
    validAhrValues.push(ahr999);

    if (validAhrValues.length < minAhrObservations) {
      points.push({
        date: point.date,
        close,
        ma200,
        ahr999,
        quantile5y: null,
        windowKind: "insufficient_samples",
      });
      continue;
    }

    const useRollingWindow = validAhrValues.length >= rollingWindowDays;
    const window = useRollingWindow
      ? validAhrValues.slice(-rollingWindowDays)
      : validAhrValues;
    const quantile5y = quantileRank(window, ahr999);

    points.push({
      date: point.date,
      close,
      ma200,
      ahr999,
      quantile5y,
      windowKind: useRollingWindow ? "rolling_5y" : "expanding",
    });
  }

  return points;
}
