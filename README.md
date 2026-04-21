# ahr999-dataset

> Open, daily-updated AHR999 (囤币指标) dataset — JSON + CSV + Astro dashboard.

[English](./README.md) · [简体中文](./README.zh-CN.md)

[![dataset: JSON](https://img.shields.io/badge/dataset-JSON-f59e0b.svg)](./datasets/ahr999.json)
[![dataset: CSV](https://img.shields.io/badge/dataset-CSV-f59e0b.svg)](./datasets/ahr999.csv)
[![daily update](https://github.com/RuochenLyu/ahr999-dataset/actions/workflows/daily.yml/badge.svg)](https://github.com/RuochenLyu/ahr999-dataset/actions/workflows/daily.yml)
[![code: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](./LICENSE)
[![data: CC BY 4.0](https://img.shields.io/badge/data-CC_BY_4.0-lightgrey.svg)](./DATA_LICENSE)

**Live dashboard**: <https://ahr999.aix4u.com/>

AHR999 (Ahr999 hoarding index, a.k.a. 囤币指标) is a heuristic BTC dollar-cost-
averaging signal originally proposed by the Chinese investor "九神". This
repository publishes a self-computed, reproducible, daily-refreshed dataset
so third parties can reference AHR999 without scraping ad-hoc dashboards or
paying for proprietary APIs.

## Download

- **JSON** · [`datasets/ahr999.json`](./datasets/ahr999.json) · [CDN mirror](https://ahr999.aix4u.com/datasets/ahr999.json)
- **CSV** · [`datasets/ahr999.csv`](./datasets/ahr999.csv) · [CDN mirror](https://ahr999.aix4u.com/datasets/ahr999.csv)

Full series (~3,100+ rows, oldest first), refreshed daily at 00:37 UTC. See
[Data schema](#data-schema) below for field definitions.

## Quick usage

Fetch the latest value:

```bash
curl -s https://ahr999.aix4u.com/datasets/ahr999.json \
  | jq '.[-1]'
```

```json
{
  "date": "2026-04-19",
  "close": 73801.79,
  "ma200": 86578.65964999999,
  "ahr999": 0.4116636687277032,
  "quantile5y": 0.13917808219178082,
  "windowKind": "rolling_5y"
}
```

CSV flavour:

```bash
curl -s https://ahr999.aix4u.com/datasets/ahr999.csv \
  | tail -1
```

## Self-host / reproduce

```bash
git clone https://github.com/RuochenLyu/ahr999-dataset.git
cd ahr999-dataset
pnpm install
pnpm sync:backfill   # ~3,100+ rows from 2017-08-17, ~5s
pnpm export:csv
pnpm verify          # repo-local checkpoints + optional external baseline compare
pnpm web:dev         # local preview on http://localhost:4321/
```

Zero API key. Zero paid dependencies. Just Node ≥ 22 and pnpm.

### Binance endpoint

By default we pull klines from `https://data-api.binance.vision`
(Binance's public market-data mirror intended for analytics /
backtesting — same payload shape as `api.binance.com`, no API key, no
geo fence). We switched to this because `api.binance.com` returns
**HTTP 451** on GitHub-hosted Actions runners and some other cloud IP
ranges.

If you prefer the canonical endpoint (your IP reaches it without 451),
override via env:

```bash
AHR999_BINANCE_API_BASE_URL=https://api.binance.com pnpm sync
```

## Data schema

`datasets/ahr999.json` is an array, oldest first. Each row:

| field | type | notes |
|---|---|---|
| `date` | `string` | `YYYY-MM-DD`, UTC closing day |
| `close` | `number` | BTCUSDT daily close from Binance |
| `ma200` | `number \| null` | 200-day moving average of `close`. `null` for first 199 rows. |
| `ahr999` | `number \| null` | `(close/ma200) × (close/fitted)`, where `fitted = 10^(5.84·log10(coin_age_days) − 17.01)`. `null` when `ma200` is null. |
| `quantile5y` | `number \| null` | Empirical rank of `ahr999` within the window: `count(v ≤ current) / N`. `null` for the first 365 valid AHR observations. |
| `windowKind` | `"insufficient_samples" \| "expanding" \| "rolling_5y"` | Which window was used for `quantile5y`. Expanding switches to 5-year rolling at 1,825 valid observations. |

See [`docs/data-format.md`](./docs/data-format.md) and
[`docs/methodology.md`](./docs/methodology.md) for full derivation and
discussion of deviations from the original 九神 formulation.

## How daily updates work

A single GitHub Actions workflow (`.github/workflows/daily.yml`) runs at
00:37 UTC every day:

1. Fetch missing Binance daily closes (with a 5-day self-heal lookback to
   absorb late corrections).
2. Recompute the full series (~3,100 rows, < 50 ms) — cheap and keeps the
   window bookkeeping trivially correct.
3. Commit `datasets/ahr999.{json,csv}` if changed.
4. Build the Astro dashboard and deploy to GitHub Pages.

Update + build + deploy happens in **one** workflow because
`GITHUB_TOKEN`-pushed commits don't trigger downstream workflows.

## Acknowledgements

- **九神** (nine_god_btc) — original AHR999 formulation on 8btc.
- **<https://9992100.xyz/>** — popular public display of AHR999.
- **Binance** — public BTCUSDT daily kline API.

## License

- Source code: [MIT](./LICENSE)
- Data files under `datasets/`: [CC BY 4.0](./DATA_LICENSE)

## Disclaimer

This dataset is for research/education/observability only. **Not financial
advice.** AHR999 is a heuristic; past behavior does not predict future
results.
