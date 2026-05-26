import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type DatasetRow = {
  date: string;
  close: number;
  ma200: number | null;
  ahr999: number | null;
  quantile5y: number | null;
  windowKind: "rolling_5y" | "expanding" | "insufficient_samples";
};

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const publicDir = path.join(repoRoot, "web", "public");
const datasetPath = path.join(repoRoot, "datasets", "ahr999.json");
const robotsPath = path.join(publicDir, "robots.txt");
const llmsPath = path.join(publicDir, "llms.txt");
const openApiPath = path.join(publicDir, "openapi.json");
const apiCatalogPath = path.join(publicDir, ".well-known", "api-catalog");
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
const sitemapPath = path.join(publicDir, "sitemap.xml");
const site = (process.env.AHR999_SITE ?? "https://ahr999.aix4u.com").replace(
  /\/+$/,
  "",
);
const base = normalizeBase(process.env.AHR999_BASE ?? "/");

const sitemapUrls = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/zh/", changefreq: "daily", priority: "0.9" },
  { path: "/datasets/ahr999.json", changefreq: "daily", priority: "0.9" },
  { path: "/datasets/ahr999.csv", changefreq: "daily", priority: "0.8" },
  { path: "/openapi.json", changefreq: "weekly", priority: "0.7" },
  { path: "/llms.txt", changefreq: "weekly", priority: "0.7" },
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

