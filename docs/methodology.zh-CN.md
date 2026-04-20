# 方法论

> `ahr999-dataset` 每个字段的计算方式、常量、与九神原版和
> `9992100.xyz` 的差异。

## 输入

- **价格源**：Binance 公开接口 `GET /api/v3/klines`，`symbol=BTCUSDT`、
  `interval=1d`。只保留 kline 的 **close** 字段（本仓库不再分发完整 OHLCV）。
- **回溯起点**：`2017-08-17` —— Binance 能提供 BTCUSDT 的最早日 K。
- **截止**：`today_UTC − 1 day`（最后一个已收盘的 UTC 日）。当日 UTC bar 是
  partial，会让 `quantile5y` 盘中抖动。

## 常量

| 名称 | 值 | 作用 |
|---|---|---|
| `GENESIS` | `2009-01-03` | BTC 创世区块日期；比特币年龄的锚点 |
| `MA_WINDOW` | `200` | `ma200` 滚动窗口 |
| `FIT_A` | `5.84` | 拟合"公允价值"曲线的对数-对数斜率 |
| `FIT_B` | `−17.01` | 拟合曲线截距 |
| `QUANTILE_MIN_OBS` | `365` | 开始计算 `quantile5y` 所需最少观测数 |
| `QUANTILE_WINDOW` | `1825`（5×365） | 滚动窗口大小（观测数充足后） |

## 逐步计算

对每个 UTC 日 `d`，收盘 `c_d`：

### 1. 200 日移动平均

```
ma200_d = mean(close_{d-199 .. d})
```

观测数 <200 时，`ma200_d = null`，所有下游字段也为 `null`，
`windowKind = "insufficient_samples"`。

### 2. 拟合公允价值

```
coin_age_days_d = floor((d − GENESIS) / 1 天)
fitted_d        = 10 ^ (5.84 · log10(coin_age_days_d) − 17.01)
```

### 3. AHR999

```
ahr999_d = (c_d / ma200_d) · (c_d / fitted_d)
```

两部分乘积：

- **动能**：`c_d / ma200_d`——相对于近 200 天定投成本有多贵。>1 表示高于
  DCA 成本；<1 表示低于。
- **年龄定价**：`c_d / fitted_d`——相对于长期拟合轨迹有多贵。

民间阈值（启发式，非正式定义）：

- `< 0.45` —— 抄底区
- `0.45 – 1.2` —— 定投区
- `1.2 – 3` —— 谨慎区
- `> 3` —— 泡沫区

### 4. 5 年分位

`quantile5y_d` 是 `ahr999_d` 在近期有效 AHR 窗口（含当前值）的**经验排名**：

```
quantile5y_d = count(v ∈ window : v ≤ ahr999_d) / window.length
```

窗口取决于到当前为止有效 AHR 观测数：

| 有效观测数 | 窗口 | `windowKind` | `quantile5y` |
|---|---|---|---|
| `< 365` | — | `insufficient_samples` | `null` |
| `[365, 1825)` | 迄今全部有效观测（expanding） | `expanding` | 有值 |
| `≥ 1825` | 最近 1825 个观测（rolling） | `rolling_5y` | 有值 |

### 离散经验分位 vs. 线性插值

本项目故意采用离散 rank（`count(v ≤ current) / N`）而不是 numpy 默认的
线性插值分位：

- 社区里原始九神实现都用离散 rank
- ~1800 观测数下离散 rank 分辨率 ≈ 0.00055，远细于任何可操作解读
- 离散 rank 的意义干净：**"过去 5 年里有多少比例的日子 ≤ 当前值"**

可以手算验证：本数据集首个非空分位在 `2019-03-03`，其
`quantile5y = 78 / 365 = 0.2136986301369863` 精确相等。

## 与其他 AHR999 实现的差异

### 相对九神原始公式

常量完全一致（`FIT_A=5.84`，`FIT_B=−17.01`，`MA_WINDOW=200`，5 年分位）。
本项目的明确选择：

- **价格源**：用 Binance BTCUSDT。早期一些分析用 coinmarketcap 或 okx。
  2018 年前会有差异，之后 BTCUSDT 成交量占主导后差异 ≤0.1%。
- **`windowKind` 显式**：下游可以过滤 expanding 暖启动阶段的 365-1825 行。

### 相对 `9992100.xyz`

`9992100.xyz` 是最流行的中文 AHR999 展示站。每日小幅差异（绝对值 ≤0.02）
属正常：

- 可能使用不同 UTC 截止
- 价格源和 close 时间戳语义未公开

两者应该在**区间判断**（抄底/定投/谨慎/泡沫）上一致；不要追求两家无关实现
之间的数值精准对齐。

## 端到端复算

```bash
pnpm sync:backfill
pnpm export:csv
pnpm verify   # 仓库内置 checkpoints 会精确校验关键行
```

若设置 `AHR999_SOURCE_BASELINE_PATH=/path/to/another/ahr999-daily.jsonl`，
`pnpm verify` 会额外按 `<1e-9` 相对误差逐行对比该基线。不设置这个环境变量时，
命令仍会校验仓库内置 checkpoints 和数据集不变量。
