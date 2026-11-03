// Collects the figures shown in profile/assets/activity-*.png from the GitHub
// API and the shared catalog, and writes profile/data/activity.json.
// Needs the `gh` CLI, authenticated (locally, or GH_TOKEN in Actions).
// Usage: node fetch-activity.mjs [YYYY-MM-DD]   (as-of date, UTC; default today)
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ORG = "finolabs";
const WEEKS = 17;
const gh = (...args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 << 20 });
const json = (...args) => JSON.parse(gh(...args));

const asOf = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const asOfDate = new Date(`${asOf}T00:00:00Z`);
// Window: WEEKS Sunday-start weeks, the last one containing the as-of date.
const weekStart = new Date(asOfDate);
weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
const start = new Date(weekStart);
start.setUTCDate(start.getUTCDate() - 7 * (WEEKS - 1));
const day = (d) => d.toISOString().slice(0, 10);

const repos = json("repo", "list", ORG, "--visibility", "public", "--json", "name,isArchived,isFork", "--limit", "100")
  .filter((r) => !r.isArchived && !r.isFork)
  .map((r) => r.name)
  .sort();

// Commits on each repo's default branch, deduplicated by SHA, counted per UTC day.
const seen = new Set();
const days = {};
for (const repo of repos) {
  const rows = gh("api", "--paginate", `repos/${ORG}/${repo}/commits?per_page=100&since=${day(start)}T00:00:00Z&until=${asOf}T23:59:59Z`,
    "--jq", ".[] | [.sha, .commit.author.date] | @tsv").trim();
  for (const line of rows ? rows.split("\n") : []) {
    const [sha, date] = line.split("\t");
    if (seen.has(sha)) continue;
    seen.add(sha);
    const d = date.slice(0, 10);
    days[d] = (days[d] ?? 0) + 1;
  }
}

// Plugins come from the catalog; versions from each repo's latest release.
const catalog = JSON.parse(Buffer.from(json("api", `repos/${ORG}/plugins/contents/.claude-plugin/marketplace.json`).content, "base64").toString());
const plugins = catalog.plugins.map((p) => {
  const repo = p.source.repo.split("/")[1];
  let release = null;
  try {
    const r = json("api", `repos/${ORG}/${repo}/releases/latest`);
    release = { tag: r.tag_name, published_at: r.published_at.slice(0, 10) };
  } catch {
    // No release yet: the tile shows no version.
  }
  return { name: p.name, repo, description: p.description, release };
});

// Release count: every published release across the public repos.
let releases = 0;
for (const repo of repos) {
  releases += Number(gh("api", "--paginate", `repos/${ORG}/${repo}/releases?per_page=100`, "--jq", "[.[] | select(.draft | not)] | length").trim().split("\n").reduce((a, b) => a + Number(b), 0));
}

const out = {
  as_of: asOf,
  window: { start: day(start), weeks: WEEKS, timezone: "UTC" },
  source: "GitHub REST API (commits and releases of public finolabs repositories, default branch) and finolabs/plugins catalog",
  repos,
  commits: { total: seen.size, days: Object.fromEntries(Object.entries(days).sort(([a], [b]) => a.localeCompare(b))) },
  releases,
  plugins,
};
const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "../../profile/data/activity.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
console.log(`as of ${asOf}: ${seen.size} commits, ${releases} releases, ${repos.length} repos, ${plugins.length} plugins`);
