// mentiq.js - simple prototype script (drop-in)
(function (w, d) {
  if (w.__mentiq) return; // prevent double load

  const API_URL =
    (w.__MENTIQ_CONFIG && w.__MENTIQ_CONFIG.collectUrl) ||
    "http://localhost:4000/collect";
  const API_KEY = (w.__MENTIQ_CONFIG && w.__MENTIQ_CONFIG.apiKey) || "dev_key";

  // small runtime state
  let queue = [];
  const MAX_BATCH = 10;
  const FLUSH_MS = 3000;
  let flushTimer = null;
  const sessionKey = "__mentiq_session";
  let sessionId = (function () {
    try {
      let s = sessionStorage.getItem(sessionKey);
      if (!s) {
        s = "s_" + Math.random().toString(36).slice(2, 9);
        sessionStorage.setItem(sessionKey, s);
      }
      return s;
    } catch (e) {
      return "s_" + Math.random().toString(36).slice(2, 9);
    }
  })();

  function nowISO() {
    return new Date().toISOString();
  }

  function pushEvent(eventName, props) {
    const ev = {
      event: eventName,
      distinct_id: window.__MENTIQ_USER_ID || undefined,
      session_id: sessionId,
      timestamp: nowISO(),
      url: location.pathname + location.search,
      properties: props || {},
    };
    queue.push(ev);
    // Debug visible in console
    console.log("[mentiq] queued", ev);
    if (queue.length >= MAX_BATCH) flush();
    ensureFlushTimer();
  }

  function ensureFlushTimer() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, FLUSH_MS);
  }

  function flush() {
    if (queue.length === 0) return;
    const batch = queue.splice(0, MAX_BATCH);
    const body = JSON.stringify({ apiKey: API_KEY, events: batch });

    try {
      // Prefer sendBeacon on unload/visibility hidden; works well
      if (navigator.sendBeacon && document.visibilityState === "hidden") {
        navigator.sendBeacon(API_URL, body);
        console.log("[mentiq] sendBeacon flushed", batch.length);
        return;
      }
    } catch (e) {
      /* ignore */
    }

    // Normal fetch path
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      keepalive: true,
    })
      .then((res) => {
        console.log("[mentiq] flushed", batch.length, "status", res.status);
      })
      .catch((err) => {
        console.warn("[mentiq] flush failed, requeueing", err);
        // put back at front to retry later
        queue = batch.concat(queue);
      });
  }

  // auto page view
  function sendPageView() {
    pushEvent("page_view", {
      title: document.title,
      referrer: document.referrer,
    });
  }

  // click capture: only for elements with data-mentiq-track attribute
  function clickListener(e) {
    const el = e.target.closest && e.target.closest("[data-mentiq-track]");
    if (!el) return;
    const name = el.getAttribute("data-mentiq-track") || "click";
    const props = {
      text: (el.innerText || "").trim().slice(0, 200),
      href: el.href || undefined,
      selector: simpleSelector(el),
    };
    pushEvent(name, props);
  }

  function simpleSelector(el) {
    if (!el) return "";
    if (el.id) return "#" + el.id;
    if (el.className && typeof el.className === "string")
      return el.tagName.toLowerCase() + "." + el.className.split(" ").join(".");
    return el.tagName.toLowerCase();
  }

  // public API exposed to page
  const api = {
    init(config) {
      // optional override via script; support reconfiguration
      if (config && config.apiKey)
        window.__MENTIQ_CONFIG = window.__MENTIQ_CONFIG || {};
      if (config && config.apiKey)
        window.__MENTIQ_CONFIG.apiKey = config.apiKey;
      if (config && config.collectUrl)
        window.__MENTIQ_CONFIG.collectUrl = config.collectUrl;
      console.log("[mentiq] init", window.__MENTIQ_CONFIG);
    },
    track(eventName, properties) {
      pushEvent(eventName, properties);
    },
    identify(id) {
      window.__MENTIQ_USER_ID = id;
      console.log("[mentiq] identify", id);
    },
    flush,
    _internal: { queue }, // for debugging in console if needed
  };

  // attach global shim so pages can call before script loads
  w.__mentiq = w.__mentiq || api;

  // attach listeners
  document.addEventListener("click", clickListener, true);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("beforeunload", function () {
    flush();
  });

  // initial page_view after a tiny delay (allow identify calls before pageview)
  setTimeout(sendPageView, 250);

  // expose for debugging
  console.log("[mentiq] loaded (prototype)");
})(window, document);
