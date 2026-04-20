import fs from "node:fs";
import path from "node:path";

import { Ahr999DatasetSchema } from "./schema.js";
import type { Ahr999Point } from "./schema.js";

export function readDataset(filePath: string): Ahr999Point[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, "utf8");
  if (raw.trim().length === 0) {
    return [];
  }
  return Ahr999DatasetSchema.parse(JSON.parse(raw));
}

function stringifyDataset(points: Ahr999Point[]): string {
  // Validate before serializing so we never write malformed data.
  const validated = Ahr999DatasetSchema.parse(points);
  return `${JSON.stringify(validated, null, 2)}\n`;
}

export function writeDatasetAtomic(
  filePath: string,
  points: Ahr999Point[],
): void {
  const body = stringifyDataset(points);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, body);
  fs.renameSync(tmpPath, filePath);
}

export function datasetEqualsOnDisk(
  filePath: string,
  points: Ahr999Point[],
): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const currentRaw = fs.readFileSync(filePath, "utf8");
  const nextRaw = stringifyDataset(points);
  return currentRaw === nextRaw;
}
