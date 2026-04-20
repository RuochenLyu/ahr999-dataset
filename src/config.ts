export const GENESIS = "2009-01-03";

export const BACKFILL_START = "2017-08-17";

export const MA_WINDOW = 200;

export const QUANTILE_MIN_OBS = 365;

export const QUANTILE_WINDOW = 5 * 365;

export const FIT_A = 5.84;
export const FIT_B = -17.01;

export const BINANCE_SYMBOL = "BTCUSDT";
export const BINANCE_INTERVAL = "1d";
export const BINANCE_KLINE_LIMIT = 1000;
// Default to data-api.binance.vision — Binance's public market-data mirror
// intended for analytics/backtesting. Same payload shape as api.binance.com
// but reachable from geo-blocked runners (e.g. GitHub-hosted) that get HTTP
// 451 on api.binance.com. Override via AHR999_BINANCE_API_BASE_URL.
export const BINANCE_API_BASE_URL =
  process.env.AHR999_BINANCE_API_BASE_URL?.replace(/\/+$/, "") ??
  "https://data-api.binance.vision";

export const DAY_MS = 24 * 60 * 60 * 1000;

export const RESYNC_LOOKBACK_DAYS = 5;

export const DATASET_JSON_PATH = "datasets/ahr999.json";
export const DATASET_CSV_PATH = "datasets/ahr999.csv";
