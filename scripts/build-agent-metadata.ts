import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type DatasetRow = {
  date: string;
};

const SITE = "https://ahr999.aix4u.com";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const publicDir = path.join(repoRoot, "web", "public");
const datasetPath = path.join(repoRoot, "datasets", "ahr999.json");
const sitemapPath = path.join(publicDir, "sitemap.xml");
const skillPath = path.join(
  publicDir,
  ".well-known",
  "agent-skills",
  "ahr999-dataset",
  "SKILL.md",
);
const skillIndexPath = path.join(
  publicDir,
  ".well-known",
  "agent-skills",
  "index.json",
);

const sitemapUrls = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/zh/", changefreq: "daily", priority: "0.9" },
  { path: "/methodology/", changefreq: "monthly", priority: "0.7" },
  { path: "/zh/methodology/", changefreq: "monthly", priority: "0.6" },
  { path: "/data-format/", changefreq: "monthly", priority: "0.7" },
  { path: "/zh/data-format/", changefreq: "monthly", priority: "0.6" },
  { path: "/api/", changefreq: "monthly", priority: "0.7" },
  { path: "/zh/api/", changefreq: "monthly", priority: "0.6" },
  { path: "/faq/", changefreq: "monthly", priority: "0.7" },
  { path: "/zh/faq/", changefreq: "monthly", priority: "0.6" },
  { path: "/datasets/ahr999.json", changefreq: "daily", priority: "0.9" },
  { path: "/datasets/ahr999.csv", changefreq: "daily", priority: "0.8" },
  { path: "/openapi.json", changefreq: "weekly", priority: "0.7" },
  { path: "/llms.txt", changefreq: "weekly", priority: "0.7" },
  { path: "/llms-full.txt", changefreq: "weekly", priority: "0.7" },
  { path: "/.well-known/api-catalog", changefreq: "weekly", priority: "0.6" },
  {
    path: "/.well-known/agent-skills/index.json",
    changefreq: "weekly",
    priority: "0.6",
  },
  {
    path: "/.well-known/agent-skills/ahr999-dataset/SKILL.md",
    changefreq: "weekly",
    priority: "0.6",
  },
];

function readLatestDatasetDate(): string {
  const raw = fs.readFileSync(datasetPath, "utf8");
  const rows = JSON.parse(raw) as DatasetRow[];
  const latest = rows.at(-1);
  if (!latest?.date || !/^\d{4}-\d{2}-\d{2}$/.test(latest.date)) {
    throw new Error(`Cannot read latest dataset date from ${datasetPath}`);
  }
  return latest.date;
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function absoluteUrl(pathname: string): string {
  return new URL(pathname, `${SITE}/`).toString();
}

function buildSitemap(latestDate: string): string {
  const entries = sitemapUrls
    .map(
      (entry) => `  <url>
    <loc>${xmlEscape(absoluteUrl(entry.path))}</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

function buildSkillIndex(): string {
  const body = fs.readFileSync(skillPath);
  const digest = crypto.createHash("sha256").update(body).digest("hex");
  return `${JSON.stringify(
    {
      $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills: [
        {
          name: "ahr999-dataset",
          type: "skill-md",
          description:
            "Use the public AHR999 dataset safely: fetch latest readings, inspect historical rows, cite the dataset, and avoid treating it as financial advice.",
          url: absoluteUrl(
            "/.well-known/agent-skills/ahr999-dataset/SKILL.md",
          ),
          digest: `sha256:${digest}`,
        },
      ],
    },
    null,
    2,
  )}\n`;
}

function writeFile(filePath: string, body: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, body);
}

function main(): void {
  const latestDate = readLatestDatasetDate();
  writeFile(sitemapPath, buildSitemap(latestDate));
  writeFile(skillIndexPath, buildSkillIndex());
  console.log(
    `[metadata] generated sitemap.xml and agent skill index for ${latestDate}`,
  );
}

main();
