# Profile art

Generates the images on the organization profile (`profile/README.md`).

| Output | Source of the content |
| --- | --- |
| `profile/assets/banner-{light,dark}.png` | Static copy, the FINO mark and wordmark from the FINOLABS design system (vendored in `vendor/`), and background line art generated with Google Antigravity (`vendor/generated/`, see its `SOURCE.md`). |
| `profile/assets/activity-{light,dark}.png` | `profile/data/activity.json`, written by `fetch-activity.mjs`. |

## Data

`fetch-activity.mjs` reads, through the `gh` CLI, for every public, non-archived, non-fork repository of the organization: default-branch commits (deduplicated by SHA, counted per UTC author day over 17 weeks) and releases published inside the same window. Plugin names, descriptions and repositories come from `finolabs/plugins` (`.claude-plugin/marketplace.json`); versions and dates from each repository's latest release. Nothing else is shown, and nothing is estimated.

Heatmap levels are the quartiles of the non-zero daily counts in the window, so the legend is relative to this window, not an absolute scale.

## Design

`snapshot-tokens.mjs` copies the colour tokens used (light and dark) from the design system's `packages/tokens/theme.css` into `tokens.json`, with the source commit. `render.mjs` references tokens by name only. Fonts (Anton, Space Grotesk, JetBrains Mono) are vendored under SIL OFL 1.1 (`fonts/OFL-*.txt`, sources and checksums in `fonts/SOURCE.md`). Every value interpolated into the page is validated and HTML-escaped, and the page carries a Content-Security-Policy that blocks frames, scripts and network access. The mark and wordmark are FINOLABS brand assets.

## Run

```bash
node scripts/profile-art/fetch-activity.mjs      # needs an authenticated gh CLI
node scripts/profile-art/render.mjs              # needs Chrome; CHROME_PATH overrides the lookup
node scripts/profile-art/verify-readme.mjs       # README plugin rows must equal the catalog
```

Update the tokens with `node scripts/profile-art/snapshot-tokens.mjs <design-system checkout>`.

`.github/workflows/refresh-activity.yml` runs this weekly on `main` in two jobs: `render` (read-only token, runs Chrome) and `publish` (write token, no Chrome) which opens a pull request when the images change. It never pushes to `main`. Opening the pull request needs the repository setting that lets Actions create pull requests; pull requests opened with `GITHUB_TOKEN` do not start other workflows.
