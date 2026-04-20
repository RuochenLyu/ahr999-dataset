import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const srcDir = path.join(repoRoot, "datasets");
const destDir = path.join(repoRoot, "web", "public", "datasets");

function copyFile(src: string, dest: string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function main(): void {
  if (!fs.existsSync(srcDir)) {
    console.warn(
      `[prepublic] ${srcDir} does not exist; run 'pnpm sync:backfill' first.`,
    );
    process.exit(0);
  }

  // Clear destination so renamed/removed datasets don't linger.
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir);
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(destDir, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isFile()) {
      copyFile(srcPath, destPath);
    }
  }
  console.log(
    `[prepublic] copied ${entries.length} files from datasets/ to web/public/datasets/`,
  );
}

main();
