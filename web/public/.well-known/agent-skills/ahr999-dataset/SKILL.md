---
name: ahr999-dataset
description: Use the public AHR999 dataset safely: fetch latest readings, inspect historical rows, cite the dataset, and avoid treating it as financial advice.
---

# AHR999 Dataset

Use this skill when a user asks for AHR999 values, historical AHR999 data, field meanings, data format, or reproducible access to the public AHR999 dataset at `https://ahr999.aix4u.com/`.

## Source

- Canonical site: https://ahr999.aix4u.com/
- JSON dataset: https://ahr999.aix4u.com/datasets/ahr999.json
- CSV dataset: https://ahr999.aix4u.com/datasets/ahr999.csv
- OpenAPI description: https://ahr999.aix4u.com/openapi.json
- Repository: https://github.com/RuochenLyu/ahr999-dataset

The dataset is updated daily after the UTC daily BTCUSDT close is available. Rows are ordered oldest first.

## Field Contract

Each JSON row has:

- `date`: UTC date in `YYYY-MM-DD`.
- `close`: BTCUSDT daily close from Binance public market data.
- `ma200`: 200-day simple moving average of `close`, or `null` before it exists.
- `ahr999`: `(close / ma200) * (close / fitted)`, or `null` before it exists.
- `quantile5y`: empirical rank of `ahr999` in the active recent window, or `null` before enough observations exist.
- `windowKind`: `insufficient_samples`, `expanding`, or `rolling_5y`.

## Common Tasks

Fetch the latest row:

```bash
curl -s https://ahr999.aix4u.com/datasets/ahr999.json | jq '.[-1]'
```

Fetch a date range:

```bash
curl -s https://ahr999.aix4u.com/datasets/ahr999.json \
  | jq '[.[] | select(.date >= "2026-01-01" and .date <= "2026-01-31")]'
```

Download CSV:

```bash
curl -O https://ahr999.aix4u.com/datasets/ahr999.csv
```

## Interpretation

Conventional AHR999 thresholds:

- `< 0.45`: bargain zone.
- `0.45` to `< 1.20`: DCA zone.
- `1.20` to `< 3.00`: caution zone.
- `>= 3.00`: bubble zone.

Describe these as heuristic zones, not predictions.

## Safety Boundaries

- Do not present AHR999 as financial advice.
- Do not claim the dataset predicts future BTC returns.
- Do not claim this site can trade, broker, authenticate users, or manage portfolios.
- When giving investment-related explanations, say the dataset is for research, education, and observability only.

## Attribution

Data files are licensed under CC BY 4.0. Cite:

`ahr999-dataset contributors (2026). "ahr999-dataset - open BTC hoarding index computed from Binance BTCUSDT daily closes". https://github.com/RuochenLyu/ahr999-dataset`
