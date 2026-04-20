# Data format

The dataset ships in two shapes: JSON (`datasets/ahr999.json`) and CSV
(`datasets/ahr999.csv`). Same rows, same columns, different serializations.

## JSON

Location: [`datasets/ahr999.json`](../datasets/ahr999.json)
(also published at
`https://ahr999.aix4u.com/datasets/ahr999.json`)

Structure: a single JSON array, one object per UTC calendar day, ordered
oldest → newest. Pretty-printed with 2-space indent + trailing newline so
`git diff` on commits stays readable.

```json
[
  {
    "date": "2017-08-17",
    "close": 4261.48,
    "ma200": null,
    "ahr999": null,
    "quantile5y": null,
    "windowKind": "insufficient_samples"
  },
  {
    "date": "2026-04-19",
    "close": 73801.79,
    "ma200": 86578.65964999999,
    "ahr999": 0.4116636687277032,
    "quantile5y": 0.13917808219178082,
    "windowKind": "rolling_5y"
  }
]
```

## CSV

Location: [`datasets/ahr999.csv`](../datasets/ahr999.csv)

Columns (same order as JSON fields), RFC 4180 compatible, UTF-8, trailing
newline:

```
date,close,ma200,ahr999,quantile5y,windowKind
2017-08-17,4261.48,,,,insufficient_samples
...
2026-04-19,73801.79,86578.65964999999,0.4116636687277032,0.13917808219178082,rolling_5y
```

`null` is serialized as an empty field.

## Field reference

| field | JSON type | CSV type | nullable | description |
|---|---|---|---|---|
| `date` | `string` | `YYYY-MM-DD` | no | UTC calendar day; the close is Binance's 00:00-UTC-to-24:00-UTC daily kline close. |
| `close` | `number` | float | no | USDT per BTC, from `/api/v3/klines?symbol=BTCUSDT&interval=1d`, field `[4]`. |
| `ma200` | `number \| null` | float or empty | yes | 200-day simple moving average of `close`. `null` for the first 199 rows. |
| `ahr999` | `number \| null` | float or empty | yes | `(close / ma200) × (close / fitted)`, where `fitted = 10 ^ (5.84 · log10(coin_age_days) − 17.01)`. `null` when `ma200` is null. |
| `quantile5y` | `number \| null` in `[0, 1]` | float or empty | yes | Empirical rank of `ahr999` within the applicable window. `null` during the first 365 valid AHR observations. |
| `windowKind` | `"insufficient_samples" \| "expanding" \| "rolling_5y"` | same string | no | Which window applied for this row. |

## Invariants consumers can rely on

- Rows are sorted strictly ascending by `date`; no duplicates.
- No future dates: the latest `date` is always `≤ (today UTC − 1 day)`.
- If `ma200 === null`, then `ahr999 === null`, `quantile5y === null`, and
  `windowKind === "insufficient_samples"`.
- If `ahr999 !== null` and `quantile5y === null`, then `windowKind ===
  "insufficient_samples"`. This means we have a valid AHR but not enough
  observations (< 365) to report a quantile.
- `quantile5y` is a discrete rank: it takes only values of the form
  `k / N` where `N = validObservations ≤ 1825`.
- Once `windowKind` flips to `"rolling_5y"` (at the 1,825th valid AHR
  observation), it never flips back — newer data only extends the series.
- A row for `date = D` in version `v2` will have `close[D]` equal to
  `close[D]` in version `v1` **if** `D` is more than 5 days before `v1`'s
  latest date. Within the last 5 days, `close` may be refined by Binance's
  late corrections. See the sync script's 5-day self-heal lookback.

## Row counts

The dataset starts at `2017-08-17`, so on any given day you should expect
approximately:

```
rows ≈ (today_UTC − 2017-08-17) / 1 day
```

For reference, the 2026-04-19 snapshot has **3,168** rows.
