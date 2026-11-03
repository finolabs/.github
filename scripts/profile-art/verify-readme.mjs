// Fails when the plugin descriptions in profile/README.md differ from the
// catalog descriptions captured in profile/data/activity.json.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const readme = readFileSync(resolve(root, "profile/README.md"), "utf8");
const { plugins } = JSON.parse(readFileSync(resolve(root, "profile/data/activity.json"), "utf8"));
let bad = 0;
for (const p of plugins) {
  const row = `| [${p.name}](https://github.com/finolabs/${p.repo}) | ${p.description} |`;
  if (!readme.includes(row)) { console.error(`README row differs from catalog: ${p.name}`); bad++; }
}
if (bad) process.exit(1);
console.log(`${plugins.length} plugin rows match the catalog`);
