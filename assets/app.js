/* ==========================================================================
   Sieve — shared client behavior (vanilla JS, zero dependencies, no external links)

   Responsibilities (see SHARED spec):
     1. Render segmented controls into  [data-controls]   (lang EN/中 + theme ☀/⊙/☾)
     2. Render the sequence diagram into [data-how-diagram] (faithful buildDiagram port,
        auto-step every 1150ms with replay + caption; respects prefers-reduced-motion)
     3. IntersectionObserver scroll reveal for .reveal
     4. Mobile hamburger menu

   State keys (match the design + the head anti-flash inline script):
     localStorage 'sieve.theme'  default 'system'   -> html[data-theme]
     localStorage 'sieve.lang'   default 'en'       -> html[data-lang]
   ========================================================================== */
(function () {
  "use strict";

  var html = document.documentElement;
  var LANGS = ["en", "zh"];
  var THEMES = ["light", "system", "dark"];

  /* ---- storage helpers ---------------------------------------------------- */
  function get(key, fallback) {
    try { return window.localStorage.getItem("sieve." + key) || fallback; }
    catch (e) { return fallback; }
  }
  function set(key, val) {
    try { window.localStorage.setItem("sieve." + key, val); } catch (e) { /* ignore */ }
  }

  /* ---- current state (seeded from the anti-flash script's attributes) ----- */
  var state = {
    lang: (function () { var v = html.getAttribute("data-lang"); return LANGS.indexOf(v) !== -1 ? v : get("lang", "en"); })(),
    theme: (function () { var v = html.getAttribute("data-theme"); return THEMES.indexOf(v) !== -1 ? v : get("theme", "system"); })()
  };

  function reducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  /* ---- diagram text dictionary (EN/ZH) -----------------------------------
     SHARED fact-fix #6: agent column reads "Claude Code · Codex · Cursor". */
  var SEQ = {
    en: {
      agent: "AI agent", agentSub: "Claude Code · Codex · Hermes · OpenClaw",
      sieveSub: "local · 127.0.0.1",
      api: "Upstream API", apiSub: "Anthropic · OpenAI · relay",
      m1: "request · prompt + context",
      outT: "OUTBOUND redact", outS: "secrets stripped in place",
      m2: "forward · sanitized",
      m3: "LLM response · may carry a tool call",
      inT: "INBOUND inspect", inS: "Critical tool call? + HIPS",
      m4: "safe → stream to agent",
      m4b: "Critical → blocked until you confirm",
      replay: "Replay"
    },
    zh: {
      agent: "AI agent", agentSub: "Claude Code · Codex · Hermes · OpenClaw",
      sieveSub: "本地 · 127.0.0.1",
      api: "上游 API", apiSub: "Anthropic · OpenAI · 中继",
      m1: "请求 · 提示词 + 上下文",
      outT: "出站脱敏", outS: "密钥就地剥离",
      m2: "转发 · 已净化",
      m3: "大模型响应 · 可能携带工具调用",
      inT: "入站检查", inS: "Critical 工具调用？+ HIPS",
      m4: "安全 → 流式返回 agent",
      m4b: "Critical → 阻断，待你确认",
      replay: "重播"
    }
  };

  /* ---- small DOM helpers -------------------------------------------------- */
  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) { for (var k in attrs) { if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]); } }
    return n;
  }
  function setVar(node, name, value) { node.style.setProperty(name, value); }

  /* ======================================================================
     1) Segmented controls  ->  [data-controls]
     ====================================================================== */
  function buildControls() {
    var hosts = document.querySelectorAll("[data-controls]");
    if (!hosts.length) return;

    var THEME_ICON = { light: "☀", system: "⊙", dark: "☾" };

    hosts.forEach(function (host) {
      host.innerHTML = "";
      var wrap = el("div", "controls");

      /* language segment */
      var langSeg = el("div", "seg");
      LANGS.forEach(function (lng) {
        var b = el("button", "seg__btn", { type: "button", "data-lang-set": lng });
        b.textContent = (lng === "en") ? "EN" : "中";
        if (state.lang === lng) b.classList.add("is-active");
        b.addEventListener("click", function () { setLang(lng); });
        langSeg.appendChild(b);
      });

      /* theme segment */
      var themeSeg = el("div", "seg");
      THEMES.forEach(function (th) {
        var b = el("button", "seg__btn seg__btn--icon", { type: "button", title: th, "aria-label": th, "data-theme-set": th });
        b.textContent = THEME_ICON[th];
        if (state.theme === th) b.classList.add("is-active");
        b.addEventListener("click", function () { setTheme(th); });
        themeSeg.appendChild(b);
      });

      wrap.appendChild(langSeg);
      wrap.appendChild(themeSeg);
      host.appendChild(wrap);
    });
  }

  function syncControlActive() {
    document.querySelectorAll("[data-lang-set]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-lang-set") === state.lang);
    });
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-theme-set") === state.theme);
    });
  }

  function setLang(lng) {
    if (LANGS.indexOf(lng) === -1) return;
    state.lang = lng; set("lang", lng);
    html.setAttribute("data-lang", lng);
    html.lang = (lng === "zh") ? "zh-CN" : "en";
    syncControlActive();
    renderDiagram();           /* diagram text follows the active language */
  }
  function setTheme(th) {
    if (THEMES.indexOf(th) === -1) return;
    state.theme = th; set("theme", th);
    html.setAttribute("data-theme", th);
    syncControlActive();
  }

  /* ======================================================================
     2) Sequence diagram  ->  [data-how-diagram]
     Faithful port of the design's buildDiagram:
       lifelines  : agent 15% / SIEVE 50% / upstream 85%
       7 steps    : 1 request -> 2 outbound redact box -> 3 forward
                    -> 4 LLM response -> 5 inbound inspect box
                    -> 6 safe stream / 7' Critical blocked
       1150ms auto-step 1..7 loop, replay button, caption bar follows the step.
     ====================================================================== */
  var A = 15, S = 50, P = 85;
  var GREEN = "var(--accent)", BLUE = "var(--seq-blue)", RED = "var(--seq-red)";
  var diagState = { step: 1, timer: null };

  function buildNode(x, title, sub, hot) {
    var n = el("div", "seq-node" + (hot ? " is-hot" : ""));
    n.style.left = x + "%";
    var t = el("div", "seq-node__t"); t.textContent = title;
    var s = el("div", "seq-node__s"); s.textContent = sub;
    n.appendChild(t); n.appendChild(s);
    return n;
  }

  function buildLifeline(x, hot) {
    var n = el("div", "seq-lifeline" + (hot ? " is-hot" : ""));
    n.style.left = x + "%";
    return n;
  }

  /* arrow returns [line, head, label] */
  function buildArrow(idx, top, a, b, color, dashStatic, label) {
    var active = diagState.step === idx;
    var dir = b > a ? "r" : "l";
    var minX = Math.min(a, b), w = Math.abs(b - a);
    var dashed = active || dashStatic;

    var line = el("div", "seq-arrow dir-" + dir + (dashed ? " is-dashed" : "") + (active ? " is-active" : ""));
    setVar(line, "--arrow-color", color);
    line.style.top = top + "px";
    line.style.left = minX + "%";
    line.style.width = w + "%";

    var head = el("div", "seq-head dir-" + dir + (active ? " is-active" : ""));
    setVar(head, "--arrow-color", color);
    head.style.top = (top + 1) + "px";
    head.style.left = b + "%";

    var lbl = el("div", "seq-label" + (active ? " is-active" : ""));
    setVar(lbl, "--arrow-color", color);
    lbl.style.top = (top - 24) + "px";
    lbl.style.left = minX + "%";
    lbl.style.width = w + "%";
    lbl.textContent = label;

    return [line, head, lbl];
  }

  function buildBox(idx, top, color, title, sub) {
    var active = diagState.step === idx;
    var n = el("div", "seq-box" + (active ? " is-active" : ""));
    setVar(n, "--box-color", color);
    n.style.top = top + "px";
    var t = el("div", "seq-box__t"); t.textContent = title;
    var s = el("div", "seq-box__s"); s.textContent = sub;
    n.appendChild(t); n.appendChild(s);
    return n;
  }

  function buildStage(s) {
    var stage = el("div", "diagram__stage");

    stage.appendChild(buildLifeline(A, false));
    stage.appendChild(buildLifeline(S, true));
    stage.appendChild(buildLifeline(P, false));

    stage.appendChild(buildNode(A, s.agent, s.agentSub, false));
    stage.appendChild(buildNode(S, "SIEVE", s.sieveSub, true));
    stage.appendChild(buildNode(P, s.api, s.apiSub, false));

    function appendArrow(parts) { parts.forEach(function (p) { stage.appendChild(p); }); }

    appendArrow(buildArrow(1, 150, A, S, GREEN, false, "1 · " + s.m1));
    stage.appendChild(buildBox(2, 186, GREEN, s.outT, s.outS));
    appendArrow(buildArrow(3, 278, S, P, GREEN, false, "2 · " + s.m2));
    appendArrow(buildArrow(4, 340, P, S, BLUE, false, "3 · " + s.m3));
    stage.appendChild(buildBox(5, 372, RED, s.inT, s.inS));
    appendArrow(buildArrow(6, 462, S, A, BLUE, false, "4 · " + s.m4));
    appendArrow(buildArrow(7, 512, S, A, RED, true, "4′ · " + s.m4b));

    return stage;
  }

  function buildBar(s) {
    var caps = ["", "1 · " + s.m1, s.outT + " · " + s.outS, "2 · " + s.m2,
      "3 · " + s.m3, s.inT + " · " + s.inS, "4 · " + s.m4, "4′ · " + s.m4b];
    var capColors = ["var(--text3)", GREEN, GREEN, GREEN, BLUE, RED, BLUE, RED];
    var color = capColors[diagState.step] || GREEN;

    var bar = el("div", "diagram__bar");

    var cap = el("div", "diagram__caption");
    var dot = el("span", "diagram__caption-dot"); dot.style.background = color;
    var txt = el("span", "diagram__caption-text"); txt.style.color = color;
    txt.textContent = caps[diagState.step] || "";
    cap.appendChild(dot); cap.appendChild(txt);

    bar.appendChild(cap);

    var replay = el("button", "diagram__replay", { type: "button" });
    replay.textContent = "↻ " + s.replay;
    replay.addEventListener("click", function () { replayDiagram(); });
    bar.appendChild(replay);

    return bar;
  }

  function renderDiagram() {
    var hosts = document.querySelectorAll("[data-how-diagram]");
    if (!hosts.length) return;
    var s = SEQ[state.lang] || SEQ.en;

    hosts.forEach(function (host) {
      host.innerHTML = "";
      host.appendChild(buildBar(s));
      host.appendChild(buildStage(s));
    });
  }

  function startDiagram() {
    var hosts = document.querySelectorAll("[data-how-diagram]");
    if (!hosts.length) return;

    if (reducedMotion()) {
      /* show a complete, readable static frame: hold the safe-return step */
      diagState.step = 6;
      renderDiagram();
      return;
    }
    diagState.step = 1;
    renderDiagram();
    if (diagState.timer) clearInterval(diagState.timer);
    diagState.timer = setInterval(function () {
      diagState.step = (diagState.step % 7) + 1;
      renderDiagram();
    }, 1150);
  }

  function replayDiagram() {
    diagState.step = 1;
    renderDiagram();
    if (reducedMotion()) return;
    if (diagState.timer) clearInterval(diagState.timer);
    diagState.timer = setInterval(function () {
      diagState.step = (diagState.step % 7) + 1;
      renderDiagram();
    }, 1150);
  }

  /* ======================================================================
     3) Scroll reveal
     ====================================================================== */
  function wireReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;

    if (reducedMotion() || !("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ======================================================================
     4) Mobile hamburger menu
     ====================================================================== */
  function wireMenu() {
    var header = document.querySelector(".site-header");
    var toggle = document.querySelector(".nav-toggle");
    if (!header || !toggle) return;

    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    var nav = header.querySelector(".site-nav");
    if (nav) {
      nav.addEventListener("click", function (e) {
        if (e.target.tagName === "A") {
          header.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  /* ======================================================================
     init
     ====================================================================== */
  function init() {
    /* make sure attributes reflect resolved state even if head script was skipped */
    html.setAttribute("data-lang", state.lang);
    html.setAttribute("data-theme", state.theme);
    html.lang = (state.lang === "zh") ? "zh-CN" : "en";

    buildControls();
    startDiagram();
    wireReveal();
    wireMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
