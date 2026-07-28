/**
 * Lovable Powerkits — pageHook loader (MAIN world, document_start).
 * Full hook is fetched from lov.powerkits.net after a valid bypass token is issued.
 */
(function () {
  if (window.__pkHookLoaderReady) return;
  window.__pkHookLoaderReady = true;
  window.__pkHookLoaded = false;

  function postHookEvent(type, extra) {
    try {
      window.postMessage(Object.assign({ type: type }, extra || {}), "*");
    } catch (e) {}
  }

  function injectHookSource(source) {
    if (window.__pkHookLoaded) {
      postHookEvent("pkPageHookLoaded");
      return;
    }
    if (!source) return;
    try {
      var script = document.createElement("script");
      script.textContent = source;
      (document.documentElement || document.head || document.body).appendChild(script);
      window.__pkHookLoaded = true;
      postHookEvent("pkPageHookLoaded");
    } catch (e) {
      postHookEvent("pkPageHookLoadFailed", { error: "Hook injection failed" });
    }
  }

  function fetchAndInject(url, token, apikey) {
    if (window.__pkHookLoaded) {
      postHookEvent("pkPageHookLoaded");
      return;
    }
    if (window.__pkHookLoading) return;
    window.__pkHookLoading = true;
    var headers = {
      Authorization: "Bearer " + token,
      "X-Bypass-Token": token,
      apikey: apikey || ""
    };
    fetch(url, { method: "GET", credentials: "omit", headers: headers })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (code) {
        window.__pkHookLoading = false;
        if (code && code.length > 100) {
          injectHookSource(code);
          return;
        }
        postHookEvent("pkPageHookLoadFailed", { error: "Page hook unavailable" });
      })
      .catch(function (err) {
        window.__pkHookLoading = false;
        postHookEvent("pkPageHookLoadFailed", {
          error: (err && err.message) ? err.message : "Page hook fetch failed"
        });
      });
  }

  window.addEventListener("message", function (ev) {
    var data = ev && ev.data;
    if (!data) return;
    if (data.type === "pkInjectPageHook" && data.source) {
      injectHookSource(String(data.source));
      return;
    }
    if (data.type !== "pkLoadPageHook") return;
    if (!data.url || !data.token) return;
    fetchAndInject(String(data.url), String(data.token), data.apikey ? String(data.apikey) : "");
  });
})();
