// Fails when the plugin table in profile/README.md differs from the catalog
// descriptions captured in profile/data/activity.json: same rows, same order, same text.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const lines = readFileSync(resolve(root, "profile/README.md"), "utf8").split("\n");
const { plugins } = JSON.parse(readFileSync(resolve(root, "profile/data/activity.json"), "utf8"));
const start = lines.indexOf("| Plugin | Description |");
if (start < 0) throw new Error("Plugin table not found in README");
const rows = [];
for (let i = start + 2; i < lines.length && lines[i].startsWith("|"); i++) rows.push(lines[i]);
const expected = plugins.map((p) => `| [${p.name}](https://github.com/finolabs/${p.repo}) | ${p.description} |`);
if (rows.length !== expected.length || rows.some((r, i) => r !== expected[i])) {
  console.error("README plugin table differs from the catalog.\nREADME:\n" + rows.join("\n") + "\nCatalog:\n" + expected.join("\n"));
  process.exit(1);
}
console.log(`${plugins.length} plugin rows match the catalog`);