function readLatestDatasetRow(): DatasetRow {
  const raw = fs.readFileSync(datasetPath, "utf8");
  const rows = JSON.parse(raw) as DatasetRow[];
  const latest = rows.at(-1);
  if (!latest?.date || !/^\d{4}-\d{2}-\d{2}$/.test(latest.date)) {
    throw new Error(`Cannot read latest dataset row from ${datasetPath}`);
  }
  return latest;
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeBase(value: string): string {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  const withTrailingSlash = withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
  return withTrailingSlash.replace(/\/{2,}/g, "/");
}

function absoluteUrl(pathname: string): string {
  const cleanPath = pathname.replace(/^\/+/, "");
  return new URL(`${base}${cleanPath}`, `${site}/`).toString();
}

function serverUrl(): string {
  return absoluteUrl("/").replace(/\/+$/, "");
}

function buildRobots(): string {
  return `User-agent: *
Allow: /
Content-Signal: ai-train=yes, search=yes, ai-input=yes

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${absoluteUrl("/sitemap.xml")}
`;
}

function buildLlms(): string {
  return `# AHR999 Dataset

> Open, daily-updated AHR999 BTC hoarding index dataset, published as JSON and CSV.

## Canonical Site

- Homepage: ${absoluteUrl("/")}
- Chinese homepage: ${absoluteUrl("/zh/")}
- Repository: https://github.com/RuochenLyu/ahr999-dataset

## Data Endpoints

- JSON dataset: ${absoluteUrl("/datasets/ahr999.json")}
- CSV dataset: ${absoluteUrl("/datasets/ahr999.csv")}
- OpenAPI description: ${absoluteUrl("/openapi.json")}

## Dataset Shape

Each JSON row is one UTC calendar day, ordered oldest first. Fields:

- \`date\`: UTC date in \`YYYY-MM-DD\`.
- \`close\`: BTCUSDT daily close from Binance public market data.
- \`ma200\`: 200-day simple moving average of \`close\`, or \`null\` until available.
- \`ahr999\`: \`(close / ma200) * (close / fitted)\`, or \`null\` until available.
- \`quantile5y\`: empirical rank of \`ahr999\` in the active recent window, or \`null\` until enough observations exist.
- \`windowKind\`: \`insufficient_samples\`, \`expanding\`, or \`rolling_5y\`.

## Recommended Agent Tasks

- Fetch the latest row with \`GET /datasets/ahr999.json\` and read the last array item.
- Load a historical range by filtering rows by \`date\`.
- Explain the field meanings and calculation method.
- Cite the dataset and license when using or redistributing values.

## Boundaries

- This site is a public read-only dataset and dashboard.
- No authentication, OAuth, user accounts, trading, brokerage, payment, or portfolio actions are offered.
- AHR999 is a heuristic indicator for research, education, and observability. It is not financial advice and does not predict future returns.

## Attribution

Data files are licensed under CC BY 4.0. Cite:

\`ahr999-dataset contributors (2026). "ahr999-dataset - open BTC hoarding index computed from Binance BTCUSDT daily closes". https://github.com/RuochenLyu/ahr999-dataset\`
`;
}

function buildOpenApi(latest: DatasetRow): string {
  return `${JSON.stringify(
    {
      openapi: "3.1.0",
      info: {
        title: "AHR999 Dataset API",
        version: "1.0.0",
        description:
          "Public read-only endpoints for the daily AHR999 BTC hoarding index dataset. The data is self-computed from Binance BTCUSDT daily closes and published for research, education, and observability. It is not financial advice.",
        license: {
          name: "Code MIT; data CC BY 4.0",
          url: "https://github.com/RuochenLyu/ahr999-dataset",
        },
      },
      externalDocs: {
        description: "Repository documentation and methodology",
        url: "https://github.com/RuochenLyu/ahr999-dataset",
      },
      servers: [
        {
          url: serverUrl(),
          description: "Canonical public dataset host",
        },
      ],
      security: [],
      tags: [
        {
          name: "dataset",
          description: "Public read-only AHR999 dataset downloads",
        },
      ],
      paths: {
        "/datasets/ahr999.json": {
          get: {
            tags: ["dataset"],
            summary: "Download the full AHR999 dataset as JSON",
            description:
              "Returns an array of daily AHR999 rows ordered by UTC date ascending. No authentication is required.",
            operationId: "getAhr999DatasetJson",
            security: [],
            responses: {
              "200": {
                description: "AHR999 dataset as JSON",
                headers: {
                  "Access-Control-Allow-Origin": {
                    description:
                      "The static host allows cross-origin reads of this public dataset.",
                    schema: {
                      type: "string",
                      const: "*",
                    },
                  },
                },
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Ahr999Point",
                      },
                    },
                    examples: {
                      latestSlice: {
                        summary: "Latest example row",
                        value: [latest],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/datasets/ahr999.csv": {
          get: {
            tags: ["dataset"],
            summary: "Download the full AHR999 dataset as CSV",
            description:
              "Returns the same rows and columns as the JSON dataset, serialized as UTF-8 CSV with a header row. Empty CSV cells represent JSON null values. No authentication is required.",
            operationId: "getAhr999DatasetCsv",
            security: [],
            responses: {
              "200": {
                description: "AHR999 dataset as CSV",
                headers: {
                  "Access-Control-Allow-Origin": {
                    description:
                      "The static host allows cross-origin reads of this public dataset.",
                    schema: {
                      type: "string",
                      const: "*",
                    },
                  },
                },
                content: {
                  "text/csv": {
                    schema: {
                      type: "string",
                      contentMediaType: "text/csv",
                    },
                    examples: {
                      headerAndRow: {
                        summary: "CSV header and one row",
                        value: `date,close,ma200,ahr999,quantile5y,windowKind\n${latest.date},${latest.close},${latest.ma200 ?? ""},${latest.ahr999 ?? ""},${latest.quantile5y ?? ""},${latest.windowKind}\n`,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Ahr999Point: {
            type: "object",
            additionalProperties: false,
            required: [
              "date",
              "close",
              "ma200",
              "ahr999",
              "quantile5y",
              "windowKind",
            ],
            properties: {
              date: {
                type: "string",
                format: "date",
                description: "UTC calendar date for the daily close.",
              },
              close: {
                type: "number",
                description:
                  "BTCUSDT daily close from Binance public market data.",
              },
              ma200: {
                type: ["number", "null"],
                description:
                  "200-day simple moving average of close. Null until 200 closes are available.",
              },
              ahr999: {
                type: ["number", "null"],
                description:
                  "(close / ma200) * (close / fitted). Null when ma200 is null.",
              },
              quantile5y: {
                type: ["number", "null"],
                minimum: 0,
                maximum: 1,
                description:
                  "Empirical rank of ahr999 inside the active recent window. Null until enough valid AHR observations exist.",
              },
              windowKind: {
                type: "string",
                enum: ["insufficient_samples", "expanding", "rolling_5y"],
                description: "Window regime used for quantile5y.",
              },
            },
          },
        },
      },
    },
    null,
    2,
  )}\n`;
}

function buildApiCatalog(): string {
  const jsonUrl = absoluteUrl("/datasets/ahr999.json");
  const csvUrl = absoluteUrl("/datasets/ahr999.csv");
  const openApiUrl = absoluteUrl("/openapi.json");
  const llmsUrl = absoluteUrl("/llms.txt");

  return `${JSON.stringify(
    {
      linkset: [jsonUrl, csvUrl].map((anchor) => ({
        anchor,
        "service-desc": [
          {
            href: openApiUrl,
            type: "application/vnd.oai.openapi+json",
          },
        ],
        "service-doc": [
          {
            href: "https://github.com/RuochenLyu/ahr999-dataset#data",
          },
          {
            href: llmsUrl,
            type: "text/plain",
          },
        ],
        status: [
          {
            href: anchor,
          },
        ],
      })),
    },
    null,
    2,
  )}\n`;
}

function buildSkill(): string {
  return `---
name: ahr999-dataset
description: Use the public AHR999 dataset safely: fetch latest readings, inspect historical rows, cite the dataset, and avoid treating it as financial advice.
---

# AHR999 Dataset

Use this skill when a user asks for AHR999 values, historical AHR999 data, field meanings, data format, or reproducible access to the public AHR999 dataset at \`${absoluteUrl("/")}\`.

## Source

- Canonical site: ${absoluteUrl("/")}
- JSON dataset: ${absoluteUrl("/datasets/ahr999.json")}
- CSV dataset: ${absoluteUrl("/datasets/ahr999.csv")}
- OpenAPI description: ${absoluteUrl("/openapi.json")}
- Repository: https://github.com/RuochenLyu/ahr999-dataset

The dataset is updated daily after the UTC daily BTCUSDT close is available. Rows are ordered oldest first.

## Field Contract

Each JSON row has:

- \`date\`: UTC date in \`YYYY-MM-DD\`.
- \`close\`: BTCUSDT daily close from Binance public market data.
- \`ma200\`: 200-day simple moving average of \`close\`, or \`null\` before it exists.
- \`ahr999\`: \`(close / ma200) * (close / fitted)\`, or \`null\` before it exists.
- \`quantile5y\`: empirical rank of \`ahr999\` in the active recent window, or \`null\` before enough observations exist.
- \`windowKind\`: \`insufficient_samples\`, \`expanding\`, or \`rolling_5y\`.

## Common Tasks

Fetch the latest row:

\`\`\`bash
curl -s ${absoluteUrl("/datasets/ahr999.json")} | jq '.[-1]'
\`\`\`

Fetch a date range:

\`\`\`bash
curl -s ${absoluteUrl("/datasets/ahr999.json")} \\
  | jq '[.[] | select(.date >= "2026-01-01" and .date <= "2026-01-31")]'
\`\`\`

Download CSV:

\`\`\`bash
curl -O ${absoluteUrl("/datasets/ahr999.csv")}
\`\`\`

## Interpretation

Conventional AHR999 thresholds:

- \`< 0.45\`: bargain zone.
- \`0.45\` to \`< 1.20\`: DCA zone.
- \`1.20\` to \`< 3.00\`: caution zone.
- \`>= 3.00\`: bubble zone.

Describe these as heuristic zones, not predictions.

## Safety Boundaries

- Do not present AHR999 as financial advice.
- Do not claim the dataset predicts future BTC returns.
- Do not claim this site can trade, broker, authenticate users, or manage portfolios.
- When giving investment-related explanations, say the dataset is for research, education, and observability only.

## Attribution

Data files are licensed under CC BY 4.0. Cite:

\`ahr999-dataset contributors (2026). "ahr999-dataset - open BTC hoarding index computed from Binance BTCUSDT daily closes". https://github.com/RuochenLyu/ahr999-dataset\`
`;
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

function sha256File(filePath: string): string {
  const body = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(body).digest("hex");
}

function buildSkillIndex(): string {
  const digest = sha256File(skillPath);
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
  const latest = readLatestDatasetRow();
  writeFile(robotsPath, buildRobots());
  writeFile(llmsPath, buildLlms());
  writeFile(openApiPath, buildOpenApi(latest));
  writeFile(apiCatalogPath, buildApiCatalog());
  writeFile(skillPath, buildSkill());
  const latestDate = readLatestDatasetDate();
  writeFile(sitemapPath, buildSitemap(latestDate));
  writeFile(skillIndexPath, buildSkillIndex());
  console.log(
    `[metadata] generated agent-readiness files for ${latestDate}`,
  );
}

main();
