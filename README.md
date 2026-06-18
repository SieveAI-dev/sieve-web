# sieve-web

The official website for **Sieve** — a fully local LLM-traffic security proxy
for crypto-native developers. Served via GitHub Pages at
**[sieveai.dev](https://sieveai.dev)**.

Sieve is a single Rust binary that sits between your AI coding agent
(Claude Code / Codex CLI / Cursor) and the upstream model API
(Anthropic / OpenAI / relays). It inspects traffic in both directions —
redacting secrets on the way out, blocking dangerous tool calls on the way in
(fail-closed) — so there is a moment of cognitive friction before irreversible
actions (signing, transfers, deploys).

## Design constraints

- **Self-contained static HTML, zero dependencies.** No build step, no
  framework, no CDN, no tracking. Just HTML + one shared CSS file + one small
  vanilla-JS file.
- **Responsive** and accessible (skip link, ARIA, reduced-motion support).
- **Bilingual** (English / 中文) via a client-side toggle; preference persists
  in `localStorage` (`sieve-lang`).

## Directory layout

```
sieve-web/
├── index.html            # Home (landing)
├── how-it-works.html     # Data flow + detection model
├── security-privacy.html # Telemetry, privacy guarantees, kill switches
├── get-started.html      # Install / closed-beta onboarding
├── docs.html             # Documentation hub
├── 404.html              # Friendly bilingual not-found page
├── assets/
│   ├── style.css         # Shared design system (dark "secure terminal")
│   └── app.js            # Language toggle, active-nav, mobile menu
├── CNAME                 # GitHub Pages custom domain (sieveai.dev)
├── robots.txt            # Crawl rules + sitemap pointer
├── sitemap.xml           # URL list for search engines
├── README.md             # This file
└── DEPLOY.md             # GitHub Pages + custom-domain setup
```

> Note: page files beyond `404.html` are listed for orientation; content pages
> are added as the site is built out. The shared `assets/` and support files are
> the stable foundation.

## Local preview

No tooling required — serve the folder over HTTP so root-absolute paths
(`/assets/...`) resolve correctly:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening the HTML files directly via `file://` will break the absolute asset
paths; always serve over HTTP.)

## Content & license

- **Site content / documentation:** [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- The Sieve daemon source code is licensed separately under **Apache-2.0**
  (see the [`sieve`](https://github.com/SieveAI-dev/sieve) repository).

Contact: doskey.lee@gmail.com

---

## 简介（中文）

**Sieve** 官网仓库，通过 GitHub Pages 部署在
**[sieveai.dev](https://sieveai.dev)**。

Sieve 是一个全本地的 LLM 流量安全代理（单个 Rust 二进制），位于你的 AI
编码 agent（Claude Code / Codex CLI / Cursor）与上游模型 API（Anthropic /
OpenAI / 中转站）之间，双向检测流量：出站脱敏密钥、入站拦截危险工具调用
（fail-closed），在不可逆操作（签名、转账、部署）前制造一道认知摩擦。

本站为**自包含静态 HTML、零依赖**：无构建步骤、无框架、无 CDN、无追踪，
仅 HTML + 一个共享 CSS + 一个轻量 vanilla-JS。支持中英双语切换（偏好存于
`localStorage`）。

**本地预览**（需通过 HTTP 提供，否则 `/assets/` 绝对路径会失效）：

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

**许可**：站点内容与文档采用
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)；Sieve
守护进程源码单独以 Apache-2.0 授权。

联系：doskey.lee@gmail.com
