---
license: cc-by-4.0
language:
- en
tags:
- ahr999
- bitcoin
- btc
- cryptocurrency
- finance
- time-series
- tabular
- timeseries
- csv
- json
pretty_name: AHR999 BTC Hoarding Index Dataset
size_categories:
- n<10K
configs:
- config_name: default
  data_files:
  - split: train
    path: ahr999.csv
---

# AHR999 BTC Hoarding Index Dataset

Open, daily-updated AHR999 BTC hoarding index dataset, self-computed from
Binance BTCUSDT daily closes and published as CSV and JSON.

This Hugging Face repository is a mirror. The canonical dataset endpoints are:

- Dashboard: https://ahr999.aix4u.com/
- GitHub: https://github.com/RuochenLyu/ahr999-dataset
- CSV endpoint: https://ahr999.aix4u.com/datasets/ahr999.csv
- JSON endpoint: https://ahr999.aix4u.com/datasets/ahr999.json
- Kaggle discovery mirror: https://www.kaggle.com/datasets/kshift/ahr999-btc-hoarding-index-dataset
- Zenodo archival snapshot: https://doi.org/10.5281/zenodo.20412604

The canonical GitHub Actions pipeline refreshes the dataset daily after the UTC
BTCUSDT close is available, then mirrors the latest CSV and JSON files here when
mirror credentials are configured.

## Files

- `ahr999.csv`: UTF-8 CSV with a header row.
- `ahr999.json`: JSON array ordered by UTC date ascending.
- `DATA_LICENSE`: CC BY 4.0 data license and attribution text.

## Schema

Each row is one UTC daily close:

| field | type | notes |
|---|---|---|
| `date` | string | UTC date in `YYYY-MM-DD`. |
| `close` | number | BTCUSDT daily close from Binance public market data. |
| `ma200` | number or null | 200-day simple moving average of `close`; null until enough history exists. |
| `ahr999` | number or null | `(close / ma200) * (close / fitted)`; null when `ma200` is null. |
| `quantile5y` | number or null | Empirical rank of `ahr999` inside the active recent window. |
| `windowKind` | string | `insufficient_samples`, `expanding`, or `rolling_5y`. |

## Usage

```python
from datasets import load_dataset

ds = load_dataset("kshift/ahr999-dataset", split="train")
print(ds[-1])
```

```python
import pandas as pd

df = pd.read_csv("hf://datasets/kshift/ahr999-dataset/ahr999.csv")
latest = df.iloc[-1]
print(latest)
```

## Attribution

Data files are licensed under CC BY 4.0. Cite:

`ahr999-dataset contributors (2026). "ahr999-dataset - open BTC hoarding index computed from Binance BTCUSDT daily closes". https://github.com/RuochenLyu/ahr999-dataset`

This dataset is for research, education, and observability only. It is not
financial advice. AHR999 is a heuristic indicator; past behavior does not
predict future results.
