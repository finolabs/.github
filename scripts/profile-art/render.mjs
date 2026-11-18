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
// Finos in its idle state, from the design system's state set; currentColor is the body.
// The site draws Finos white with dark eyes in both themes (finolabs.io, 16/11/2026): body in
// currentColor, eye backing in ink-700.
const finos = (body, eye) => `data:image/svg+xml;base64,${Buffer.from(readFileSync(join(here, "vendor/finos/idle.svg"), "utf8")
  .replace(/ color="#[0-9A-Fa-f]{6}"/, ` color="${body}"`).replace(/fill="#F7F7FB"/, `fill="${eye}"`)).toString("base64")}`;
// Finos's ember, used as the H1's full stop as on the site.
const EMBER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='48 57 104 119'%3E%3Cpath transform='translate(0 233) scale(1 -1)' d='M100 57 C131 57 152 102 152 131 C152 159 129 176 100 176 C71 176 48 159 48 131 C48 102 69 57 100 57 Z'/%3E%3C/svg%3E")`;
const wordmark = readFileSync(join(here, "vendor/fino-wordmark.svg"), "utf8").replace(/<title>.*?<\/title>/s, "").replace(/ width="[\d.]+" height="[\d.]+"/, "");

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

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

// Product icons from each repository's assets/icon.svg, labelled with the repository name in lowercase
// (Fio, 18/11/2026; agybird is not promoted).
const PRODUCTS = [
  ["vibebiz", '<path d="M36 16 V100" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><path d="M36 74 A28 28 0 1 1 64 102 H36" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M84 94 L104 112" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><circle cx="64" cy="74" r="6" fill="currentColor"/>'],
  ["vibecode", '<path d="M30 36 L10 64 L30 92 M98 36 L118 64 L98 92" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><rect x="36" y="54" width="20" height="20" rx="4" fill="currentColor"/><path d="M72 64 H92" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>'],
  ["vietnamizer", '<path d="M47 28 Q64 45 81 28" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><ellipse cx="61" cy="75" rx="23" ry="25" fill="none" stroke="currentColor" stroke-width="10"/><path d="M84 50 V100" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>'],
  ["markmap-skills", '<circle cx="40" cy="64" r="11" fill="none" stroke="currentColor" stroke-width="9"/><path d="M51 64 C72 64 72 34 100 34 M51 64 H100 M51 64 C72 64 72 94 100 94" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>'],
];

