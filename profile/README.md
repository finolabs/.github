<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="assets/banner-light.png">
  <img src="assets/banner-light.png" alt="FINOLABS. AI-native. Tech-driven. Open source plugins for AI coding agents." width="1280">
</picture>

FINOLABS is an investment and technology company. Built on AI-native and tech-driven foundations, we sponsor business ventures from fashion and retail to lifestyle.

## Open source

Plugins for AI coding agents. Every plugin lives in one shared catalog, [`finolabs/plugins`](https://github.com/finolabs/plugins), so Claude Code and Codex need a single marketplace source. The [developer hub](https://finolabs.github.io) lists them with install commands.

| Plugin | Description |
| --- | --- |
| [finolabs-vibecode](https://github.com/finolabs/finolabs-vibecode) | Engineering practice for AI coding agents: routing, delegation, review and security gates, verification, versioning, agent scans and mode settings. |
| [agybird](https://github.com/finolabs/agybird) | Delegate code work, image generation or editing, and general tasks to the official Google Antigravity CLI through an existing Gemini subscription. |
| [vietnamizer](https://github.com/finolabs/vietnamizer) | Biên tập bản nháp, bài viết, README và bản dịch tiếng Việt cho tự nhiên hơn, giữ nguyên ý, dữ kiện, thuật ngữ, code và giọng người viết. |
| [markmap-skills](https://github.com/finolabs/markmap-skills) | Markmap mindmaps for AI agents with strict cognitive structuring, delivered as clean .mindmap.md files and standalone HTML pages. |

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/activity-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="assets/activity-light.png">
  <img src="assets/activity-light.png" alt="Commit heatmap, release count and latest plugin versions for the public FINOLABS repositories, drawn from the GitHub API." width="1280">
</picture>

Figures come from the GitHub API and the catalog. [How the images are generated](https://github.com/finolabs/.github/blob/main/scripts/profile-art/README.md).

## Install

Claude Code:

```bash
claude plugin marketplace add finolabs/plugins
claude plugin install finolabs-vibecode@finolabs
```

Codex:

```bash
codex plugin marketplace add finolabs/plugins
codex plugin add finolabs-vibecode@finolabs
```

Antigravity does not use a catalog. Install each plugin from its repository URL, for example `agy plugin install https://github.com/finolabs/finolabs-vibecode`. Any other plugin installs the same way: change the plugin name in the Claude Code and Codex commands, and the repository URL in the Antigravity command. Details are in the [catalog README](https://github.com/finolabs/plugins#readme).

## Contact

- Email: [finos@finolabs.io](mailto:finos@finolabs.io)
- Security issues: see [SECURITY.md](https://github.com/finolabs/.github/blob/main/SECURITY.md)
- License: the plugins above are MIT licensed.
