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

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/i;
const TAG_RE = /^v?\d+\.\d+\.\d+([-+.][\w.]+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const must = (re, value, what) => {
  if (!re.test(value)) throw new Error(`Unexpected ${what}: ${JSON.stringify(value)}`);
  return value;
};

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
let total = 0;
for (const repo of repos) {
  const rows = gh("api", "--paginate", `repos/${ORG}/${repo}/commits?per_page=100&since=${day(start)}T00:00:00Z&until=${asOf}T23:59:59Z`,
    "--jq", ".[] | [.sha, .commit.author.date] | @tsv").trim();
  for (const line of rows ? rows.split("\n") : []) {
    const [sha, date] = line.split("\t");
    if (seen.has(sha)) continue;
    seen.add(sha);
    // since/until filter by committer date; bin by author date and keep only days inside the window.
    const d = date.slice(0, 10);
    if (d < day(start) || d > asOf) continue;
    days[d] = (days[d] ?? 0) + 1;
    total++;
  }
}

// Plugins come from the catalog; versions from each repo's latest release.
const catalog = JSON.parse(Buffer.from(json("api", `repos/${ORG}/plugins/contents/.claude-plugin/marketplace.json`).content, "base64").toString());
const plugins = catalog.plugins.map((p) => {
  must(new RegExp(`^${ORG}/[\\w.-]+$`), p.source?.repo ?? "", "catalog source repo");
  const repo = p.source.repo.split("/")[1];
  must(NAME_RE, p.name, "plugin name");
  let release = null;
  try {
    const r = json("api", `repos/${ORG}/${repo}/releases/latest`);
    release = { tag: must(TAG_RE, r.tag_name, "release tag"), published_at: must(DATE_RE, r.published_at.slice(0, 10), "release date") };
  } catch (e) {
    // Only a missing release means "no release yet"; any other failure must stop the run.
    if (!/HTTP 404/.test(`${e.stderr ?? ""}${e.message}`)) throw e;
  }
  return { name: p.name, repo, description: p.description, release };
});

// Release count: releases published inside the same window as the commits.
let releases = 0;
for (const repo of repos) {
  const dates = gh("api", "--paginate", `repos/${ORG}/${repo}/releases?per_page=100`, "--jq", ".[] | select(.draft | not) | .published_at[0:10]").trim();
  releases += (dates ? dates.split("\n") : []).filter((d) => d >= day(start) && d <= asOf).length;
}

const out = {
  as_of: asOf,
  window: { start: day(start), weeks: WEEKS, timezone: "UTC" },
  source: "GitHub REST API (commits and releases inside the window, of public finolabs repositories, default branch) and finolabs/plugins catalog",
  repos,
  commits: { total, days: Object.fromEntries(Object.entries(days).sort(([a], [b]) => a.localeCompare(b))) },
  releases,
  plugins,
};
const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "../../profile/data/activity.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
console.log(`as of ${asOf}: ${total} commits, ${releases} releases, ${repos.length} repos, ${plugins.length} plugins`);
