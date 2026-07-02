#!/usr/bin/env python3
"""Build the site: bilingual pages from src/ plus the unified sitemap.

src/index.html + src/docs.html hold both languages as <span class="lang-en">
/ <span class="lang-zh"> pairs. This script emits, per page:

  - an English version at the repo root  (/, /docs.html)
  - a Simplified-Chinese version under zh/  (/zh/, /zh/docs.html)

Each output keeps only its own language's spans, gets language-correct
<html lang>, title/description/og:*/canonical, the hreflang cluster, and a
plain-link language switcher. sitemap.xml is regenerated as well (lastmod =
last git commit date of the source file, falling back to today).

Python stdlib only; run manually and commit the outputs (GitHub Pages serves
the repo as-is). Idempotent: re-running on a clean tree produces no diff.

Standalone English doc pages under docs/ (quickstart / threat-model / cli)
are hand-maintained static files; this script only folds them into sitemap.xml.

Usage: python3 scripts/build_site.py
"""
from __future__ import annotations

import datetime
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://sieveai.dev"

PAGES = [
    {
        "src": "src/index.html",
        "out": {"en": "index.html", "zh": "zh/index.html"},
        "url": {"en": f"{BASE}/", "zh": f"{BASE}/zh/"},
        "switch_href": {"en": "/zh/", "zh": "/"},
        "title": {
            "en": "Sieve — Local Security Proxy for AI Coding Agents (Claude Code, Codex)",
            "zh": "Sieve — Claude Code 本地安全代理：私钥防泄漏、危险工具调用拦截",
        },
        "description": {
            "en": (
                "A local-first security gateway for Claude Code and OpenAI-compatible "
                "coding agents. One Rust binary on 127.0.0.1: private keys and seed "
                "phrases redacted outbound, dangerous tool calls blocked inbound. "
                "Fail-closed, zero cloud, open engine."
            ),
            "zh": (
                "面向 Claude Code 与 OpenAI 兼容编码 Agent 的本地安全网关："
                "127.0.0.1 上的 Rust 单二进制，出站脱敏私钥、助记词与 API 密钥，"
                "入站拦截危险工具调用。fail-closed，零云端，规则引擎开源可验证。"
            ),
        },
    },
    {
        "src": "src/docs.html",
        "out": {"en": "docs.html", "zh": "zh/docs.html"},
        "url": {"en": f"{BASE}/docs.html", "zh": f"{BASE}/zh/docs.html"},
        "switch_href": {"en": "/zh/docs.html", "zh": "/docs.html"},
        "title": {
            "en": "Sieve Docs — Install, Verify Signed Builds, Rules &amp; CLI Reference",
            "zh": "Sieve 文档 — 安装、验证签名构建、规则与 CLI 参考",
        },
        "description": {
            "en": (
                "Sieve documentation hub: install &amp; verify signed builds, the local "
                "detection engine (outbound redaction + inbound interception, "
                "fail-closed), the rule engine, the CLI reference, and how to verify "
                "every claim yourself."
            ),
            "zh": (
                "Sieve 文档中心：安装与验证签名构建、本地检测引擎"
                "（出站脱敏 + 入站拦截，fail-closed）、规则引擎、CLI 参考，"
                "以及如何亲手验证每一条声明。"
            ),
        },
    },
]

# standalone (single-language) pages folded into the sitemap; lastmod = git date
DOC_PAGES = [
    ("docs/quickstart.html", f"{BASE}/docs/quickstart.html"),
    ("docs/threat-model.html", f"{BASE}/docs/threat-model.html"),
    ("docs/cli.html", f"{BASE}/docs/cli.html"),
]

HTML_ATTRS = {"en": ("en", "en"), "zh": ("zh-Hans", "zh")}  # (<html lang>, data-lang)
OG_LOCALE = {"en": "en_US", "zh": "zh_CN"}
SWITCH_ANCHOR = {
    # label + attrs of the plain-link language switcher on each output
    "en": '<a class="lang-switch" href="{href}" lang="zh-Hans">中文</a>',
    "zh": '<a class="lang-switch" href="{href}" lang="en">EN</a>',
}


def strip_lang_spans(html: str, cls: str) -> str:
    """Remove every <span class="{cls}">…</span> subtree, byte-exact elsewhere."""
    open_tag = f'<span class="{cls}">'
    out: list[str] = []
    i = 0
    while True:
        j = html.find(open_tag, i)
        if j == -1:
            out.append(html[i:])
            return "".join(out)
        out.append(html[i:j])
        k = j + len(open_tag)
        depth = 1
        while depth:
            next_open = html.find("<span", k)
            next_close = html.find("</span>", k)
            if next_close == -1:
                raise ValueError(f"unbalanced <span> after byte {j}")
            if next_open != -1 and next_open < next_close:
                depth += 1
                k = next_open + len("<span")
            else:
                depth -= 1
                k = next_close + len("</span>")
        i = k


