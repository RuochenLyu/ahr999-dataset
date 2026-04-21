# ahr999-dataset

> 开源、每日更新的 AHR999 囤币指标数据集 —— JSON + CSV + Astro 可视化站。

[English](./README.md) · [简体中文](./README.zh-CN.md)

[![dataset: JSON](https://img.shields.io/badge/dataset-JSON-f59e0b.svg)](./datasets/ahr999.json)
[![dataset: CSV](https://img.shields.io/badge/dataset-CSV-f59e0b.svg)](./datasets/ahr999.csv)
[![daily update](https://github.com/RuochenLyu/ahr999-dataset/actions/workflows/daily.yml/badge.svg)](https://github.com/RuochenLyu/ahr999-dataset/actions/workflows/daily.yml)
[![code: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](./LICENSE)
[![data: CC BY 4.0](https://img.shields.io/badge/data-CC_BY_4.0-lightgrey.svg)](./DATA_LICENSE)

**在线仪表盘**：<https://ahr999.aix4u.com/>

AHR999（囤币指标）由九神提出，是基于 BTC 价格的启发式定投信号。本仓库发布
可复现、每日自动更新的自算版本数据集，第三方可直接引用，无需爬非权威站点，
也无需付费 API。

## 数据下载

- **JSON** · [`datasets/ahr999.json`](./datasets/ahr999.json) · [CDN 镜像](https://ahr999.aix4u.com/datasets/ahr999.json)
- **CSV** · [`datasets/ahr999.csv`](./datasets/ahr999.csv) · [CDN 镜像](https://ahr999.aix4u.com/datasets/ahr999.csv)

全量数据（~3100+ 行，按日期升序），每日 UTC 00:37（北京时间 08:37）自动更新。
字段定义见下方[数据字段](#数据字段)。

## 快速使用

获取最新值：

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

CSV 版本：

```bash
curl -s https://ahr999.aix4u.com/datasets/ahr999.csv \
  | tail -1
```

## 自建/复算

```bash
git clone https://github.com/RuochenLyu/ahr999-dataset.git
cd ahr999-dataset
pnpm install
pnpm sync:backfill   # 从 2017-08-17 起 ~3100+ 行，约 5 秒
pnpm export:csv
pnpm verify          # 仓库内置 checkpoints，可选外部基线逐行比对
pnpm web:dev         # 本地预览 http://localhost:4321/
```

无需任何 API key，无付费依赖。Node ≥ 22 + pnpm 即可。

### Binance 端点

默认走 `https://data-api.binance.vision`（Binance 官方数据镜像端点，
面向分析/回测场景，payload 与 `api.binance.com` 完全一致，无需 API
key、无地理限制）。换这个是因为 `api.binance.com` 在部分 IP 段会返回
**HTTP 451**（GitHub Actions runner、部分云厂商 IP 都会中招）。

如果你本地可以直接访问 `api.binance.com`，想走原地址，用环境变量
覆盖即可：

```bash
AHR999_BINANCE_API_BASE_URL=https://api.binance.com pnpm sync
```

## 数据字段

`datasets/ahr999.json` 是按日期升序的数组，每行：

| 字段 | 类型 | 说明 |
|---|---|---|
| `date` | `string` | `YYYY-MM-DD` 格式，UTC 日收盘 |
| `close` | `number` | Binance BTCUSDT 日收盘价 |
| `ma200` | `number \| null` | `close` 的 200 日移动平均。前 199 行为 `null`。 |
| `ahr999` | `number \| null` | `(close/ma200) × (close/fitted)`，其中 `fitted = 10^(5.84·log10(比特币年龄天数) − 17.01)`。`ma200` 为 null 时此值也为 null。 |
| `quantile5y` | `number \| null` | `ahr999` 在窗口内的经验分位：`count(v ≤ current) / N`。前 365 个有效 AHR 观测为 `null`。 |
| `windowKind` | `"insufficient_samples" \| "expanding" \| "rolling_5y"` | 分位窗口模式。有效观测数 ≥ 1825 时从 `expanding` 切换到 `rolling_5y`。 |

详见 [`docs/data-format.md`](./docs/data-format.md) 和
[`docs/methodology.zh-CN.md`](./docs/methodology.zh-CN.md)（含推导 + 与九神原版差异）。

## 每日更新机制

单一 GitHub Actions workflow（`.github/workflows/daily.yml`）每天 UTC 00:37 跑：

1. 抓取缺失的 Binance 日 K（带 5 天回溯，覆盖可能的后置修正）
2. 全量重算（~3100 行，<50 ms）——便宜，窗口簿记零脑力
3. 若 `datasets/` 有变更则 commit
4. 构建 Astro 站点并部署到 GitHub Pages

更新 + 构建 + 部署合并在**一个** workflow 中：`GITHUB_TOKEN` 推的 commit 不会
触发下游 workflow，分开没意义。

## 致谢

- **九神**（nine_god_btc）—— AHR999 公式原作者
- **<https://9992100.xyz/>** —— 流行的 AHR999 公开展示
- **Binance** —— 公开 BTCUSDT 日 K API

## 许可

- 源代码：[MIT](./LICENSE)
- `datasets/` 下数据文件：[CC BY 4.0](./DATA_LICENSE)

## 免责声明

本数据集仅供研究/教育/可观测性用途。**不构成投资建议**。AHR999 是启发式
指标，历史表现不能预测未来。
