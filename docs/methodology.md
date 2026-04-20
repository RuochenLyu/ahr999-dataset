# Methodology

> How `ahr999-dataset` computes every field, the constants involved, and how
> this version differs from the original 九神 formulation and the popular
> `9992100.xyz` display.

## Inputs

- **Price source**: Binance public endpoint `GET /api/v3/klines` with
  `symbol=BTCUSDT`, `interval=1d`. We keep only the **close** field from each
  kline (the repo does not redistribute raw OHLCV data).
- **Backfill start**: `2017-08-17` — the earliest daily bar Binance serves
  for BTCUSDT.
- **Cutoff**: `today_UTC − 1 day` (the last fully closed UTC day). The
  current UTC day is a partial bar and would make `quantile5y` jitter
  intraday.

## Constants

| name | value | role |
|---|---|---|
| `GENESIS` | `2009-01-03` | BTC genesis block date; anchor for coin age. |
| `MA_WINDOW` | `200` | Rolling window for `ma200`. |
| `FIT_A` | `5.84` | Slope of the log-log fitted "fair value" curve. |
| `FIT_B` | `−17.01` | Intercept of the fitted curve. |
| `QUANTILE_MIN_OBS` | `365` | Minimum valid AHR observations before we report `quantile5y`. |
| `QUANTILE_WINDOW` | `1825` (5 × 365) | Rolling window size once we have enough observations. |

## Step-by-step

For each UTC day `d` with close `c_d`:

### 1. 200-day moving average

```
ma200_d = mean(close_{d-199 .. d})
```

If fewer than 200 closes have been observed (inclusive of `d`), then
`ma200_d = null` and every downstream field is also `null`,
`windowKind = "insufficient_samples"`.

### 2. Fitted fair value

The fitted curve treats BTC like a stock-to-flow / age-anchored asset:

```
coin_age_days_d = floor( (d − GENESIS) / 1 day )
fitted_d        = 10 ^ (FIT_A · log10(coin_age_days_d) + FIT_B)
                = 10 ^ (5.84 · log10(coin_age_days_d) − 17.01)
```

### 3. AHR999

```
ahr999_d = (c_d / ma200_d) · (c_d / fitted_d)
```

Two components multiplied:

- **Momentum**: `c_d / ma200_d` — how expensive BTC is relative to its own
  recent 200-day cost basis. >1 means the market is above the DCA cost;
  <1 means it's below.
- **Age-anchored cheapness**: `c_d / fitted_d` — how expensive BTC is
  relative to its fitted long-run trajectory.

The product compresses both signals into a single scalar. Folk thresholds
that appear on dashboards:

- `< 0.45` — "bargain" (抄底区)
- `0.45 – 1.2` — "DCA zone" (定投区)
- `1.2 – 3` — "caution" (谨慎区)
- `> 3` — "bubble" (泡沫区)

These thresholds are heuristic and not part of the formal definition.

### 4. 5-year quantile

`quantile5y_d` is the **empirical rank** of `ahr999_d` in a window of
recent valid AHR values (including the current value itself):

```
quantile5y_d = count(v in window : v ≤ ahr999_d) / window.length
```

The window depends on how many valid AHR observations exist so far:

| valid observations so far | window | `windowKind` | `quantile5y` |
|---|---|---|---|
| `< QUANTILE_MIN_OBS` (365) | — | `insufficient_samples` | `null` |
| `[365, 1825)` | all valid observations to date (expanding) | `expanding` | reported |
| `≥ 1825` (5y) | last 1,825 valid observations (rolling) | `rolling_5y` | reported |

### Note on the empirical rank vs. linear interpolation

We intentionally use the discrete rank (`count(v ≤ current) / N`), not
numpy's default linear-interpolation quantile. Rationale:

- The original 九神 implementations in the community all use discrete rank.
- With ~1,800 observations, the discrete rank has resolution ≈ 0.00055 —
  already finer than any actionable interpretation of the number.
- Discrete rank has a crisp interpretation: "what fraction of the last
  5 years was this cheap or cheaper?"

You can verify this by hand at the first non-null quantile row in our dataset,
`2019-03-03`, where `quantile5y = 78 / 365 = 0.2136986301369863` exactly.

## Differences from other AHR999 implementations

### vs. the original 九神 formula

We use identical constants (`FIT_A = 5.84`, `FIT_B = −17.01`,
`MA_WINDOW = 200`, 5-year quantile). The only deliberate choices we make
that you should know about:

- **Price source**: we use Binance BTCUSDT. Some older analyses used
  coinmarketcap or okx. These diverge pre-2018 but converge to ≤ 0.1%
  after BTCUSDT volumes become dominant.
- **Window kind explicit**: we expose `windowKind` so downstream consumers
  can filter out rows during the 365-to-1,825 expanding-window warmup.

### vs. `9992100.xyz`

`9992100.xyz` is the most popular Chinese-language AHR999 dashboard.
Small daily divergences (≤ 0.02 in absolute AHR999 value) are expected
because:

- They may update at a different UTC-adjacent cutoff.
- Their underlying price source and close timestamp semantics are not
  documented.

Both sites should agree on the **regime** (bargain / DCA / caution /
bubble) on any given day; don't chase numerical parity across unrelated
implementations.

## Reproduce end-to-end

```bash
pnpm sync:backfill
pnpm export:csv
pnpm verify   # repo checkpoints assert first quantile/rolling rows exactly
```

If you set `AHR999_SOURCE_BASELINE_PATH=/path/to/another/ahr999-daily.jsonl`,
`pnpm verify` will additionally do a row-by-row compare against that file
with a `< 1e-9` relative-error tolerance. Without that environment variable,
the command still enforces the repo-local checkpoints and dataset invariants.