// Banner copy and type follow the finolabs.io hero (16/11/2026), scaled from its 1440px design:
// the H1 phrase at 88px (site 128px); the line above it sized so it runs exactly as wide as
// "Agentic" (25.3px, measured in Chrome with the vendored Space Grotesk); the paragraph as wide as
// "Universe" and its ember, at the site's 15.5px floor for small scales. Finos sits at the centre
// of an orbit of the product icons, with the fixed AI line under it.
function banner(theme) {
  const CX = 1010, CY = 214, R = 150;
  const at = (deg) => [CX + R * Math.cos((deg * Math.PI) / 180), CY + R * Math.sin((deg * Math.PI) / 180)];
  const products = PRODUCTS.map(([name, svg], i) => {
    const [x, y] = at([180, -128, -52, 0][i]);
    return `<div class="prod" style="left:${x}px;top:${y}px"><div class="orb"><svg viewBox="0 0 128 128">${svg}</svg></div><span>${esc(name)}</span></div>`;
  }).join("");
  const ring = (r) => `<div class="ring" style="left:${CX - r}px;top:${CY - r}px;width:${2 * r}px;height:${2 * r}px"></div>`;
  const card = `var(--${theme === "light" ? "ink-0" : "ink-900"})`;
  const shadow = theme === "light"
    ? "drop-shadow(0 0 1.5px rgba(11,11,23,.32)) drop-shadow(0 0 10px rgba(91,91,121,.18)) drop-shadow(0 14px 22px rgba(75,30,115,.16))"
    : "drop-shadow(0 0 12px rgba(201,168,229,.25))";
  return `${BASE(theme)}
body{width:1280px;height:440px;position:relative}
.wm{position:absolute;left:72px;top:46px;color:var(--foreground)} .wm svg{height:26px;width:auto;aspect-ratio:337.55/87.5;display:block}
.h1{position:absolute;left:72px;top:108px}
.h1-lead{display:block;font-size:25.3px;font-weight:500;letter-spacing:-.02em;line-height:1.1;margin-bottom:.15em}
.iri-line{display:inline-block;font-size:88px;font-weight:700;line-height:.95;letter-spacing:-.045em;padding-bottom:.08em;white-space:nowrap;
  background:linear-gradient(92deg,var(--fn-teal-300) 0%,var(--fn-mint-300) 16%,var(--fn-violet-400) 31%,var(--fn-violet-600) 50%,var(--fn-violet-400) 69%,var(--fn-mint-300) 84%,var(--fn-teal-300) 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.ember{display:inline-block;font-size:88px;width:.19em;height:.218em;margin-left:.085em;vertical-align:-.018em;background:var(--fn-mint-300);-webkit-mask:${EMBER} center/100% 100% no-repeat}
p{position:absolute;left:72px;top:262px;width:362px;font-size:15.5px;line-height:1.6;color:var(--muted-foreground)}
.glow{position:absolute;left:${CX - 120}px;top:${CY - 120}px;width:240px;height:240px;border-radius:50%;filter:blur(64px);opacity:${theme === "light" ? ".35" : ".45"};
  background:conic-gradient(from 220deg,var(--fn-mint-300),var(--fn-teal-300),var(--fn-violet-600),var(--fn-violet-400),var(--fn-mint-300))}
.ring{position:absolute;border-radius:50%;border:1.5px solid var(--border)}
.finos{position:absolute;left:${CX - 75}px;top:${CY - 80}px;width:150px;height:150px;filter:${shadow}}
.ai{position:absolute;left:${CX}px;top:${CY + 70}px;transform:translateX(-50%);white-space:nowrap;font:500 14px "JetBrains Mono",monospace;color:var(--foreground);
  padding:6px 12px;border-radius:999px;border:1px solid var(--border);background:${card}}
.prod{position:absolute;width:0;height:0}
.orb{position:absolute;left:-28px;top:-28px;width:56px;height:56px;border-radius:16px;display:grid;place-items:center;color:var(--fn-violet-${theme === "light" ? "600" : "400"});border:1px solid var(--border);background:${card}}
.orb svg{width:32px;height:32px}
.prod span{position:absolute;left:0;top:36px;transform:translateX(-50%);white-space:nowrap;font:500 14px "JetBrains Mono",monospace;color:var(--foreground)}
.rule{position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--border)}
</style>
<div class="wm">${wordmark}</div>
<div class="h1"><span class="h1-lead">Your avatar, at work in the</span><span class="iri-line">Agentic Universe</span><span class="ember"></span></div>
<p>We build Agent Skills, MCP servers and AI agents that bring a real person's expertise to Claude Code, Codex and Antigravity, so your avatar works the way you would.</p>
<div class="glow"></div>${ring(82)}${ring(R)}${ring(205)}
<img class="finos" src="${finos(tokens[theme]["ink-0"], tokens[theme]["ink-700"])}" alt="">
<span class="ai">I'm Finos, the AI avatar of finolabs.io</span>
${products}
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
  const monthAt = [];
  for (let w = 0; w < data.window.weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(start); date.setUTCDate(start.getUTCDate() + w * 7 + d);
      if (date > asOf) continue;
      const iso = date.toISOString().slice(0, 10);
      const n = data.commits.days[iso] ?? 0;
      cells += `<div class="c" style="left:${w * STEP}px;top:${d * STEP}px;background:var(--${ramp[level(n)]})"></div>`;
    }
    const m = new Date(start.getTime() + w * 7 * 864e5).getUTCMonth();
    if (m !== lastMonth) { monthAt.push([w, m]); lastMonth = m; }
  }
  // A month that starts too close to the previous label replaces it, so labels never touch.
  for (const [i, [w, m]] of monthAt.entries()) {
    if (i + 1 < monthAt.length && (monthAt[i + 1][0] - w) * STEP < 72) continue;
    months += `<span style="left:${w * STEP}px">${MONTHS[m]}</span>`;
  }
  const gridW = data.window.weeks * STEP - GAP, gridH = 7 * STEP - GAP;
  const legend = ramp.map((r) => `<i style="background:var(--${r})"></i>`).join("");
  const icon = {
    commit: '<circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    pkg: '<path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  };
  const stat = (ic, value, label) => `<div class="stat"><svg class="icon" viewBox="0 0 24 24">${icon[ic]}</svg><b class="display">${value}</b><span class="eyebrow">${label}</span></div>`;
  // One row of tiles, one column per plugin. The longest name sets the name size
  // (JetBrains Mono advances 0.6em), so every name fits on one line.
  const cols = data.plugins.length, TILE_PAD = 20;
  const nameRoom = (1280 - 2 * 72 - 20 * (cols - 1)) / cols - 2 * TILE_PAD - 4;
  const nameSize = Math.min(20, Math.floor(nameRoom / (0.6 * Math.max(...data.plugins.map((p) => p.repo.length)))));
  if (nameSize < 14) throw new Error(`${cols} plugin tiles do not fit one row; change the activity layout`);
  const tiles = data.plugins.map((p) => `<div class="tile"><span class="mono name">${esc(p.repo)}</span><b class="display">${p.release ? esc(p.release.tag) : "&nbsp;"}</b><span class="mono when">${p.release ? esc(fmt(p.release.published_at)) : "no release yet"}</span></div>`).join("");

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
.tiles{position:absolute;left:72px;right:72px;bottom:56px;display:grid;grid-template-columns:repeat(${cols},1fr);gap:20px}
.tile{border:2px solid var(--border);border-radius:18px;padding:22px ${TILE_PAD}px;display:flex;flex-direction:column;gap:6px;background:var(--${theme === "light" ? "ink-0" : "ink-900"})}
.tile .name{font-size:${nameSize}px;font-weight:500;white-space:nowrap} .tile b{font-size:56px;line-height:1.05;color:var(--foreground)}
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
