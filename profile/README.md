# FINOLABS

Công ty Đầu tư & Công nghệ. FINOLABS lấy AI-native và Tech-driven làm nền tảng để sponsor cho các dự án kinh doanh, từ Thời trang, Bán lẻ đến Đời sống.

## Mã nguồn mở

Plugin cho AI coding agent. Mọi plugin cùng nằm trong một catalog chung, [`finolabs/plugins`](https://github.com/finolabs/plugins), nên chỉ cần thêm một nguồn trên Claude Code và Codex.

| Plugin | Mô tả |
| --- | --- |
| [finolabs-vibecode](https://github.com/finolabs/finolabs-vibecode) | Engineering practice for AI coding agents: routing, delegation, review and security gates, verification, versioning and open source readiness. |
| [agybird](https://github.com/finolabs/agybird) | Delegate code work, image generation or editing, and general tasks to the official Google Antigravity CLI through an existing Gemini subscription. |
| [vietnamizer](https://github.com/finolabs/vietnamizer) | Biên tập bản nháp, bài viết, README và bản dịch tiếng Việt cho tự nhiên hơn, giữ nguyên ý, dữ kiện, thuật ngữ, code và giọng người viết. |
| [markmap-skills](https://github.com/finolabs/markmap-skills) | Markmap mindmaps for AI agents with strict cognitive structuring, delivered as clean .mindmap.md files and standalone HTML pages. |

## Cài đặt

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

Antigravity không dùng catalog. Cài từng plugin từ địa chỉ repo, ví dụ `agy plugin install https://github.com/finolabs/finolabs-vibecode`. Plugin khác cài giống cách trên: đổi tên plugin ở lệnh Claude Code và Codex, đổi địa chỉ repo ở lệnh Antigravity. Chi tiết nằm trong [README của catalog](https://github.com/finolabs/plugins#readme).

## Liên hệ

- Email: [finos@finolabs.io](mailto:finos@finolabs.io)
- Lỗi bảo mật: xem [SECURITY.md](https://github.com/finolabs/.github/blob/main/SECURITY.md)
- Giấy phép: các plugin ở trên dùng giấy phép MIT.
