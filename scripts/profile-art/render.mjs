// Renders the organization profile images from tokens.json, the vendored
// fonts and mark, and profile/data/activity.json, using headless Chrome.
// Usage: node render.mjs      (CHROME_PATH overrides the Chrome lookup)
// Output: profile/assets/{banner,activity}-{light,dark}.png at 2x.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../profile/assets");
const tokens = JSON.parse(readFileSync(join(here, "tokens.json"), "utf8"));
const data = JSON.parse(readFileSync(resolve(here, "../../profile/data/activity.json"), "utf8"));
const markUri = `data:image/png;base64,${readFileSync(join(here, "vendor/fino-mark.png")).toString("base64")}`;
const wordmark = readFileSync(join(here, "vendor/fino-wordmark.svg"), "utf8").replace(/<title>.*?<\/title>/s, "").replace(/ width="360" height="80"/, "");

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const art = (theme) => `data:image/jpeg;base64,${readFileSync(join(here, `vendor/generated/banner-art-${theme}.jpg`)).toString("base64")}`;

const chrome = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "google-chrome", "chromium"]
  .filter(Boolean).find((c) => c.includes("/") ? existsSync(c) : true);

const font = (family, weight, file) =>
  `@font-face{font-family:"${family}";font-weight:${weight};src:url("${pathToFileURL(join(here, "fonts", file))}") format("woff2")}`;
const FONTS = [
  font("Anton", 400, "anton-latin-400-normal.woff2"),
  font("Space Grotesk", 500, "space-grotesk-latin-500-normal.woff2"),
  font("Space Grotesk", 700, "space-grotesk-latin-700-normal.woff2"),
  font("JetBrains Mono", 400, "jetbrains-mono-latin-400-normal.woff2"),
  font("JetBrains Mono", 500, "jetbrains-mono-latin-500-normal.woff2"),
].join("");

// Every colour below is a token name; hex only exists in tokens.json.
const cssVars = (theme) => Object.entries(tokens[theme]).map(([k, v]) => `--${k}:${v}`).join(";");
// Panel surface: ink-50 on light, ink-950 (the page background) on dark.
const SURFACE = { light: "ink-50", dark: "background" };

const BASE = (theme) => `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src file:"><style>${FONTS}
:root{${cssVars(theme)};--surface:var(--${SURFACE[theme]})}
*{box-sizing:border-box;margin:0}
body{background:var(--surface);color:var(--foreground);font-family:"Space Grotesk",sans-serif;overflow:hidden}
.eyebrow{font:500 24px "JetBrains Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--muted-foreground)}
.display{font-family:Anton,sans-serif;text-transform:uppercase;letter-spacing:-.02em;font-weight:400}
.mono{font-family:"JetBrains Mono",monospace}
svg.icon{width:36px;height:36px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
`;

