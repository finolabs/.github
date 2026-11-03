// Extracts the tokens the profile art uses from the FINOLABS design system
// (private repo) into tokens.json, so rendering needs no access to that repo.
// Usage: node snapshot-tokens.mjs <path to design-system checkout>
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2];
if (!root) throw new Error("Pass the design-system checkout path.");
const css = readFileSync(join(root, "packages/tokens/theme.css"), "utf8");

// Token names used by render.mjs. Anything missing makes this script fail.
const NAMES = [
  "ink-0", "ink-50", "ink-100", "ink-200", "ink-300", "ink-400", "ink-500", "ink-700", "ink-800", "ink-900", "ink-950",
  "fn-mint-100", "fn-mint-200", "fn-mint-300", "fn-mint-400", "fn-mint-500", "fn-mint-600", "fn-mint-700", "fn-mint-800", "fn-mint-900",
  "background", "foreground", "muted", "muted-foreground", "border",
];

// Collect `--color-*: value;` declarations from the first :root block (light)
// and the first `.dark` block, then resolve var() references inside each.
function block(selector) {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) throw new Error(`No ${selector} block in theme.css`);
  const end = css.indexOf("\n}", start);
  return css.slice(start, end);
}
function decls(text) {
  const map = {};
  for (const m of text.matchAll(/--color-([\w-]+):\s*([^;]+);/g)) map[m[1]] = m[2].trim();
  return map;
}
const light = decls(block(":root"));
const dark = { ...light, ...decls(block(".dark")) };

function resolve(map, name, seen = []) {
  let v = map[name];
  if (v === undefined) throw new Error(`Token --color-${name} not found`);
  const ref = v.match(/^var\(--color-([\w-]+)\)$/);
  if (ref) {
    if (seen.includes(name)) throw new Error(`Cycle at ${name}`);
    return resolve(map, ref[1], [...seen, name]);
  }
  return v;
}

const out = { source: { repo: "finolabs/design-system", file: "packages/tokens/theme.css", commit: "" }, light: {}, dark: {} };
out.source.commit = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
for (const n of NAMES) {
  out.light[n] = resolve(light, n);
  out.dark[n] = resolve(dark, n);
}
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, "tokens.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`tokens.json written from ${out.source.commit.slice(0, 7)}`);
