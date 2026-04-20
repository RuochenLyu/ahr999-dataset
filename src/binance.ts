import {
  BINANCE_API_BASE_URL,
  BINANCE_INTERVAL,
  BINANCE_KLINE_LIMIT,
  BINANCE_SYMBOL,
  DAY_MS,
} from "./config.js";
import type { BtcClosePoint } from "./schema.js";
import { dateToUtcMs, utcMsToDate } from "./time.js";

type BinanceKlinePayload = [
  number, // openTime
  string, // open
  string, // high
  string, // low
  string, // close
  string, // volume
  ...unknown[],
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function numericValue(raw: string, label: string): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid Binance ${label}: ${raw}`);
  }
  return parsed;
}

async function fetchJson(url: string): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent":
            "ahr999-dataset/0.1.0 (+https://github.com/RuochenLyu/ahr999-dataset)",
        },
      });
      if (!response.ok) {
        throw new Error(
          `Binance market request failed: ${response.status} ${url}`,
        );
      }
      return (await response.json()) as unknown;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const message = lastError.message;
      const retryable =
        message.includes(" 429 ") ||
        message.includes(" 451 ") ||
        message.includes(" 418 ") ||
        / 5\d\d /.test(message) ||
        message.includes("fetch failed") ||
        message.includes("ETIMEDOUT") ||
        message.includes("ECONNRESET");

      if (!retryable || attempt === 3) {
        throw lastError;
      }
    }
    await sleep(500 * 2 ** attempt);
  }

  throw lastError ?? new Error(`Binance market request failed: ${url}`);
}

export async function fetchBinanceDailyCloses(
  startDate: string,
  endDate: string,
): Promise<BtcClosePoint[]> {
  if (endDate < startDate) {
    return [];
  }

  const seen = new Map<string, BtcClosePoint>();
  let startTime = dateToUtcMs(startDate);
  const endTime = dateToUtcMs(endDate) + DAY_MS - 1;

  while (startTime <= endTime) {
    const url = new URL("/api/v3/klines", `${BINANCE_API_BASE_URL}/`);
    url.searchParams.set("symbol", BINANCE_SYMBOL);
    url.searchParams.set("interval", BINANCE_INTERVAL);
    url.searchParams.set("limit", String(BINANCE_KLINE_LIMIT));
    url.searchParams.set("startTime", String(startTime));
    url.searchParams.set("endTime", String(endTime));

    const payload = (await fetchJson(url.toString())) as BinanceKlinePayload[];
    if (!Array.isArray(payload) || payload.length === 0) {
      break;
    }

    for (const item of payload) {
      const openTime = item[0];
      const close = item[4];
      if (typeof openTime !== "number" || typeof close !== "string") {
        throw new Error(
          `Unexpected Binance kline payload row: ${JSON.stringify(item)}`,
        );
      }
      const date = utcMsToDate(openTime);
      seen.set(date, {
        date,
        close: numericValue(close, "close"),
      });
    }

    const lastRow = payload[payload.length - 1];
    const lastOpenTime = lastRow?.[0];
    if (typeof lastOpenTime !== "number") {
      break;
    }
    if (payload.length < BINANCE_KLINE_LIMIT) {
      break;
    }

    startTime = lastOpenTime + DAY_MS;
  }

  return [...seen.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}
