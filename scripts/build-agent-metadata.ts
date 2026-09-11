import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
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

// GitHub Pages does not serve dot-prefixed paths (`/.well-known/...` is 404
// while `/CNAME` is 200), so every agent-discovery file is authored under
// `.well-known/` and mirrored to a plain path that the host actually serves.
// All outbound references (sitemap, JSON-LD, <link rel>, llms.txt) point at
// the mirrored path; the `.well-known/` copies stay for hosts that do serve
// them.
const wellKnownDir = path.join(publicDir, ".well-known");
const mirrorDir = publicDir;
const mirroredFiles = [
  "api-catalog",
  path.join("agent-skills", "ahr999-dataset", "SKILL.md"),
];
const skillPath = path.join(
  wellKnownDir,
  "agent-skills",
  "ahr999-dataset",
  "SKILL.md",
);
const skillIndexRelative = path.join("agent-skills", "index.json");

// Source files whose git history drives <lastmod> for the doc pages. The
// dataset-driven pages (home, datasets, skill index) use the dataset date.
const docSources: Record<string, string[]> = {
  methodology: [
    "web/src/components/MethodologyPage.astro",
    "web/src/layouts/DocLayout.astro",
  ],
  dataFormat: [
    "web/src/components/DataFormatPage.astro",
    "web/src/layouts/DocLayout.astro",
  ],
  api: ["web/src/components/ApiPage.astro", "web/src/layouts/DocLayout.astro"],
  faq: ["web/src/components/FaqPage.astro", "web/src/layouts/DocLayout.astro"],
  openapi: ["web/public/openapi.json"],
  llms: ["web/public/llms.txt", "web/public/llms-full.txt"],
  apiCatalog: ["web/public/.well-known/api-catalog"],
  skill: ["web/public/.well-known/agent-skills/ahr999-dataset/SKILL.md"],
};

type SitemapPage = {
  /** English path; the Chinese twin lives under /zh. */
  en: string;
  zh: string;
  changefreq: string;
  priority: string;
  /** Key into docSources; omitted => dataset date. */
  source?: keyof typeof docSources;
};

// Only indexable HTML pages belong in the sitemap. Data files, OpenAPI,
// llms.txt and the agent-discovery files are still reachable through
// <link rel> tags and the Dataset JSON-LD, but listing them here only
// produces "crawled – not indexed" noise in Search Console.
const sitemapPages: SitemapPage[] = [
  { en: "/", zh: "/zh/", changefreq: "daily", priority: "1.0" },
  {
    en: "/methodology/",
    zh: "/zh/methodology/",
    changefreq: "monthly",
    priority: "0.7",
    source: "methodology",
  },
  {
    en: "/data-format/",
    zh: "/zh/data-format/",
    changefreq: "monthly",
    priority: "0.7",
    source: "dataFormat",
  },
  {
    en: "/api/",
    zh: "/zh/api/",
    changefreq: "monthly",
    priority: "0.7",
    source: "api",
  },
  {
    en: "/faq/",
    zh: "/zh/faq/",
    changefreq: "monthly",
    priority: "0.7",
    source: "faq",
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

/**
 * Latest commit date (YYYY-MM-DD, UTC) touching any of the given files.
 * Falls back to `fallback` when git history is unavailable (shallow clone,
 * uncommitted file), so a CI misconfiguration degrades to the old behaviour
 * instead of failing the build.
 */
function gitLastModified(files: string[], fallback: string): string {
  if (files.length === 0) return fallback;
  try {
    const out = execFileSync(
      "git",
      ["log", "-1", "--format=%cI", "--", ...files],
      { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    const match = out.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : fallback;
  } catch {
    return fallback;
  }
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
  const lastmodCache = new Map<string, string>();
  const lastmodFor = (page: SitemapPage): string => {
    if (!page.source) return latestDate;
    const cached = lastmodCache.get(page.source);
    if (cached) return cached;
    const value = gitLastModified(docSources[page.source] ?? [], latestDate);
    lastmodCache.set(page.source, value);
    return value;
  };

  // Every language variant lists the full alternate set (Google requires
  // the alternates to be reciprocal).
  const alternates = (page: SitemapPage): string =>
    [
      ["en", page.en],
      ["zh-Hans", page.zh],
      ["x-default", page.en],
    ]
      .map(
        ([lang, p]) =>
          `    <xhtml:link rel="alternate" hreflang="${lang}" href="${xmlEscape(absoluteUrl(p!))}" />`,
      )
      .join("\n");

  const entries = sitemapPages
    .flatMap((page) => [
      { loc: page.en, priority: page.priority, page },
      {
        loc: page.zh,
        priority: String(Math.max(0.1, Number(page.priority) - 0.1).toFixed(1)),
        page,
      },
    ])
    .map(
      ({ loc, priority, page }) => `  <url>
    <loc>${xmlEscape(absoluteUrl(loc))}</loc>
    <lastmod>${lastmodFor(page)}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${priority}</priority>
${alternates(page)}
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
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
          url: absoluteUrl("/agent-skills/ahr999-dataset/SKILL.md"),
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

function mirrorWellKnown(): void {
  for (const relative of mirroredFiles) {
    const src = path.join(wellKnownDir, relative);
    const dest = path.join(mirrorDir, relative);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function main(): void {
  const latestDate = readLatestDatasetDate();
  writeFile(sitemapPath, buildSitemap(latestDate));
  const skillIndex = buildSkillIndex();
  writeFile(path.join(wellKnownDir, skillIndexRelative), skillIndex);
  writeFile(path.join(mirrorDir, skillIndexRelative), skillIndex);
  mirrorWellKnown();
  console.log(
    `[metadata] generated sitemap.xml, agent skill index and .well-known mirrors for ${latestDate}`,
  );
}

main();