function banner(theme) {
  return `${BASE(theme)}
body{width:1280px;height:440px;position:relative}
.art{position:absolute;inset:0;background:url("${art(theme)}") right center/cover no-repeat;mix-blend-mode:${theme === "light" ? "multiply" : "screen"};
  -webkit-mask-image:linear-gradient(90deg,transparent 15%,#000 55%);mask-image:linear-gradient(90deg,transparent 15%,#000 55%)}
.wm{position:absolute;left:72px;top:52px;color:var(--foreground)} .wm svg{height:50px;width:225px;display:block}
h1{position:absolute;left:72px;top:128px;font-size:108px;line-height:1}
p{position:absolute;left:72px;top:368px;font-size:32px;font-weight:500;color:var(--muted-foreground)}
.mark{position:absolute;right:92px;top:90px;width:260px;height:260px;border-radius:24px}
.rule{position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--border)}
</style><div class="art"></div>
<div class="wm">${wordmark}</div>
<h1 class="display">AI-native.<br>Tech-driven.</h1>
<p>Open source plugins for AI coding agents.</p>
<img class="mark" src="${markUri}" alt="">
<div class="rule"></div>`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (iso) => { const d = new Date(`${iso}T00:00:00Z`); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

function activity(theme) {
  const CELL = 36, GAP = 6, STEP = CELL + GAP;
  const start = new Date(`${data.window.start}T00:00:00Z`);
  const counts = Object.values(data.commits.days).filter((n) => n > 0).sort((a, b) => a - b);
  // Level cut-offs: quartiles of the non-zero daily counts in the window.
  const q = (p) => counts[Math.min(counts.length - 1, Math.floor(p * counts.length))];
  const cuts = [q(0.25), q(0.5), q(0.75)];
  const level = (n) => (n === 0 ? 0 : n <= cuts[0] ? 1 : n <= cuts[1] ? 2 : n <= cuts[2] ? 3 : 4);
  // Light: light-to-dark mint steps on a pale cell; dark: dark-to-light on a dark cell.
  const ramp = theme === "light"
    ? ["muted", "fn-mint-200", "fn-mint-400", "fn-mint-600", "fn-mint-800"]
    : ["muted", "fn-mint-900", "fn-mint-700", "fn-mint-500", "fn-mint-300"];
  const asOf = new Date(`${data.as_of}T00:00:00Z`);
  let cells = "", months = "", lastMonth = -1;
  for (let w = 0; w < data.window.weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(start); date.setUTCDate(start.getUTCDate() + w * 7 + d);
      if (date > asOf) continue;
      const iso = date.toISOString().slice(0, 10);
      const n = data.commits.days[iso] ?? 0;
      cells += `<div class="c" style="left:${w * STEP}px;top:${d * STEP}px;background:var(--${ramp[level(n)]})"></div>`;
    }
    const m = new Date(start.getTime() + w * 7 * 864e5).getUTCMonth();
    if (m !== lastMonth) { months += `<span style="left:${w * STEP}px">${MONTHS[m]}</span>`; lastMonth = m; }
  }
  const gridW = data.window.weeks * STEP - GAP, gridH = 7 * STEP - GAP;
  const legend = ramp.map((r) => `<i style="background:var(--${r})"></i>`).join("");
  const icon = {
    commit: '<circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    pkg: '<path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  };
  const stat = (ic, value, label) => `<div class="stat"><svg class="icon" viewBox="0 0 24 24">${icon[ic]}</svg><b class="display">${value}</b><span class="eyebrow">${label}</span></div>`;
  const tiles = data.plugins.map((p) => `<div class="tile"><span class="mono name">${esc(p.name)}</span><b class="display">${p.release ? esc(p.release.tag) : "&nbsp;"}</b><span class="mono when">${p.release ? esc(fmt(p.release.published_at)) : "no release yet"}</span></div>`).join("");

  return `${BASE(theme)}
body{width:1280px;height:940px;position:relative}
.head{position:absolute;left:72px;top:56px}
h2{font-size:72px;line-height:1;margin-top:14px}
.sub{position:absolute;left:72px;top:188px;font:400 24px/1.5 "JetBrains Mono",monospace;color:var(--muted-foreground)}
.months{position:absolute;left:112px;top:262px;width:${gridW}px;height:30px;font:400 22px "JetBrains Mono",monospace;color:var(--muted-foreground)} .months span{position:absolute}
.days{position:absolute;left:72px;top:308px;font:400 22px "JetBrains Mono",monospace;color:var(--muted-foreground)} .days span{position:absolute;white-space:nowrap}
.grid{position:absolute;left:112px;top:308px;width:${gridW}px;height:${gridH}px}
.c{position:absolute;width:${CELL}px;height:${CELL}px;border-radius:8px}
.legend{position:absolute;left:112px;top:${308 + gridH + 24}px;display:flex;align-items:center;gap:8px;font:400 22px "JetBrains Mono",monospace;color:var(--muted-foreground)}
.legend i{width:26px;height:26px;border-radius:6px;display:block}
.col{position:absolute;left:900px;top:308px;width:308px;display:flex;flex-direction:column;gap:28px}
.stat{display:grid;grid-template-columns:36px 1fr;column-gap:14px;align-items:center;color:var(--muted-foreground)}
.stat b{font-size:68px;line-height:1;color:var(--foreground);grid-column:2;grid-row:1}
.stat .eyebrow{grid-column:1/3;font-size:20px;margin-top:6px}
.tiles{position:absolute;left:72px;right:72px;bottom:56px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.tile{border:2px solid var(--border);border-radius:18px;padding:22px 24px;display:flex;flex-direction:column;gap:6px;background:var(--${theme === "light" ? "ink-0" : "ink-900"})}
.tile .name{font-size:20px;font-weight:500} .tile b{font-size:56px;line-height:1.05;color:var(--foreground)}
.tile .when{font-size:20px;color:var(--muted-foreground)}
</style>
<div class="head"><span class="eyebrow">Activity</span><h2 class="display">Shipping in the open</h2></div>
<div class="sub">Commits across ${data.repos.length} public repositories<br>${fmt(data.window.start)} to ${fmt(data.as_of)} · UTC</div>
<div class="months">${months}</div>
<div class="days"><span style="top:${1 * STEP + 6}px">Mon</span><span style="top:${3 * STEP + 6}px">Wed</span><span style="top:${5 * STEP + 6}px">Fri</span></div>
<div class="grid">${cells}</div>
<div class="legend">Less ${legend} More</div>
<div class="col">${stat("commit", data.commits.total, "Commits")}${stat("tag", data.releases, "Releases")}${stat("pkg", data.plugins.length, "Plugins")}</div>
<div class="tiles">${tiles}</div>`;
}

mkdirSync(out, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "finolabs-profile-art-"));
for (const [name, build, h] of [["banner", banner, 440], ["activity", activity, 940]]) {
  for (const theme of ["light", "dark"]) {
    const html = join(tmp, `${name}-${theme}.html`);
    const doc = build(theme);
    // Every token the markup references must exist in tokens.json.
    for (const m of doc.matchAll(/var\(--([\w-]+)\)/g)) if (m[1] !== "surface" && !(m[1] in tokens[theme])) throw new Error(`Unknown token --${m[1]}`);
    writeFileSync(html, doc);
    execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2", "--virtual-time-budget=4000",
      `--window-size=1280,${h}`, `--screenshot=${join(out, `${name}-${theme}.png`)}`, pathToFileURL(html).href], { stdio: "pipe" });
    console.log(`profile/assets/${name}-${theme}.png`);
  }
}
