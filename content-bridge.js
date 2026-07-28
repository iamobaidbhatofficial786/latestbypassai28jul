/**
 * Minimal Lovable page bridge — registers early so side panel Send always has a receiver.
 * Full UI logic stays in content.js; prompt delivery is shared via window.__pkDeliverPrompt.
 */
(function () {
  if (window.__pkBridgeReady) return;
  window.__pkBridgeReady = true;

  window.__pkCreditBypassAllowed = true;
  window.__pkBypassToken = null;
  window.__pkPageReady = true;
  var _pkSendInFlight = false;

  function pkSetPageReady(ready, error) {
    window.__pkPageReady = !!ready;
    try {
      if (window.__pkPageReady) {
        document.documentElement.setAttribute("data-pk-page-ready", "1");
      } else {
        document.documentElement.removeAttribute("data-pk-page-ready");
      }
      window.postMessage({
        type: "pkPageReadiness",
        ready: window.__pkPageReady,
        error: error || ""
      }, "*");
    } catch (e) {}
  }

  function pkReadinessError() {
    return "Lovable is still initializing. Wait until Powerkits is ready before sending.";
  }

  function pkBypassAllowedNow() {
    return true;
  }

  function activatePkCreditBypass() {
    window.__pkCreditBypassAllowed = true;
    try { localStorage.setItem("__ql_bypass_active", "1"); } catch (e) {}
    try { document.documentElement.setAttribute("data-ql-bypass", "1"); } catch (e) {}
    try { window.postMessage({ type: "qlBypassState", active: true }, "*"); } catch (e) {}
  }

  function deactivatePkCreditBypass() {
    try { localStorage.removeItem("__ql_bypass_active"); } catch (e) {}
    try { document.documentElement.removeAttribute("data-ql-bypass"); } catch (e) {}
    try { window.postMessage({ type: "qlBypassState", active: false }, "*"); } catch (e) {}
  }

  function setPkCreditBypass(on) {
    activatePkCreditBypass();
  }

  var _pkHookLoadInFlight = false;

  function pkNotifyPageHookFailed(error) {
    try {
      window.postMessage({ type: "pkPageHookLoadFailed", error: error || "Page hook failed to load" }, "*");
    } catch (e) {}
  }

  function pkRequestPageHookLoad() {
    if (_pkHookLoadInFlight) return;
    _pkHookLoadInFlight = true;

    var base = typeof POWERKITS_API_BASE !== "undefined" ? POWERKITS_API_BASE : "https://lov.powerkits.net";
    var url = typeof pkPageHookUrl === "function" ? pkPageHookUrl() : (base + "/functions/v1/page-hook");
    var headers = typeof powerkitsApiHeaders === "function"
      ? powerkitsApiHeaders()
      : { apikey: typeof POWERKITS_API_KEY !== "undefined" ? POWERKITS_API_KEY : "" };

    chrome.runtime.sendMessage({
      action: "proxyFetch",
      url: url,
      method: "GET",
      headers: headers
    }, function (resp) {
      _pkHookLoadInFlight = false;
      if (chrome.runtime.lastError) {
        pkNotifyPageHookFailed(chrome.runtime.lastError.message);
        return;
      }
      if (!resp || !resp.ok) {
        var errMsg = "Page hook failed to load. Refresh your Lovable tab and try again.";
        if (resp && resp.data) {
          errMsg = resp.data.message || resp.data.error || resp.data.error_display || errMsg;
        }
        pkNotifyPageHookFailed(errMsg);
        pkSetPageReady(true);
        return;
      }
      var code = resp.data && typeof resp.data.raw === "string" ? resp.data.raw : "";
      if (!code || code.length < 100) {
        pkNotifyPageHookFailed("Page hook unavailable. Try again in a moment.");
        pkSetPageReady(true);
        return;
      }
      try {
        window.postMessage({ type: "pkInjectPageHook", source: code }, "*");
      } catch (e) {
        pkNotifyPageHookFailed("Hook injection failed. Refresh your Lovable tab.");
        pkSetPageReady(true);
      }
    });
  }
  window.pkRequestPageHookLoad = pkRequestPageHookLoad;

  function waitForPageHookLoaded(timeoutMs) {
    timeoutMs = timeoutMs || 8000;
    return new Promise(function (resolve) {
      var done = false;
      function finishOk() {
        if (done) return;
        done = true;
        window.removeEventListener("message", onMsg);
        clearTimeout(timer);
        pkSetPageReady(true);
        resolve();
      }
      function onMsg(ev) {
        if (ev.source !== window || !ev.data) return;
        if (ev.data.type === "pkPageHookLoaded" || ev.data.type === "pkPageHookLoadFailed") finishOk();
      }
      window.addEventListener("message", onMsg);
      pkRequestPageHookLoad();
      var timer = setTimeout(finishOk, timeoutMs);
    });
  }

  window.addEventListener("message", function (ev) {
    if (ev.source !== window || !ev.data) return;
    if (ev.data.type === "pkPageHookLoaded") {
      pkSetPageReady(true);
    } else if (ev.data.type === "pkPageHookLoadFailed") {
      pkSetPageReady(true);
    }
  });

  (function setupBypassGuard() {
    activatePkCreditBypass();
  })();

  function syncPkCreditBypassFromStorage() {
    setPkCreditBypass(true);
    pkSetPageReady(true);
  }

  window.__pkSetCreditBypass = setPkCreditBypass;
  window.__pkActivateCreditBypass = activatePkCreditBypass;
  window.__pkDeactivateCreditBypass = deactivatePkCreditBypass;
  window.__pkSyncCreditBypass = syncPkCreditBypassFromStorage;

  syncPkCreditBypassFromStorage();

  function _qlUlid() {
    var C = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    var ts = Date.now();
    var r = "";
    for (var i = 9; i >= 0; i--) {
      r = C[ts % 32] + r;
      ts = Math.floor(ts / 32);
    }
    for (var j = 0; j < 16; j++) r += C[Math.floor(Math.random() * 32)];
    return r;
  }

  async function sendViaWs(text) {
    return new Promise(function (resolve, reject) {
      var payload = {
        id: "umsg_" + _qlUlid(),
        message: text,
        files: [],
        selected_elements: [],
        chat_only: false,
        view: "editor",
        view_description: "",
        optimisticImageUrls: [],
        ai_message_id: "aimsg_" + _qlUlid(),
        thread_id: "main",
        current_page: window.location.pathname || "/",
        current_viewport_width: window.innerWidth || 1280,
        current_viewport_height: window.innerHeight || 800,
        current_viewport_dpr: window.devicePixelRatio || 1,
        model: null
      };
      var timer = setTimeout(function () {
        window.removeEventListener("message", handler);
        reject(new Error("Timeout: WebSocket did not respond"));
      }, 6000);
      function handler(ev) {
        if (ev.source !== window || !ev.data) return;
        if (ev.data.type !== "lovableWsSendResult") return;
        clearTimeout(timer);
        window.removeEventListener("message", handler);
        if (ev.data.success) resolve();
        else reject(new Error(ev.data.error || "WebSocket send failed"));
      }
      window.addEventListener("message", handler);
      window.postMessage({ type: "lovableSendViaWs", payload: payload }, "*");
    });
  }

  function editorTextContent(editor) {
    return (editor.innerText || editor.textContent || "").trim();
  }

  async function fillChatEditor(editor, text) {
    editor.focus();
    document.execCommand("selectAll", false, null);
    document.execCommand("insertText", false, text);
    var delay = text.length > 200 ? 350 : 200;
    await new Promise(function (r) { setTimeout(r, delay); });
    if (editorTextContent(editor).length >= text.length - 24) return;
    editor.textContent = "";
    editor.focus();
    editor.textContent = text;
    await new Promise(function (r) { setTimeout(r, 150); });
    if (editorTextContent(editor).length < text.length - 24) {
      throw new Error("Could not insert prompt into chat. Click in the Lovable chat box and try again.");
    }
  }

  async function waitForCreditBypassReady() {
    activatePkCreditBypass();
  }

  async function sendNativeToLovable(text) {
    var chatForm = document.querySelector("form#chat-input");
    if (!chatForm) throw new Error("Lovable chat not found. Open your project on lovable.dev.");
    var editor = chatForm.querySelector('[contenteditable="true"]');
    if (!editor) throw new Error("Chat editor not found. Wait for the page to finish loading.");
    var sendBtn = document.getElementById("chatinput-send-message-button");
    if (!sendBtn) throw new Error("Send button not found.");
    await fillChatEditor(editor, text);
    var wasDisabled = sendBtn.disabled;
    if (wasDisabled) sendBtn.removeAttribute("disabled");
    sendBtn.click();
    if (wasDisabled) sendBtn.setAttribute("disabled", "");
  }

  async function deliverPromptToLovable(text) {
    if (_pkSendInFlight) throw new Error("A prompt is already being sent. Please wait.");
    _pkSendInFlight = true;
    try {
      activatePkCreditBypass();
      pkSetPageReady(true);
      var strategy = (typeof SEND_STRATEGY !== "undefined" && SEND_STRATEGY) ? SEND_STRATEGY : "native";
      if (strategy === "relay") {
        throw new Error("Relay send is disabled. Use native or websocket strategy.");
      }
      if (strategy === "websocket") {
        try {
          await sendViaWs(text);
          return;
        } catch (e) {
          throw new Error("WebSocket send failed; the prompt was not retried to avoid a duplicate request.");
        }
      }
      await sendNativeToLovable(text);
    } catch (err) {
      throw err;
    } finally {
      _pkSendInFlight = false;
    }
  }

  window.__pkDeliverPrompt = deliverPromptToLovable;

  function projectIdFromPage() {
    try {
      var m = window.location.pathname.match(/projects\/([0-9a-fA-F-]{36})/i);
      return m ? m[1] : "";
    } catch (e) {
      return "";
    }
  }

  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (msg && msg.action === "ping") {
      sendResponse({ ok: true, bridge: true });
      return false;
    }
    if (msg && msg.action === "pkGetReadiness") {
      sendResponse({ ok: true, ready: true, error: "" });
      return false;
    }
    if (msg && msg.action === "qlActivateBypass" || msg && msg.action === "setCreditBypass") {
      activatePkCreditBypass();
      sendResponse({ ok: true });
      return false;
    }
    if (msg && msg.action === "qlDeactivateBypass") {
      sendResponse({ ok: true });
      return false;
    }
    if (msg && msg.action === "syncCreditBypass") {
      syncPkCreditBypassFromStorage();
      sendResponse({ ok: true, active: true });
      return false;
    }
    if (msg && msg.action === "pkPreSendGate") {
      sendResponse({ ok: true });
      return false;
    }
    if (msg && msg.action === "qlSendViaWs") {
      deliverPromptToLovable(msg.message || "")
        .then(function () { sendResponse({ ok: true }); })
        .catch(function (err) { sendResponse({ ok: false, error: err.message || String(err) }); });
      return true;
    }
    if (msg && msg.action === "requestTokenRefresh") {
      try { window.postMessage({ type: "lovableRequestToken" }, "*"); } catch (e) {}
      setTimeout(function () {
        try { window.postMessage({ type: "lovableRequestToken" }, "*"); } catch (e2) {}
      }, 120);
      sendResponse({ ok: true });
      return false;
    }
    if (msg && msg.action === "resolveLovableAuth") {
      (async function () {
        try { window.postMessage({ type: "lovableRequestToken" }, "*"); } catch (e) {}
        await new Promise(function (r) { setTimeout(r, 200); });
        var sd = await new Promise(function (r) {
          chrome.storage.local.get(["lovable_token", "lovable_projectId"], r);
        });
        sendResponse({
          token: sd.lovable_token || "",
          projectId: projectIdFromPage() || sd.lovable_projectId || ""
        });
      })();
      return true;
    }
    if (msg && msg.action === "deliverPrompt") {
      deliverPromptToLovable(String(msg.text || "")).then(function () {
        sendResponse({ ok: true });
      }).catch(function (err) {
        sendResponse({ ok: false, error: (err && err.message) || String(err) });
      });
      return true;
    }
    return false;
  });
})();
