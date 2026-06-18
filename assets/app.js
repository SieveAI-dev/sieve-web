/* =========================================================================
   Sieve — shared client behavior (vanilla JS, zero dependencies)
   - Language toggle EN / 中文 (localStorage: 'sieve-lang', default 'en')
   - Applies on load (no flash via inline pre-paint in <head>, see note)
   - Marks the current page's nav link as active
   - Mobile nav burger toggle
   ========================================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "sieve-lang";
  var DEFAULT_LANG = "en";
  var SUPPORTED = ["en", "zh"];

  function getStoredLang() {
    try {
      var v = window.localStorage.getItem(STORAGE_KEY);
      if (v && SUPPORTED.indexOf(v) !== -1) return v;
    } catch (e) { /* localStorage blocked: fall through */ }
    return DEFAULT_LANG;
  }

  function storeLang(lang) {
    try { window.localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
  }

  function applyLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    var html = document.documentElement;
    html.setAttribute("data-lang", lang);
    html.lang = (lang === "zh") ? "zh-CN" : "en";

    // sync every language toggle button on the page
    var buttons = document.querySelectorAll(".lang-toggle button[data-lang]");
    for (var i = 0; i < buttons.length; i++) {
      var pressed = buttons[i].getAttribute("data-lang") === lang;
      buttons[i].setAttribute("aria-pressed", pressed ? "true" : "false");
    }
  }

  function setLang(lang) {
    applyLang(lang);
    storeLang(lang);
  }

  // ---- mark active nav link ----
  function markActiveNav() {
    var path = window.location.pathname;
    // normalize: "/", "/index.html", "/sieve-web/index.html" -> last segment
    var current = path.substring(path.lastIndexOf("/") + 1);
    if (current === "" ) current = "index.html";

    var links = document.querySelectorAll(".nav__links a[href]");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      // ignore external links
      if (links[i].classList.contains("external") || /^https?:/i.test(href)) continue;
      var target = href.replace(/^\.\//, "");
      if (target === "") target = "index.html";
      if (target === current) {
        links[i].classList.add("active");
        links[i].setAttribute("aria-current", "page");
      }
    }
  }

  // ---- mobile nav ----
  function wireBurger() {
    var burger = document.querySelector(".nav__burger");
    var links = document.querySelector(".nav__links");
    if (!burger || !links) return;
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // close on link click (mobile)
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ---- wire language toggle buttons ----
  function wireLangToggle() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".lang-toggle button[data-lang]") : null;
      if (!btn) return;
      setLang(btn.getAttribute("data-lang"));
    });
  }

  function init() {
    applyLang(getStoredLang());
    markActiveNav();
    wireBurger();
    wireLangToggle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
