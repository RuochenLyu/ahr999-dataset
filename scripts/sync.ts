import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BACKFILL_START,
  DATASET_JSON_PATH,
  RESYNC_LOOKBACK_DAYS,
} from "../src/config.js";
import { computeAhr999Series } from "../src/ahr999.js";
import { fetchBinanceDailyCloses } from "../src/binance.js";
import type { BtcClosePoint } from "../src/schema.js";
import {
  datasetEqualsOnDisk,
  readDataset,
  writeDatasetAtomic,
} from "../src/storage.js";
import { lastClosedUtcDay, subtractDays } from "../src/time.js";

interface SyncArgs {
  backfill: boolean;
  end?: string;
}

function parseArgs(argv: string[]): SyncArgs {
  const args: SyncArgs = { backfill: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--backfill") {
      args.backfill = true;
    } else if (arg === "--end") {
      const next = argv[i + 1];
      if (!next || !/^\d{4}-\d{2}-\d{2}$/.test(next)) {
        throw new Error(`--end requires YYYY-MM-DD, got: ${next ?? "(none)"}`);
      }
      args.end = next;
      i += 1;
    } else if (arg && arg.startsWith("--end=")) {
      args.end = arg.slice("--end=".length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(args.end)) {
        throw new Error(`--end requires YYYY-MM-DD, got: ${args.end}`);
      }
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: pnpm sync [--backfill] [--end YYYY-MM-DD]\n\n" +
          "  --backfill   Force full rebuild from BACKFILL_START (2017-08-17).\n" +
          "  --end DATE   Stop at this UTC date (default: yesterday UTC).",
      );
      process.exit(0);
    } else if (arg) {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function resolveDatasetPath(): string {
  // Always resolve relative to repo root (parent of scripts/), not CWD.
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", DATASET_JSON_PATH);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const datasetPath = resolveDatasetPath();
  const endDate = args.end ?? lastClosedUtcDay();

  const existingPoints = readDataset(datasetPath);

  // Drop partial/future rows (> endDate) — source has a self-heal for rows
  // that somehow slipped past the last closed UTC day.
  const cleanExisting = existingPoints.filter((row) => row.date <= endDate);

  const startDate =
    args.backfill || cleanExisting.length === 0
      ? BACKFILL_START
      : subtractDays(
          cleanExisting[cleanExisting.length - 1]!.date,
          RESYNC_LOOKBACK_DAYS,
        );

  console.log(
    `[sync] range: ${startDate} → ${endDate} (backfill=${args.backfill}, existing=${cleanExisting.length})`,
  );

  const fetched = await fetchBinanceDailyCloses(startDate, endDate);
  console.log(`[sync] fetched ${fetched.length} rows from Binance`);

  // Merge: existing closes (kept outside fetch range) + fetched closes.
  // Dedupe by date, fetched wins (covers any Binance corrections).
  const merged = new Map<string, BtcClosePoint>();
  for (const row of cleanExisting) {
    merged.set(row.date, { date: row.date, close: row.close });
  }
  for (const row of fetched) {
    merged.set(row.date, row);
  }
  const mergedCloses = [...merged.values()]
    .filter((row) => row.date <= endDate)
    .sort((left, right) => left.date.localeCompare(right.date));

  const series = computeAhr999Series(mergedCloses);

  if (datasetEqualsOnDisk(datasetPath, series)) {
    console.log("[sync] Up to date");
    return;
  }

  writeDatasetAtomic(datasetPath, series);
  const latest = series[series.length - 1];
  console.log(
    `[sync] wrote ${series.length} rows to ${path.relative(process.cwd(), datasetPath)}`,
  );
  if (latest) {
    console.log(
      `[sync] latest: ${latest.date} close=${latest.close} ahr999=${latest.ahr999 ?? "null"} windowKind=${latest.windowKind}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
