# sieve-web

The official website for **Sieve** — a fully local LLM-traffic security proxy
for crypto-native developers. Served via GitHub Pages at
**[sieveai.dev](https://sieveai.dev)**.

Sieve is a single Rust binary that sits on `127.0.0.1` between your AI coding
agent (Claude Code / Codex / Cursor) and the upstream model API
(Anthropic / OpenAI / relays). It inspects traffic in both directions —
redacting secrets on the way out, intercepting dangerous tool calls on the way
in (fail-closed) — so there is a moment of cognitive friction before
irreversible actions (signing, transfers, deploys).

The visual design was produced in [Claude Design](https://claude.ai/design) and
ported here to plain, dependency-free static HTML.

## Design constraints

- **Self-contained static HTML, zero external dependencies.** No build step, no
  framework, **no CDN** — including fonts: JetBrains Mono / IBM Plex Sans /
  IBM Plex Mono are **self-hosted** under `assets/fonts/` (a privacy product
  must not phone home to Google Fonts).
- **Theming:** light / dark / system, driven by `data-theme` on `<html>`;
  preference persists in `localStorage` (`sieve.theme`).
- **Bilingual:** English / 中文 via a client-side toggle (`data-lang`);
  preference persists in `localStorage` (`sieve.lang`). Both languages ship in
  the markup, so it works without JS and is indexable.
- **Responsive** and accessible (focus-visible, ARIA, `prefers-reduced-motion`).

## Directory layout

```
sieve-web/
├── index.html      # Single-page landing (hero, how-it-works, detection, verify, get-started)
├── docs.html       # Documentation hub (sidebar + quickstart + cards → GitHub docs)
├── 404.html        # Friendly bilingual not-found page
├── assets/
│   ├── style.css   # Shared design system (themes, tokens, components, animations)
│   ├── app.js      # Theme/language controls, animated sequence diagram, scroll reveal, mobile nav
│   └── fonts/      # 11 self-hosted woff2 (JetBrains Mono / IBM Plex Sans / IBM Plex Mono)
├── CNAME           # GitHub Pages custom domain (sieveai.dev)
├── robots.txt      # Crawl rules + sitemap pointer
├── sitemap.xml     # URL list for search engines
├── README.md       # This file
├── DEPLOY.md       # GitHub Pages + custom-domain setup
└── docs/           # Internal notes (e.g. the Claude Design brief) — not published content
```

## Local preview

Assets use relative paths, but serving over HTTP is still recommended:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Content & license

- **Site content / documentation:** [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- The Sieve daemon source code is licensed separately under **Apache-2.0**
  (see the [`sieve`](https://github.com/SieveAI-dev/sieve) repository).

Contact: doskey.lee@gmail.com

---

## 简介（中文）

**Sieve** 官网仓库，通过 GitHub Pages 部署在
**[sieveai.dev](https://sieveai.dev)**。

Sieve 是一个全本地的 LLM 流量安全代理（单个 Rust 二进制），运行在 `127.0.0.1`，
位于你的 AI 编码 agent（Claude Code / Codex / Cursor）与上游模型 API
（Anthropic / OpenAI / 中转站）之间，双向检测流量：出站脱敏密钥、入站拦截危险
工具调用（fail-closed），在不可逆操作（签名、转账、部署）前制造一道认知摩擦。

视觉设计在 [Claude Design](https://claude.ai/design) 中产出，移植为零依赖静态 HTML。

本站为**自包含静态 HTML、零外部依赖**：无构建、无框架、**无 CDN**——字体
（JetBrains Mono / IBM Plex Sans / IBM Plex Mono）也**自托管**于 `assets/fonts/`
（隐私产品不该向 Google Fonts 发起请求）。支持浅色/深色/跟随系统主题与中英双语
切换，偏好存于 `localStorage`（`sieve.theme` / `sieve.lang`）。两种语言都写进
HTML，无 JS 也可用、可被索引。

**本地预览**：

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

**许可**：站点内容与文档采用
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)；Sieve
守护进程源码单独以 Apache-2.0 授权。

联系：doskey.lee@gmail.com
