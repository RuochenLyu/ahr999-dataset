import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DATASET_CSV_PATH, DATASET_JSON_PATH } from "../src/config.js";
import type { Ahr999Point } from "../src/schema.js";
import { readDataset } from "../src/storage.js";

const HEADER = ["date", "close", "ma200", "ahr999", "quantile5y", "windowKind"];

function formatNumber(value: number | null): string {
  if (value === null) {
    return "";
  }
  // JSON.stringify is the cleanest way to keep the exact float representation.
  return JSON.stringify(value);
}

function formatRow(row: Ahr999Point): string {
  return [
    row.date,
    formatNumber(row.close),
    formatNumber(row.ma200),
    formatNumber(row.ahr999),
    formatNumber(row.quantile5y),
    row.windowKind,
  ].join(",");
}

function resolveFromRepoRoot(relativePath: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", relativePath);
}

function main(): void {
  const jsonPath = resolveFromRepoRoot(DATASET_JSON_PATH);
  const csvPath = resolveFromRepoRoot(DATASET_CSV_PATH);

  const points = readDataset(jsonPath);
  if (points.length === 0) {
    console.warn(`[csv] dataset is empty at ${jsonPath}`);
  }

  const body = [HEADER.join(","), ...points.map(formatRow)].join("\n") + "\n";

  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  const tmpPath = `${csvPath}.tmp`;
  fs.writeFileSync(tmpPath, body);
  fs.renameSync(tmpPath, csvPath);

  console.log(
    `[csv] wrote ${points.length} rows to ${path.relative(process.cwd(), csvPath)}`,
  );
}

main();
