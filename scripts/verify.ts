import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DATASET_JSON_PATH } from "../src/config.js";
import {
  Ahr999DatasetSchema,
  Ahr999PointSchema,
} from "../src/schema.js";
import type { Ahr999Point } from "../src/schema.js";
import { readDataset } from "../src/storage.js";
import { lastClosedUtcDay } from "../src/time.js";
import checkpointRowsRaw from "./fixtures/verify-checkpoints.json";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const SOURCE_JSONL = process.env.AHR999_SOURCE_BASELINE_PATH;

const FLOAT_TOLERANCE = 1e-9;
const CHECKPOINT_ROWS = Ahr999DatasetSchema.parse(checkpointRowsRaw);

interface Mismatch {
  date: string;
  field: string;
  ours: number | string | null;
  theirs: number | string | null;
}

function readBaseline(filePath: string): Ahr999Point[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Baseline jsonl not found at ${filePath}. Set AHR999_SOURCE_BASELINE_PATH to override.`,
    );
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      return Ahr999PointSchema.parse({
        date: parsed.date,
        close: parsed.close,
        ma200: parsed.ma200 ?? null,
        ahr999: parsed.ahr999 ?? null,
        quantile5y: parsed.quantile5y ?? null,
        windowKind: parsed.windowKind,
      });
    });
}

function relativeDiff(
  a: number | null,
  b: number | null,
): number | null {
  if (a === null && b === null) return 0;
  if (a === null || b === null) return null;
  const abs = Math.abs(a - b);
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-30);
  return abs / denom;
}

function compareRows(ours: Ahr999Point, theirs: Ahr999Point): Mismatch[] {
  const issues: Mismatch[] = [];
  if (ours.date !== theirs.date) {
    issues.push({
      date: ours.date,
      field: "date",
      ours: ours.date,
      theirs: theirs.date,
    });
  }
  const closeDiff = relativeDiff(ours.close, theirs.close);
  if (closeDiff === null || closeDiff > FLOAT_TOLERANCE) {
    issues.push({
      date: ours.date,
      field: "close",
      ours: ours.close,
      theirs: theirs.close,
    });
  }
  for (const field of ["ma200", "ahr999", "quantile5y"] as const) {
    const a = ours[field];
    const b = theirs[field];
    if (a === null && b === null) continue;
    if (a === null || b === null) {
      issues.push({ date: ours.date, field, ours: a, theirs: b });
      continue;
    }
    const diff = relativeDiff(a, b);
    if (diff === null || diff > FLOAT_TOLERANCE) {
      issues.push({
        date: ours.date,
        field,
        ours: a,
        theirs: b,
      });
    }
  }
  if (ours.windowKind !== theirs.windowKind) {
    issues.push({
      date: ours.date,
      field: "windowKind",
      ours: ours.windowKind,
      theirs: theirs.windowKind,
    });
  }
  return issues;
}

function assertDatasetContract(ours: Ahr999Point[]): void {
  for (let i = 1; i < ours.length; i += 1) {
    const prev = ours[i - 1]!;
    const curr = ours[i]!;
    if (prev.date >= curr.date) {
      throw new Error(
        `Dataset order violation at index ${i}: ${prev.date} >= ${curr.date}`,
      );
    }
  }

  const latest = ours[ours.length - 1];
  if (!latest) {
    throw new Error("Dataset is unexpectedly empty");
  }
  const cutoff = lastClosedUtcDay();
  if (latest.date > cutoff) {
    throw new Error(
      `Latest dataset row ${latest.date} exceeds last closed UTC day ${cutoff}`,
    );
  }

  console.log(
    `[verify] dataset contract: sorted, unique, latest=${latest.date} <= ${cutoff} ✓`,
  );
}

function assertCheckpoints(ours: Ahr999Point[]): void {
  const oursByDate = new Map(ours.map((row) => [row.date, row]));

  for (const expected of CHECKPOINT_ROWS) {
    const actual = oursByDate.get(expected.date);
    if (!actual) {
      throw new Error(
        `Checkpoint row ${expected.date} not found — backfill may be incomplete.`,
      );
    }

    const mismatches = compareRows(actual, expected);
    if (mismatches.length > 0) {
      const detail = mismatches
        .map((m) => `${m.field}: ours=${m.ours} expected=${m.theirs}`)
        .join("; ");
      throw new Error(`Checkpoint ${expected.date} mismatch: ${detail}`);
    }
  }

  console.log(`[verify] repo checkpoints: ${CHECKPOINT_ROWS.length} rows ✓`);
}

function main(): void {
  const ours = readDataset(path.resolve(repoRoot, DATASET_JSON_PATH));
  if (ours.length === 0) {
    throw new Error(
      "Our dataset is empty — run 'pnpm sync:backfill' first.",
    );
  }

  console.log(`[verify] ours: ${ours.length} rows`);
  assertDatasetContract(ours);
  assertCheckpoints(ours);

  if (!SOURCE_JSONL) {
    console.warn(
      "[verify] No external baseline configured — skipping row-by-row compare.",
    );
    return;
  }

  let theirs: Ahr999Point[];
  try {
    theirs = readBaseline(SOURCE_JSONL);
  } catch (error) {
    throw new Error(
      `[verify] External baseline not available at ${SOURCE_JSONL}.\n${(error as Error).message}`,
    );
  }
  console.log(`[verify] baseline: ${theirs.length} rows`);

  const byDateOurs = new Map(ours.map((r) => [r.date, r]));
  const byDateTheirs = new Map(theirs.map((r) => [r.date, r]));

  const allDates = new Set<string>([...byDateOurs.keys(), ...byDateTheirs.keys()]);
  const sortedDates = [...allDates].sort();

  const mismatches: Mismatch[] = [];
  let compared = 0;
  let onlyOurs = 0;
  let onlyTheirs = 0;

  for (const date of sortedDates) {
    const a = byDateOurs.get(date);
    const b = byDateTheirs.get(date);
    if (!a) {
      onlyTheirs += 1;
      continue;
    }
    if (!b) {
      onlyOurs += 1;
      continue;
    }
    compared += 1;
    mismatches.push(...compareRows(a, b));
  }

  console.log(
    `[verify] compared ${compared} rows; ours-only=${onlyOurs}, theirs-only=${onlyTheirs}`,
  );

  if (mismatches.length > 0) {
    console.error(`[verify] ${mismatches.length} mismatches:`);
    for (const m of mismatches.slice(0, 20)) {
      console.error(
        `  ${m.date} ${m.field}: ours=${m.ours} theirs=${m.theirs}`,
      );
    }
    if (mismatches.length > 20) {
      console.error(`  ... ${mismatches.length - 20} more`);
    }
    process.exit(1);
  }

  console.log("[verify] all rows match within 1e-9 tolerance ✓");
}

main();