def sub_once(pattern: str, repl: str, html: str, label: str) -> str:
    new, n = re.subn(pattern, repl, html, count=1, flags=re.S)
    if n != 1:
        raise ValueError(f"pattern not found: {label}")
    return new


def build_page(page: dict, lang: str, src_html: str) -> str:
    other = "zh" if lang == "en" else "en"
    html = strip_lang_spans(src_html, f"lang-{other}")

    html_lang, data_lang = HTML_ATTRS[lang]
    html = sub_once(
        r'<html lang="[^"]*" data-theme="system" data-lang="[^"]*"',
        f'<html lang="{html_lang}" data-theme="system" data-lang="{data_lang}"',
        html, "html attrs",
    )

    title = page["title"][lang]
    desc = page["description"][lang]
    url = page["url"][lang]

    html = sub_once(r"<title>.*?</title>", f"<title>{title}</title>", html, "title")
    html = sub_once(
        r'(<meta name="description" content=")[^"]*(")',
        rf"\g<1>{desc}\g<2>", html, "description",
    )
    html = sub_once(
        r'(<link rel="canonical" href=")[^"]*(")',
        rf"\g<1>{url}\g<2>", html, "canonical",
    )
    html = sub_once(
        r'(<meta property="og:url" content=")[^"]*(")',
        rf"\g<1>{url}\g<2>", html, "og:url",
    )
    html = sub_once(
        r'(<meta property="og:title" content=")[^"]*(")',
        rf"\g<1>{title}\g<2>", html, "og:title",
    )
    html = sub_once(
        r'(<meta property="og:description" content=")[^"]*(")',
        rf"\g<1>{desc}\g<2>", html, "og:description",
    )

    # og:locale right after og:site_name (match either /> or > line ending)
    html = sub_once(
        r'(<meta property="og:site_name" content="Sieve" ?/?>)',
        rf'\g<1>\n  <meta property="og:locale" content="{OG_LOCALE[lang]}">',
        html, "og:site_name",
    )

    # hreflang cluster right after the canonical line (self-ref + alternate + x-default)
    en_url, zh_url = page["url"]["en"], page["url"]["zh"]
    cluster = (
        f'\n  <link rel="alternate" hreflang="en" href="{en_url}">'
        f'\n  <link rel="alternate" hreflang="zh-Hans" href="{zh_url}">'
        f'\n  <link rel="alternate" hreflang="x-default" href="{en_url}">'
    )
    html = sub_once(
        r'(<link rel="canonical" href="[^"]*" ?/?>)',
        rf"\g<1>{cluster}", html, "canonical (cluster insert)",
    )

    # zh outputs live under /zh/ — remap root-relative page links (assets untouched)
    if lang == "zh":
        html = html.replace('href="/docs.html"', 'href="/zh/docs.html"')
        html = html.replace('href="/#', 'href="/zh/#')
        html = html.replace('href="/"', 'href="/zh/"')

    # language switcher link (after the remap, so its href stays authoritative)
    anchor = SWITCH_ANCHOR[lang].format(href=page["switch_href"][lang])
    html = sub_once(r'<a class="lang-switch"[^>]*>[^<]*</a>', anchor, html, "lang-switch")

    return html


def last_commit_date(path: str) -> str:
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", path],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip()
        if out:
            return out
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    return datetime.date.today().isoformat()


def build_sitemap() -> str:
    entries = []
    for page in PAGES:
        lastmod = last_commit_date(page["src"])
        for lang in ("en", "zh"):
            entries.append(f"  <url><loc>{page['url'][lang]}</loc><lastmod>{lastmod}</lastmod></url>")
    for path, url in DOC_PAGES:
        if (ROOT / path).exists():
            entries.append(f"  <url><loc>{url}</loc><lastmod>{last_commit_date(path)}</lastmod></url>")
    body = "\n".join(entries)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{body}\n"
        "</urlset>\n"
    )


def main() -> None:
    (ROOT / "zh").mkdir(exist_ok=True)
    for page in PAGES:
        src_html = (ROOT / page["src"]).read_text(encoding="utf-8")
        for lang in ("en", "zh"):
            out_path = ROOT / page["out"][lang]
            out_path.write_text(build_page(page, lang, src_html), encoding="utf-8")
            print(f"wrote {page['out'][lang]}")
    (ROOT / "sitemap.xml").write_text(build_sitemap(), encoding="utf-8")
    print("wrote sitemap.xml")


if __name__ == "__main__":
    main()
