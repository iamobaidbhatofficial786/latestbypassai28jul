// ============================================
// Lovable Powerkits – Business Logic (content)
// HTML templates are in content-templates.js
// ============================================

console.log("[ContentScript] Lovable Powerkits loaded");

const API_BASE = typeof POWERKITS_API_BASE !== "undefined" ? POWERKITS_API_BASE : GRINGOW_API_BASE;
const API_KEY = typeof POWERKITS_API_KEY !== "undefined" ? POWERKITS_API_KEY : GRINGOW_API_KEY;
const PROXY_COMMAND_URL = (typeof window !== "undefined" && window.PROXY_COMMAND_URL)
  || (API_BASE + "/functions/v1/proxy-command");

const DISCORD_URL = (typeof DISCORD_SUPPORT_URL !== "undefined" && DISCORD_SUPPORT_URL)
  || "https://discord.gg/9ZBezyTEu5";
const OPTIMIZE_URL = API_BASE + "/functions/v1/optimize-prompt";
const NOTIFICATIONS_URL = API_BASE + "/rest/v1/notifications?select=*&order=created_at.desc&limit=20";
const PACKAGES_URL = API_BASE + "/rest/v1/packages?select=*&is_active=eq.true&order=sort_order.asc";
const EXT_PAYMENT_URL = API_BASE + "/functions/v1/process-extension-payment";
const CREATE_PROJECT_URL = API_BASE + "/functions/v1/create-lovable-project";
const PUBLISH_PROJECT_URL = API_BASE + "/functions/v1/publish-project";
const ENABLE_CLOUD_URL = API_BASE + "/functions/v1/enable-cloud";
const VERSIONS_URL_POPUP = API_BASE + "/rest/v1/extension_versions?select=version,changelog,file_path,is_alert_active&order=created_at.desc&limit=1&is_alert_active=eq.true";
const USER_ROLES_URL_POPUP = API_BASE + "/rest/v1/user_roles?select=role";

function apiHeaders(extra) {
  return typeof powerkitsApiHeaders === "function" ? powerkitsApiHeaders(extra) : gringowApiHeaders(extra);
}

function setPkCreditBypass(on) {
  if (typeof window.__pkSetCreditBypass === "function") {
    window.__pkSetCreditBypass(!!on);
    return;
  }
  try {
    if (on) {
      localStorage.setItem("__ql_bypass_active", "1");
      document.documentElement.setAttribute("data-ql-bypass", "1");
      window.postMessage({ type: "qlBypassState", active: true }, "*");
    } else {
      localStorage.removeItem("__ql_bypass_active");
      document.documentElement.removeAttribute("data-ql-bypass");
      window.postMessage({ type: "qlBypassState", active: false }, "*");
    }
  } catch (e) {}
}

function activateBypass() { setPkCreditBypass(true); }
function deactivateBypass() { setPkCreditBypass(false); }

function syncPkCreditBypassFromStorage() {
  setPkCreditBypass(true);
}
        qlSessionId = res.ql_session_id;
        qlUserName = normalizeLicenseUserName(res.ql_user_name);
        qlExpiresAt = res.ql_expires_at || null;
        return resolve();
      }
      var sid = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
      qlSessionId = sid;
      qlUserName = normalizeLicenseUserName(qlUserName);
      qlExpiresAt = null;
      chrome.storage.local.set(
        typeof powerkitsInternalSessionStorage === "function"
          ? powerkitsInternalSessionStorage(sid, qlUserName)
          : gringowInternalSessionStorage(sid, qlUserName),
        function() { resolve(); }
      );
    });
  });
}

function getBrowserSessionId() {
  return new Promise(function(resolve) {
    try {
      var fromPage = typeof pkPageStorageGet === "function" ? pkPageStorageGet("browser_session_id") : localStorage.getItem("gringow_browser_session_id");
      if (fromPage) return resolve(fromPage);
    } catch (e) {}
    chrome.storage.local.get(["lovable_browserSessionId"], function(res) {
      resolve(res.lovable_browserSessionId || null);
    });
  });
}

async function buildProxyCommandPayload(projectId, token, mensagem, modoPensar) {
  var normalizedToken = String(token || "").replace(/^Bearer\s+/i, "").trim();
  var payload = {
    projeto_id: projectId,
    token_lovable: normalizedToken,
    mensagem: mensagem,
    modo_pensar: !!modoPensar
  };
  payload.session_headers = await buildSessionHeaders(projectId);
  var bsess = await getBrowserSessionId();
  if (bsess) payload.browser_session_id = bsess;
  var nativeBody = getNativeChatCaptureBody();
  if (nativeBody) payload.native_chat_body = nativeBody;
  return payload;
}

function getNativeChatCaptureBody() {
  try {
    var raw = typeof pkPageStorageGet === "function" ? pkPageStorageGet("last_native_chat_capture") : localStorage.getItem("gringow_last_native_chat_capture");
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (parsed && typeof parsed.body === "string" && parsed.body.length > 0) {
      return parsed.body;
    }
  } catch (e) {}
  return null;
}

// Build per-device session headers (UA + sec-ch-ua + cookies de lovable.dev)
function buildSessionHeaders(projectId) {
  return new Promise(function(resolve) {
    var ua = navigator.userAgent || "";
    var hints = (navigator.userAgentData && navigator.userAgentData.brands) ? navigator.userAgentData.brands : [];
    var brandsStr = "";
    for (var i = 0; i < hints.length; i++) {
      if (i > 0) brandsStr += ", ";
      brandsStr += '"' + hints[i].brand + '";v="' + hints[i].version + '"';
    }
    var platform = (navigator.userAgentData && navigator.userAgentData.platform) ? navigator.userAgentData.platform : "Windows";
    var mobile = (navigator.userAgentData && navigator.userAgentData.mobile) ? "?1" : "?0";
    var langs = navigator.languages && navigator.languages.length ? navigator.languages.slice(0, 3).join(",") : (navigator.language || "en-US");
    var headers = {
      "user-agent": ua,
      "sec-ch-ua": brandsStr,
      "sec-ch-ua-mobile": mobile,
      "sec-ch-ua-platform": '"' + platform + '"',
      "accept-language": langs,
      "accept-encoding": "gzip, deflate, br, zstd",
      "origin": "https://lovable.dev",
      "referer": "https://lovable.dev/projects/" + (projectId || ""),
      "priority": "u=1, i",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site"
    };
    try {
      chrome.runtime.sendMessage({ action: "getLovableCookies" }, function(resp) {
        if (resp && resp.cookie) headers["cookie"] = resp.cookie;
        resolve(headers);
      });
    } catch (e) {
      resolve(headers);
    }
  });
}


function jwtExpMs(token) {
  var p = decodeJwtPayload(token);
  return (p && p.exp) ? p.exp * 1000 : null;
}

function isTokenFresh(token, skewMs) {
  var t = String(token || '').replace(/^Bearer\s+/i, '').trim();
  if (!t) return false;
  var exp = jwtExpMs(t);
  if (!exp) return true;
  return exp > Date.now() + (skewMs || 60000);
}

function pickBestToken(candidates) {
  var best = '';
  var bestExp = 0;
  (candidates || []).forEach(function(item) {
    var t = String(item || '').replace(/^Bearer\s+/i, '').trim();
    if (!t) return;
    var exp = jwtExpMs(t) || 0;
    if (!best || exp > bestExp) {
      best = t;
      bestExp = exp;
    }
  });
  return best;
}

function projectIdFromPage() {
  var m = location.pathname.match(/\/projects\/([0-9a-fA-F-]{36})/);
  return m ? m[1] : '';
}

function readAuthTokensFromCookies() {
  return new Promise(function(resolve) {
    chrome.runtime.sendMessage({ action: 'readCookies' }, function(resp) {
      if (!resp || !resp.tokens || !resp.tokens.length) return resolve('');
      resolve(pickBestToken(resp.tokens.map(function(x) { return x.token; })));
    });
  });
}

async function captureLovableSessionFromPage() {
  try { window.postMessage({ type: "lovableRequestToken" }, "*"); } catch (e) {}
  await new Promise(function(r) { setTimeout(r, 400); });
  try { window.postMessage({ type: "lovableRequestToken" }, "*"); } catch (e2) {}

  var projectId = projectIdFromPage();
  if (!projectId) {
    return { ok: false, error: "Open your Lovable project page (URL must include /projects/…)." };
  }

  var sd = await new Promise(function(r) { chrome.storage.local.get(["lovable_token", "lovable_projectId"], r); });
  var firebaseToken = typeof scanFirebaseAccessToken === "function" ? scanFirebaseAccessToken() : "";
  var cookieToken = await readAuthTokensFromCookies();
  var token = typeof pickLovableApiToken === "function"
    ? pickLovableApiToken(firebaseToken, sd.lovable_token, cookieToken)
    : pickBestToken([firebaseToken, sd.lovable_token, cookieToken]);

  if (!token || token.indexOf("eyJ") !== 0) {
    return { ok: false, error: "Lovable login token not found. Refresh lovable.dev, send one message in chat, then try again." };
  }

  await new Promise(function(r) {
    chrome.storage.local.set({ lovable_token: token, lovable_projectId: projectId }, r);
  });

  return { ok: true, token: token, projectId: projectId, firebase: !!firebaseToken };
}

async function resolveLovableAuth() {
  await new Promise(function(resolve) {
    chrome.runtime.sendMessage({
      action: "syncLovableAuth",
      tabUrl: location.href,
      projectId: projectIdFromPage()
    }, function() { resolve(); });
  });
  await requestLatestTokenFromHook(3000);
  var session = await captureLovableSessionFromPage();
  if (session.ok) {
    return { token: session.token, projectId: session.projectId };
  }
  var sd = await new Promise(function(r) { chrome.storage.local.get(['lovable_token', 'lovable_projectId'], r); });
  return { token: sd.lovable_token || '', projectId: projectIdFromPage() || sd.lovable_projectId || '' };
}

async function buildLovableFeaturePayload(extra) {
  var session = await captureLovableSessionFromPage();
  if (!session.ok) {
    throw new Error(session.error || "Lovable session not ready.");
  }
  var projectId = session.projectId;
  var token = session.token;
  var sessionHeaders = await buildSessionHeaders(projectId);
  var payload = Object.assign({
    token: token,
    token_lovable: token,
    project_id: projectId,
    projectId: projectId
  }, extra || {});
  payload.session_headers = sessionHeaders;
  if (storageData.lovable_browserSessionId) {
    payload.browser_session_id = storageData.lovable_browserSessionId;
  }
  return payload;
}

function formatApiError(value) {
  if (value == null) return 'Send failed.';
  var s = pkSanitizeServerError(String(value));
  if (s.charAt(0) === '{') {
    try {
      var parsed = JSON.parse(s);
      if (parsed && (parsed.message || parsed.error_display)) {
        s = String(parsed.message || parsed.error_display);
      }
    } catch (e) {}
  }
  if (/invalid token/i.test(s) || /unauthorized/i.test(s)) {
    return 'Lovable session expired. Refresh lovable.dev, wait for Synced, then send again.';
  }
  return qlUserText(s);
}

function qlUserText(value) {
  return typeof translateUserMessage === 'function' ? translateUserMessage(value) : value;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function sanitizeUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url;
    return '';
  } catch(e) { return ''; }
}

function decodeJwtPayload(token) {
  try {
    const raw = String(token || '').replace(/^Bearer\s+/i, '').trim();
    const parts = raw.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch(e) {
    return null;
  }
}

function bgFetch(url, options = {}) {
  const requireSuccess = options.requireSuccess === true;
  const vendorFeatureCompat = options.vendorFeatureCompat === true || options.featureUiCompat === true;
  return new Promise((resolve, reject) => {
    if (typeof POWERKITS_DEBUG !== "undefined" && POWERKITS_DEBUG) console.log("[QL] bgFetch ->", url);
    chrome.runtime.sendMessage({
      action: "proxyFetch",
      url,
      method: options.method || "POST",
      headers: options.headers || {},
      body: options.body || null,
    }, (resp) => {
      if (chrome.runtime.lastError) {
        console.error("[bgFetch] runtime error:", chrome.runtime.lastError.message);
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (!resp) {
        return reject(new Error("No response from background (reload the lovable.dev tab and extension)"));
      }

      const data = resp.data;
      if (typeof POWERKITS_DEBUG !== "undefined" && POWERKITS_DEBUG) console.log("[QL] bgFetch <-", url, "status", resp.status, data);

      if (vendorFeatureCompat && typeof pkResolveFeatureBgFetch === "function") {
        var vf = pkResolveFeatureBgFetch(resp);
        if (!vf.ok) return reject(new Error(vf.error));
        return resolve(vf.data);
      }

      if (!resp.ok) {
        const errText = (data && (data.error_display || data.message || data.error))
          || (data && data.raw)
          || ("Request failed (HTTP " + resp.status + ")");
        return reject(new Error(formatApiError(errText)));
      }

      if (requireSuccess && (!data || data.success !== true)) {
        const errText = (data && (data.error_display || data.message || data.error))
          || "Server did not confirm the send (success !== true)";
        return reject(new Error(formatApiError(errText)));
      }

      resolve(data);
    });
  });
}

let qlSessionId = null;
let qlHeartbeatInterval = null;
let qlUserName = null;
let qlExpiresAt = null;
let qlActivatedAt = null;
let qlLicenseStatus = null;
let qlValidityMinutes = null;
let qlExpiryConfirming = false;
let qlOnlineCount = 0;
let qlMinimized = false;
let qlHeight = 520;
let qlSpeechRecognition = null;
let qlIsRecording = false;
let qlDeviceId = null;
let qlShieldActive = false;
let qlActiveTab = 'prompt';
let qlChatHistory = [];
const QL_HISTORY_KEY = 'ql_chat_history';
const QL_MAX_HISTORY = 200;

function getDeviceId(){
  return getHardwareFingerprint();
}

function _qlOpenSidePanel() {
  chrome.runtime.sendMessage({ action: "openSidePanel" });
  var toast = document.createElement("div");
  toast.textContent = "Click the extension icon in the top-right corner to open the side panel.";
  toast.style.cssText = "position:fixed;top:16px;right:16px;z-index:2147483647;background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;font-size:14px;font-family:sans-serif;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.4);";
  document.body.appendChild(toast);
  setTimeout(function () {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 4000);
}

function createUI(){
  if (typeof SIDE_PANEL_ONLY !== "undefined" && SIDE_PANEL_ONLY) {
    var existing = document.getElementById("ql-floating");
    if (existing) existing.remove();
    return;
  }
  if(document.getElementById("ql-floating")) return;
  chrome.storage.local.get(["ql_sidebar_mode", "ql_native_chat"], (res) => {
    if(res.ql_sidebar_mode === true) {
      console.log("[ContentScript] Sidebar mode active, skipping floating UI");
      return;
    }
    if(res.ql_native_chat === true) {
      console.log("[ContentScript] Native chat mode active, skipping floating UI");
      return;
    }
    _buildFloatingUI();
  });
}

function _buildFloatingUI(){
  if(document.getElementById("ql-floating")) return;

  const box = document.createElement("div");
  box.id = "ql-floating";
  const initialLeft = Math.max(10, window.innerWidth - 400);
  box.style.left = initialLeft + "px";
  box.style.top = "80px";

  chrome.storage.local.get(["ql_minimized","ql_height","ql_dark_mode"], async (res) => {
    qlMinimized = res.ql_minimized || false;
    qlHeight = res.ql_height || 520;

    if(res.ql_dark_mode === false) {
      box.classList.add("ql-light");
    }
    if(qlMinimized) {
      box.classList.add("ql-minimized");
    }

    document.body.appendChild(box);
    showMainUI(box);
    setPkCreditBypass(true);

    setupDrag();
    setupResize();
  });
}

function showMainUI(box){
  const greeting = "Powerkits";
  const statusBadge = '<span class="ql-status-badge ql-badge-pro">PRO</span>';

  box.innerHTML = templateMainUI(greeting, statusBadge, qlMinimized);
  box.style.height = qlHeight + "px";

  setTimeout(() => {
    updateSyncStatus();
    setupSend();
    setupStorageWatch();
    setupMinimize();
    setupSuggestionChips();
    setupWatermarkButton();
    setupDrag();
    setupResize();
    setupDarkMode();
    setupOptimize();
    setupSpeech();
    setupNotifications();
    setupModoPlano();
    setupFileAttachment();
    setupShield();
    setupTabs();
    loadChatHistory();
    setupNativeChatButton();
    setupClipboardPaste();
    setupDownloadProject();
    setupCreateProject();
    setupPublishProject();
    setupEnableCloud();
    checkForUpdatePopup();
    checkResellerRolePopup();

    const sidePanelBtn = document.getElementById("ql-sidepanel-btn");
    if(sidePanelBtn){
      sidePanelBtn.addEventListener("click", () => {
        const floatingBox = document.getElementById("ql-floating");
        if(floatingBox) {
          floatingBox.style.transition = "opacity 0.3s ease, transform 0.3s ease";
          floatingBox.style.opacity = "0";
          floatingBox.style.transform = "translateX(20px) scale(0.95)";
        }
        _qlOpenSidePanel();
        setTimeout(() => {
          if(floatingBox) floatingBox.remove();
        }, 350);
      });
    }
  }, 30);
}

function showCustomAlert(title, message){
  try {
    if (typeof QLSounds !== "undefined" && QLSounds.errorFromMessage) {
      var __ttl = (title || "") + " " + (message || "");
      if (/erro|falha|negad|inv[áa]lid|expir|limite|payment|rate|token|cr[eé]dito|sess/i.test(__ttl)) {
        QLSounds.errorFromMessage(__ttl);
      }
    }
  } catch(__e){}
  const alert = document.getElementById("ql-custom-alert");
  if(!alert) return;
  const titleEl = alert.querySelector(".ql-alert-title");
  const msgEl = alert.querySelector(".ql-alert-message");
  const okBtn = alert.querySelector(".ql-alert-ok-btn");
  title = qlUserText(title);
  message = qlUserText(message);
  if(titleEl) titleEl.textContent = title;
  if(msgEl) msgEl.textContent = message;
  alert.style.display = "flex";
  if(okBtn) {
    okBtn.onclick = () => { alert.style.display = "none"; };
  }
  setTimeout(() => { alert.style.display = "none"; }, 4000);
}

function setupOptimize(){
  const btn = document.getElementById("ql-optimize-btn");
  if(!btn) return;
  btn.addEventListener("click", async () => {
    const textarea = document.getElementById("ql-msg");
    if(!textarea || !textarea.value.trim()) {
      showCustomAlert("Attention", "Type a prompt before optimizing.");
      return;
    }
    const original = textarea.value.trim();
    btn.classList.add("ql-tool-loading");
    btn.disabled = true;

    try {
      const data = await bgFetch(OPTIMIZE_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "apikey": API_KEY
        },
        body: JSON.stringify({ prompt: original })
      });
      if(data.optimized_prompt) {
        textarea.value = data.optimized_prompt;
        showCustomAlert("Prompt Optimized! ✨", "Your prompt was improved with AI and is ready to send.");
      } else if(data.error) {
        showCustomAlert("Error", data.error);
      }
    } catch(err) {
      console.error("[Optimize] error:", err);
      showCustomAlert("Error", "Failed to connect to the optimizer: " + (err.message || ""));
    } finally {
      btn.classList.remove("ql-tool-loading");
      btn.disabled = false;
    }
  });
}

function setupSpeech(){
  const btn = document.getElementById("ql-speech-btn");
  if(!btn) return;
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition) {
    btn.title = "Speech is not supported in this browser";
    btn.style.opacity = "0.4";
    btn.style.cursor = "not-allowed";
    return;
  }

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if(qlIsRecording && qlSpeechRecognition) {
      qlSpeechRecognition.stop();
      return;
    }

    try {
      qlSpeechRecognition = new SpeechRecognition();
      qlSpeechRecognition.lang = "en-US";
      qlSpeechRecognition.continuous = true;
      qlSpeechRecognition.interimResults = true;
      qlSpeechRecognition.maxAlternatives = 1;

      let finalTranscript = "";
      const textarea = document.getElementById("ql-msg");

      qlSpeechRecognition.onstart = () => {
        qlIsRecording = true;
        btn.classList.add("ql-recording");
        finalTranscript = textarea ? textarea.value : "";
        console.log("[QL Speech] recording started");
      };

      qlSpeechRecognition.onresult = (event) => {
        let interim = "";
        for(let i = event.resultIndex; i < event.results.length; i++){
          const transcript = event.results[i][0].transcript;
          if(event.results[i].isFinal){
            finalTranscript += transcript + " ";
          } else {
            interim += transcript;
          }
        }
        if(textarea) textarea.value = finalTranscript + interim;
      };

      qlSpeechRecognition.onerror = (event) => {
        console.warn("[QL Speech] error:", event.error);
        qlIsRecording = false;
        btn.classList.remove("ql-recording");
        
        if(event.error === "not-allowed") {
          showCustomAlert("Permission Denied", "Allow microphone access in your browser settings.");
        } else if(event.error === "no-speech") {
          showCustomAlert("No Audio", "No speech detected. Try again.");
        } else if(event.error !== "aborted") {
          showCustomAlert("Voice Error", "Error: " + event.error);
        }
      };

      qlSpeechRecognition.onend = () => {
        qlIsRecording = false;
        btn.classList.remove("ql-recording");
        if(textarea) textarea.value = finalTranscript.trim();
        console.log("[QL Speech] recording finished");
      };

      qlSpeechRecognition.start();
    } catch(err) {
      console.error("[QL Speech] failed to start:", err);
      qlIsRecording = false;
      btn.classList.remove("ql-recording");
      showCustomAlert("Error", "Could not start voice recognition.");
    }
  });
}

function setupNotifications(){
  const bellBtn = document.querySelector(".ql-notif-btn");
  const panel = document.getElementById("ql-notif-panel");
  const closeBtn = document.getElementById("ql-notif-close");
  if(!bellBtn || !panel) return;

  bellBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = panel.style.display !== "none";
    panel.style.display = isOpen ? "none" : "block";
    if(!isOpen) loadNotifications();
  });

  if(closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      panel.style.display = "none";
    });
  }

  checkUnreadNotifications();
}

async function loadNotifications(){
  const list = document.getElementById("ql-notif-list");
  if(!list) return;
  list.innerHTML = '<p class="ql-notif-empty">Loading...</p>';

  try {
    const data = await bgFetch(NOTIFICATIONS_URL, {
      method: "GET",
      headers: { "apikey": API_KEY }
    });
    
    if(!data || data.length === 0){
      list.innerHTML = '<p class="ql-notif-empty">No notifications.</p>';
      return;
    }

    const ids = data.map(n => n.id);
    chrome.storage.local.set({ ql_read_notifs: ids });
    const badge = document.querySelector(".ql-notif-badge");
    if(badge) badge.style.display = "none";

    list.innerHTML = data.map(n => {
      const date = new Date(n.created_at).toLocaleDateString("en-US");
      const safeLink = sanitizeUrl(n.link);
      const linkHtml = safeLink ? '<a href="' + escapeHtml(safeLink) + '" target="_blank" rel="noopener noreferrer" class="ql-notif-link">Open link →</a>' : '';
      return '<div class="ql-notif-item"><div class="ql-notif-item-title">' + escapeHtml(n.title) + '</div><div class="ql-notif-item-msg">' + escapeHtml(n.message) + '</div>' + linkHtml + '<div class="ql-notif-item-date">' + date + '</div></div>';
    }).join('');
  } catch(err) {
    list.innerHTML = '<p class="ql-notif-empty">Error loading.</p>';
  }
}

async function checkUnreadNotifications(){
  try {
    const data = await bgFetch(NOTIFICATIONS_URL, {
      method: "GET",
      headers: { "apikey": API_KEY }
    });
    if(!data || data.length === 0) return;

    chrome.storage.local.get(["ql_read_notifs"], (res) => {
      const readIds = res.ql_read_notifs || [];
      const unread = data.filter(n => !readIds.includes(n.id)).length;
      const badge = document.querySelector(".ql-notif-badge");
      if(badge) {
        if(unread > 0) {
          badge.textContent = unread;
          badge.style.display = "flex";
        } else {
          badge.style.display = "none";
        }
      }
    });
  } catch(e) {}
}

function setupSuggestionChips(){
  const container = document.getElementById("ql-chips");
  if(!container) return;
  PROMPT_TEMPLATES.forEach((t) => {
    const chip = document.createElement("button");
    chip.className = "ql-chip";
    chip.innerHTML = t.icon + " " + t.label;
    chip.title = t.prompt;
    chip.addEventListener("click", () => {
      const textarea = document.getElementById("ql-msg");
      if(textarea) textarea.value = t.prompt;
    });
    container.appendChild(chip);
  });
}

function setupWatermarkButton(){
  var btn = document.getElementById("ql-remove-watermark");
  if(!btn) return;
  if (btn.dataset.qlWatermarkBound === "1") return;
  btn.dataset.qlWatermarkBound = "1";
  btn.addEventListener("click", async function(){
    var log = document.getElementById("ql-log");
    btn.disabled = true;
    btn.textContent = "⏳ Sending...";

    try {
      var ctx = typeof pkValidatePromptSendContext === "function"
        ? await pkValidatePromptSendContext(projectIdFromPage)
        : { ok: true };
      if (!ctx.ok) {
        if (log) { log.className = "ql-log-error"; log.innerText = "⚠ " + (ctx.error || "Cannot send."); }
        return;
      }
      var prompt = typeof pkGetWatermarkPrompt === "function" ? pkGetWatermarkPrompt() : PK_WATERMARK_PROMPT;
      await deliverPromptToLovable(prompt);
      if(log){ log.className = "ql-log-success"; log.innerText = "✓ Prompt sent! Wait for Lovable to apply the CSS."; }
    } catch(err) {
      if(log){ log.className = "ql-log-error"; log.innerText = "✗ " + (err.message || err); }
    } finally {
      btn.disabled = false;
      btn.textContent = "Remove Watermark";
    }
  });
}

function showPublishedUrlModal(url){
  var existing = document.getElementById("ql-publish-modal");
  if(existing) existing.remove();
  var overlay = document.createElement("div");
  overlay.id = "ql-publish-modal";
  overlay.className = "pk-publish-overlay pk-publish-overlay-top";
  overlay.innerHTML =
    '<div class="pk-publish-modal pk-publish-modal-wide">' +
      '<div class="pk-publish-emoji">🎉</div>' +
      '<h3>Project Published!</h3>' +
      '<p>Your project is live. Open it from the link below:</p>' +
      '<div class="pk-publish-url-box"><a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a></div>' +
      '<div class="pk-publish-actions">' +
        '<button id="ql-publish-copy" class="pk-publish-copy">📋 Copy</button>' +
        '<button id="ql-publish-open" class="pk-publish-open">🔗 Open</button>' +
      '</div>' +
      '<button id="ql-publish-close" class="pk-publish-close">Close</button>' +
    '</div>';
  document.body.appendChild(overlay);
  document.getElementById("ql-publish-copy").addEventListener("click", function(){
    navigator.clipboard.writeText(url);
    this.textContent = "✓ Copied!";
  });
  document.getElementById("ql-publish-open").addEventListener("click", function(){ window.open(url, "_blank"); });
  document.getElementById("ql-publish-close").addEventListener("click", function(){ overlay.remove(); });
  overlay.addEventListener("click", function(e){ if(e.target === overlay) overlay.remove(); });
}

function setupPublishProject(){
  var btn = document.getElementById("ql-publish-project");
  if(!btn) return;
  btn.addEventListener("click", async function(){
    var log = document.getElementById("ql-log");
    btn.disabled = true;
    btn.textContent = "⏳ Publishing...";

    await requestLatestTokenFromHook(2500);

    var storageData = await new Promise(function(resolve){
      chrome.storage.local.get(["lovable_projectId","lovable_token"], resolve);
    });
    var projectId = storageData.lovable_projectId || "";
    var token = storageData.lovable_token || "";

    if(!projectId || !token){
      if(log){ log.className = "ql-log-error"; log.innerText = "⚠ Project not synced."; }
      btn.disabled = false;
      btn.textContent = "🌐 Publish Project";
      return;
    }

    if(token.startsWith("Bearer ")) token = token.slice(7);

    try {
      var publishPayload = pkFeatureRequestBody(token, projectId);
      var result = await bgFetch(PUBLISH_PROJECT_URL, {
        method: "POST",
        headers: pkFeatureApiHeaders(),
        body: JSON.stringify(publishPayload),
        featureUiCompat: true
      });

      if(result && result.success === false){
        throw new Error(result.error_display || result.message || "Publish error");
      }

      if(log){ log.className = "ql-log-success"; log.innerText = "✓ Project published!"; }
      if(result && result.url) showPublishedUrlModal(result.url);
    } catch(err) {
      if(log){ log.className = "ql-log-error"; log.innerText = "✗ " + (err.message || err); }
    } finally {
      btn.disabled = false;
      btn.textContent = "🌐 Publish Project";
    }
  });
}

function setupEnableCloud(){
  var btn = document.getElementById("ql-enable-cloud");
  if(!btn) return;
  btn.addEventListener("click", async function(){
    var log = document.getElementById("ql-log");
    btn.disabled = true;
    btn.textContent = "⏳ Activating Cloud...";

    await requestLatestTokenFromHook(2500);

    var storageData = await new Promise(function(resolve){
      chrome.storage.local.get(["lovable_projectId","lovable_token"], resolve);
    });
    var projectId = storageData.lovable_projectId || "";
    var token = storageData.lovable_token || "";

    if(!projectId || !token){
      if(log){ log.className = "ql-log-error"; log.innerText = "⚠ Project not synced."; }
      btn.disabled = false;
      btn.textContent = "☁️ Enable Lovable Cloud";
      return;
    }

    if(token.startsWith("Bearer ")) token = token.slice(7);

    try {
      var cloudPayload = pkFeatureRequestBody(token, projectId, { region: "america" });
      var result = await bgFetch(ENABLE_CLOUD_URL, {
        method: "POST",
        headers: pkFeatureApiHeaders(),
        body: JSON.stringify(cloudPayload),
        featureUiCompat: true
      });

      if(result && result.success === false){
        throw new Error(result.error_display || result.message || "Cloud activation error");
      }

      if(log){ log.className = "ql-log-success"; log.innerText = "✓ " + (result && result.message ? result.message : "Lovable Cloud activated!"); }
    } catch(err) {
      if(log){ log.className = "ql-log-error"; log.innerText = "✗ " + (err.message || err); }
    } finally {
      btn.disabled = false;
      btn.textContent = "☁️ Enable Lovable Cloud";
    }
  });
}

function updateTrialCountdown(){}

function setupMinimize(){
  const btn = document.getElementById("ql-minimize");
  if(!btn) return;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const box = document.getElementById("ql-floating");
    if(!box) return;
    qlMinimized = !qlMinimized;
    box.classList.toggle("ql-minimized", qlMinimized);
    btn.textContent = qlMinimized ? "□" : "−";
    chrome.storage.local.set({ ql_minimized: qlMinimized });
  });
}

function setupDarkMode(){
  const moonBtn = document.querySelector('.ql-icon-btn[title="Theme"]');
  if(!moonBtn) return;
  moonBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const box = document.getElementById("ql-floating");
    if(!box) return;
    const isLight = box.classList.toggle("ql-light");
    chrome.storage.local.set({ ql_dark_mode: !isLight });
  });
}

function setupModoPlano(){
  const toggle = document.getElementById("ql-modo-plano");
  if(!toggle) return;

  migratePlanModeStorageKeys(function(on) {
    toggle.checked = on;
  });

  toggle.addEventListener("change", () => {
    writePlanModeToStorage(toggle.checked);
    if (toggle.checked) showModoPlanoAlert();
  });
}

function showModoPlanoAlert(){
  const existing = document.querySelector(".ql-modo-plano-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "ql-modo-plano-overlay";
  overlay.innerHTML = '<div class="ql-modo-plano-modal">' +
    '<div class="ql-modo-plano-icon">⚠️</div>' +
    '<div class="ql-modo-plano-title">Attention — Plan Mode</div>' +
    '<div class="ql-modo-plano-body">' +
      '<strong>Plan Mode</strong> (Think mode in Lovable) may use credits while planning. Use in moderation, then send builds through the extension with Plan Mode off.' +
    '</div>' +
    '<div class="ql-modo-plano-steps">' +
      '<div class="ql-modo-plano-step"><span class="ql-modo-plano-step-num">1</span><span class="ql-modo-plano-step-text">Enable <strong>Plan Mode</strong> and send your prompt through the extension.</span></div>' +
      '<div class="ql-modo-plano-step"><span class="ql-modo-plano-step-num">2</span><span class="ql-modo-plano-step-text">Lovable will generate a plan. <strong>Do not click Approve</strong> in Lovable.</span></div>' +
      '<div class="ql-modo-plano-step"><span class="ql-modo-plano-step-num">3</span><span class="ql-modo-plano-step-text"><strong>Copy the plan</strong> and paste it into the extension prompt.</span></div>' +
      '<div class="ql-modo-plano-step"><span class="ql-modo-plano-step-num">4</span><span class="ql-modo-plano-step-text"><strong>Turn off Plan Mode</strong> and send through the extension. No extra credits.</span></div>' +
    '</div>' +
    '<div class="ql-modo-plano-check">' +
      '<input type="checkbox" id="ql-modo-plano-dismiss" />' +
      '<label for="ql-modo-plano-dismiss">Do not show again</label>' +
    '</div>' +
    '<button class="ql-modo-plano-btn" id="ql-modo-plano-ok">Got it!</button>' +
  "</div>";

  const box = document.getElementById("ql-floating");
  if (box) box.appendChild(overlay);
  else document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add("ql-modo-plano-visible"));

  const close = () => {
    overlay.classList.remove("ql-modo-plano-visible");
    setTimeout(() => overlay.remove(), 180);
  };

  const okBtn = overlay.querySelector("#ql-modo-plano-ok");
  if (okBtn) {
    okBtn.addEventListener("click", () => {
      const dismiss = overlay.querySelector("#ql-modo-plano-dismiss");
      if (dismiss && dismiss.checked) {
        chrome.storage.local.set({ ql_modo_plano_alert_dismissed: true });
      }
      close();
    });
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
}

function setupShield(){
  const btn = document.getElementById("ql-shield-btn");
  if(!btn) return;

  chrome.storage.local.get(["ql_shield_active"], (res) => {
    if(res.ql_shield_active === true) {
      qlShieldActive = true;
      btn.classList.add("ql-shield-active");
      const label = document.getElementById("ql-shield-label");
      if(label) label.textContent = "Disable Shield";
      injectShieldOverlay();
    }
  });

  btn.addEventListener("click", () => {
    qlShieldActive = !qlShieldActive;
    chrome.storage.local.set({ ql_shield_active: qlShieldActive });

    const label = document.getElementById("ql-shield-label");
    if(qlShieldActive) {
      btn.classList.add("ql-shield-active");
      if(label) label.textContent = "Disable Shield";
      injectShieldOverlay();
      showCustomAlert("Shield Enabled 🛡️", "The Lovable input is locked. Use the extension to send prompts.");
    } else {
      btn.classList.remove("ql-shield-active");
      if(label) label.textContent = "Enable Shield";
      removeShieldOverlay();
      showCustomAlert("Shield Disabled", "The Lovable input is unlocked again.");
    }
  });
}

function injectShieldOverlay(){
  if(document.getElementById("ql-shield-overlay")) return;

  const chatForm = document.querySelector('form#chat-input');
  if(!chatForm) {
    setTimeout(injectShieldOverlay, 1000);
    return;
  }

  const existingPos = getComputedStyle(chatForm).position;
  if(existingPos === 'static') {
    chatForm.style.position = 'relative';
  }

  const overlay = document.createElement('div');
  overlay.id = 'ql-shield-overlay';
  overlay.className = 'ql-shield-overlay';
  overlay.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' +
    '</svg>' +
    '<span class="ql-shield-overlay-text">🛡️ Protected by Lovable Powerkits</span>' +
    '<span class="ql-shield-overlay-sub">Use the extension to send prompts</span>';

  overlay.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  overlay.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  overlay.addEventListener('keydown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, true);

  chatForm.appendChild(overlay);

  const inputs = chatForm.querySelectorAll('input, button, textarea, [contenteditable]');
  inputs.forEach(el => {
    if(el.id !== 'ql-shield-overlay') {
      el.dataset.qlShieldDisabled = el.disabled || '';
      el.dataset.qlShieldTabindex = el.getAttribute('tabindex') || '';
      el.setAttribute('tabindex', '-1');
      if(el.tagName !== 'DIV') el.disabled = true;
      if(el.contentEditable === 'true') {
        el.contentEditable = 'false';
        el.dataset.qlShieldEditable = 'true';
      }
    }
  });
}

function removeShieldOverlay(){
  const overlay = document.getElementById('ql-shield-overlay');
  if(overlay) overlay.remove();

  const chatForm = document.querySelector('form#chat-input');
  if(!chatForm) return;

  const inputs = chatForm.querySelectorAll('[data-ql-shield-disabled]');
  inputs.forEach(el => {
    const wasDis = el.dataset.qlShieldDisabled;
    if(wasDis === 'true') el.disabled = true;
    else if(wasDis === '' || wasDis === 'false') el.disabled = false;
    delete el.dataset.qlShieldDisabled;

    const oldTab = el.dataset.qlShieldTabindex;
    if(oldTab) el.setAttribute('tabindex', oldTab);
    else el.removeAttribute('tabindex');
    delete el.dataset.qlShieldTabindex;

    if(el.dataset.qlShieldEditable === 'true') {
      el.contentEditable = 'true';
      delete el.dataset.qlShieldEditable;
    }
  });
}

// Side-panel-only: keep pageHook + helpers; no floating bubble bootstrap
if (typeof SIDE_PANEL_ONLY !== "undefined" && SIDE_PANEL_ONLY) {
  try { chrome.storage.local.set({ ql_sidebar_mode: true }); } catch (e) {}
} else {
  function qlBootstrap() {
    if (document.getElementById("ql-floating")) return;
    if (!document.body) {
      var bodyWait = new MutationObserver(function() {
        if (document.body) {
          bodyWait.disconnect();
          qlBootstrap();
        }
      });
      bodyWait.observe(document.documentElement, { childList: true });
      return;
    }
    createUI();
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(qlBootstrap, 50);
  } else {
    document.addEventListener("DOMContentLoaded", function() { setTimeout(qlBootstrap, 50); });
  }

  var qlRetryCount = 0;
  var qlRetryDelays = [300, 600, 1000, 1500, 2000, 3000, 4000, 5000];
  function qlRetryInit() {
    if (typeof SIDE_PANEL_ONLY !== "undefined" && SIDE_PANEL_ONLY) return;
    if (document.getElementById("ql-floating") || qlRetryCount >= qlRetryDelays.length) return;
    var delay = qlRetryDelays[qlRetryCount];
    qlRetryCount++;
    setTimeout(function() {
      if (!document.getElementById("ql-floating") && document.body) {
        createUI();
      }
      qlRetryInit();
    }, delay);
  }
  qlRetryInit();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (typeof SIDE_PANEL_ONLY !== "undefined" && SIDE_PANEL_ONLY) return;
    if(changes.ql_sidebar_mode) {
      if(changes.ql_sidebar_mode.newValue === true) {
        const floatingBox = document.getElementById("ql-floating");
        if(floatingBox) {
          floatingBox.style.transition = "opacity 0.3s ease, transform 0.3s ease";
          floatingBox.style.opacity = "0";
          floatingBox.style.transform = "scale(0.95)";
          setTimeout(() => floatingBox.remove(), 350);
        }
      } else if(changes.ql_sidebar_mode.newValue === false) {
        setTimeout(() => {
          _buildFloatingUI();
          setTimeout(() => {
            const floatingBox = document.getElementById("ql-floating");
            if(floatingBox) {
              floatingBox.style.opacity = "0";
              floatingBox.style.transform = "scale(0.95) translateX(20px)";
              requestAnimationFrame(() => {
                floatingBox.style.transition = "opacity 0.4s ease, transform 0.4s ease";
                floatingBox.style.opacity = "1";
                floatingBox.style.transform = "scale(1) translateX(0)";
              });
            }
          }, 50);
        }, 100);
      }
    }
  });
}

function pkExtractProjectName() {
  try {
    var raw = (document.title || "").trim();
    if (!raw) return "";
    var name = raw
      .replace(/\s*[-–—|·•:]\s*Lovable\s*$/i, "")
      .replace(/^Lovable\s*[-–—|·•:]\s*/i, "")
      .trim();
    if (!name || name.toLowerCase() === "lovable") return "";
    return name.length > 48 ? name.slice(0, 45) + "…" : name;
  } catch (e) {
    return "";
  }
}

function pkCaptureProjectName() {
  var name = pkExtractProjectName();
  chrome.storage.local.get(["lovable_projectName"], function (res) {
    if (name && res.lovable_projectName !== name) {
      chrome.storage.local.set({ lovable_projectName: name });
    } else if (!name && res.lovable_projectName) {
      chrome.storage.local.remove("lovable_projectName");
    }
  });
}

function pkSetupProjectNameCapture() {
  if (!location.hostname || location.hostname.indexOf("lovable.dev") === -1) return;
  pkCaptureProjectName();
  try {
    var titleEl = document.querySelector("title");
    if (titleEl) {
      new MutationObserver(function () {
        pkCaptureProjectName();
      }).observe(titleEl, { childList: true, characterData: true, subtree: true });
    }
  } catch (e) {}
  setTimeout(pkCaptureProjectName, 1500);
}

function updateSyncStatus(){
  chrome.runtime.sendMessage({
    action: "syncLovableAuth",
    tabUrl: location.href,
    projectId: projectIdFromPage()
  }, function() {
    try { window.postMessage({ type: "lovableRequestToken" }, "*"); } catch (e) {}
    chrome.storage.local.get(["lovable_projectId","lovable_token","lovable_projectName"], (res)=>{
      const status = document.getElementById("ql-sync-status");
      if(!status) return;
      var token = res.lovable_token || '';
      if(res.lovable_projectId && token && isTokenFresh(token)){
        status.className = "ql-sync-status ql-sync-ok";
        var label = res.lovable_projectName || (res.lovable_projectId.substring(0, 6) + "...");
        status.innerHTML = '<span class="ql-sync-text">✅ Synced! Project: ' + String(label).replace(/[<>&]/g, "") + '</span>';
      } else if (res.lovable_projectId && token) {
        status.className = "ql-sync-status ql-sync-waiting";
        status.innerHTML = '<span class="ql-sync-text">⚠ Log in on lovable.dev</span>';
      } else {
        status.className = "ql-sync-status ql-sync-waiting";
        status.innerHTML = '<span class="ql-sync-text">⏳ Waiting for sync...</span>';
      }
    });
  });
}

function setupStorageWatch(){
  chrome.storage.onChanged.addListener((changes)=>{
    if(changes.lovable_projectId || changes.lovable_token || changes.lovable_projectName){
      updateSyncStatus();
    }
  });
}

function requestLatestTokenFromHook(timeoutMs = 1200){
  return new Promise((resolve)=>{
    let finished = false;

    function finish(updated){
      if(finished) return;
      finished = true;
      clearTimeout(timer);
      chrome.storage.onChanged.removeListener(onStorageChange);
      resolve(updated);
    }

    function onStorageChange(changes, area){
      if(area !== "local") return;
      if(changes.lovable_token && changes.lovable_token.newValue){
        finish(true);
      }
    }

    const timer = setTimeout(()=> finish(false), Math.max(300, timeoutMs));
    chrome.storage.onChanged.addListener(onStorageChange);

    try {
      window.postMessage({ type: "lovableRequestToken" }, "*");
      setTimeout(()=> window.postMessage({ type: "lovableRequestToken" }, "*"), 120);
    } catch(e) {
      finish(false);
    }
  });
}

// ===== CHAT HISTORY SYSTEM (Floating Popup) =====
function loadChatHistory(cb) {
  chrome.storage.local.get([QL_HISTORY_KEY], (res) => {
    qlChatHistory = res[QL_HISTORY_KEY] || [];
    updateHistoryBadge();
    if(cb) cb();
  });
}

function saveChatHistory() {
  if(qlChatHistory.length > QL_MAX_HISTORY) qlChatHistory = qlChatHistory.slice(-QL_MAX_HISTORY);
  chrome.storage.local.set({ [QL_HISTORY_KEY]: qlChatHistory });
}

function addToChatHistory(text, status) {
  qlChatHistory.push({ text: text, timestamp: new Date().toISOString(), status: status || 'ok' });
  saveChatHistory();
  updateHistoryBadge();
}

function updateHistoryBadge() {
  const badge = document.getElementById('ql-history-badge');
  if(!badge) return;
  if(qlChatHistory.length > 0) {
    badge.textContent = qlChatHistory.length;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function formatChatDate(dateStr) {
  var d = new Date(dateStr);
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var diff = (today - msgDay) / 86400000;
  if(diff === 0) return 'Today';
  if(diff === 1) return 'Yesterday';
  if(diff < 7) return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
  return d.toLocaleDateString('en-US');
}

function formatChatTime(dateStr) {
  var d = new Date(dateStr);
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

function renderHistoryView() {
  const container = document.getElementById('ql-tab-content');
  if(!container) return;

  if(!qlChatHistory.length) {
    container.innerHTML = '<div class="ql-chat-empty"><div style="font-size:28px;margin-bottom:8px">💬</div><div style="font-size:13px;font-weight:600;color:var(--ql-text-primary,#f4f4f5)">No messages</div><div style="font-size:11px;color:var(--ql-text-muted,#71717a);margin-top:4px">Your sent prompts will appear here.</div></div>';
    return;
  }

  let html = '<div class="ql-chat-messages">';
  let lastDate = '';
  for(let i = 0; i < qlChatHistory.length; i++) {
    const m = qlChatHistory[i];
    const dateLabel = formatChatDate(m.timestamp);
    if(dateLabel !== lastDate) {
      html += '<div class="ql-chat-date-divider"><span class="ql-chat-date-label">' + dateLabel + '</span></div>';
      lastDate = dateLabel;
    }
    const statusClass = m.status === 'error' ? 'ql-chat-status-err' : 'ql-chat-status-ok';
    const statusText = m.status === 'error' ? '✗ Error' : '✓ Sent';
    const truncated = m.text.length > 300 ? escapeHtml(m.text.substring(0, 300)) + '…' : escapeHtml(m.text);
    html += '<div class="ql-chat-bubble" title="' + escapeHtml(m.text) + '">' + truncated +
      '<div class="ql-chat-meta"><span class="' + statusClass + '">' + statusText + '</span><span class="ql-chat-time">' + formatChatTime(m.timestamp) + '</span></div></div>';
  }
  html += '</div>';
  html += '<div class="ql-chat-actions"><span class="ql-chat-count">' + qlChatHistory.length + ' message' + (qlChatHistory.length === 1 ? '' : 's') + '</span><button class="ql-chat-clear" id="ql-chat-clear">🗑 Clear</button></div>';
  container.innerHTML = html;

  const msgs = container.querySelector('.ql-chat-messages');
  if(msgs) msgs.scrollTop = msgs.scrollHeight;

  const clearBtn = document.getElementById('ql-chat-clear');
  if(clearBtn) {
    clearBtn.addEventListener('click', () => {
      qlChatHistory = [];
      saveChatHistory();
      updateHistoryBadge();
      renderHistoryView();
    });
  }
}

function renderPromptView() {
  const container = document.getElementById('ql-tab-content');
  if(!container) return;
  container.innerHTML =
    '<textarea id="ql-msg" rows="3" placeholder="Type your command..." spellcheck="false"></textarea>' +
    '<div id="ql-attach-preview" class="ql-attach-preview" style="display:none"></div>' +
    '<div class="ql-action-bar">' +
      '<div class="ql-action-left">' +
        '<label class="ql-toggle"><input type="checkbox" id="ql-modo-plano"><span class="ql-toggle-slider"></span></label>' +
        '<span class="ql-toggle-label-inline">Plan</span>' +
      '</div>' +
      '<div class="ql-action-center">' +
        '<button id="ql-attach-btn" class="ql-attach-btn" title="Attach file (max. 10)">📎</button>' +
        '<button id="ql-optimize-btn" class="ql-tool-btn" title="Optimize with AI">' + SVG_ICONS.sparkles + '</button>' +
        '<button id="ql-speech-btn" class="ql-tool-btn" title="Voice to text">' + SVG_ICONS.mic + '</button>' +
      '</div>' +
      '<div class="ql-action-right-send">' +
        '<button id="ql-send" class="ql-send-btn">Send</button>' +
      '</div>' +
    '</div>' +
    '<input type="file" id="ql-file-input" multiple style="display:none" accept="*/*">' +
    '<div id="ql-log"></div>' +
    '<div class="ql-shortcuts-section">' +
      '<span class="ql-shortcuts-title">QUICK SHORTCUTS</span>' +
      '<div class="ql-shortcuts-grid" id="ql-chips"></div>' +
    '</div>' +
    '<button id="ql-remove-watermark" class="ql-watermark-btn">Remove Watermark</button>' +
    '<button id="ql-shield-btn" class="ql-shield-btn">' +
      '<span id="ql-shield-label">Enable Shield</span>' +
    '</button>' +
    '<button id="ql-native-chat-btn" class="ql-native-chat-btn">' +
      SVG_ICONS.msgSquare + ' Use Native Chat' +
    '</button>' +
    '<button id="ql-download-project" class="ql-watermark-btn sp-btn-feature sp-btn-download">Download Source Code</button>' +
    '<button id="ql-quick-init" class="ql-watermark-btn sp-btn-feature sp-btn-quick-init">Create New Project</button>' +
    '<button id="ql-publish-project" class="ql-watermark-btn sp-btn-feature sp-btn-publish">🌐 Publish Project</button>' +
    '<button id="ql-enable-cloud" class="ql-watermark-btn sp-btn-feature sp-btn-cloud">☁️ Enable Lovable Cloud</button>' +
    '<div id="ql-download-status" style="display:none"></div>';
  // Re-setup all prompt tab features
  setupSend();
  setupSuggestionChips();
  setupWatermarkButton();
  setupOptimize();
  setupSpeech();
  setupModoPlano();
  setupFileAttachment();
  setupShield();
  setupNativeChatButton();
  setupClipboardPaste();
  setupDownloadProject();
  setupCreateProject();
  setupPublishProject();
  setupEnableCloud();
}

function setupTabs() {
  const tabs = document.querySelectorAll('.ql-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      qlActiveTab = target;
      document.querySelectorAll('.ql-tab').forEach(t => t.classList.toggle('ql-tab-active', t.getAttribute('data-tab') === target));
      if(target === 'history') {
        loadChatHistory(() => renderHistoryView());
      } else {
        renderPromptView();
      }
    });
  });
}


// ===== FILE ATTACHMENT SYSTEM =====
const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
let qlAttachedFiles = [];

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function isImageType(type) {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(type);
}

async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 1280;
      let w = img.width, h = img.height;
      if (w > MAX_DIM || h > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = file.type === 'image/png' ? undefined : 0.8;
      canvas.toBlob((blob) => {
        if (!blob) return resolve({ file, previewUrl: null });
        const compressed = new File([blob], file.name, { type: outputType });
        const previewUrl = URL.createObjectURL(blob);
        resolve({ file: compressed, previewUrl });
      }, outputType, quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ file, previewUrl: null }); };
    img.src = url;
  });
}

function decodeJwtUserId(token) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload !== 'object') return null;
  return payload.sub || payload.user_id || null;
}

async function uploadFileDirect(file, token) {
  // NEW FLOW: direct upload to our public Supabase bucket
  // (prompt-images). Returns the public URL to attach to the prompt.
  const fileId = crypto.randomUUID();

  const inferContentType = (f) => {
    if (f && typeof f.type === 'string' && f.type.trim()) return f.type;
    const name = (f && f.name ? f.name : '').toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    const map = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif'
    };
    return map[ext] || 'application/octet-stream';
  };

  const buildObjectKey = (id, f) => {
    const rawName = f && f.name ? String(f.name) : '';
    const ext = rawName.includes('.') ? rawName.split('.').pop().toLowerCase() : '';
    const safeExt = ext && /^[a-z0-9]{1,10}$/.test(ext) ? ext : 'png';
    const ts = Date.now();
    return 'uploads/' + ts + '-' + id + '.' + safeExt;
  };

  const contentType = inferContentType(file);
  const objectKey = buildObjectKey(fileId, file);
  const uploadUrl = API_BASE + '/storage/v1/object/prompt-images/' + objectKey;
  await new Promise(function(resolve, reject){
    var xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('apikey', API_KEY);
    xhr.setRequestHeader('Authorization', 'Bearer ' + API_KEY);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.onload = function(){
      if (xhr.status >= 200 && xhr.status < 300) resolve(true);
      else reject(new Error('Upload failed: ' + xhr.status + ' ' + (xhr.responseText || '')));
    };
    xhr.onerror = function(){ reject(new Error('Network error during upload')); };
    xhr.send(file);
  });

  var publicUrl = API_BASE + '/storage/v1/object/public/prompt-images/' + objectKey;
  return { file_id: objectKey, file_name: file.name || 'file', public_url: publicUrl };
}

function renderAttachPreview() {
  const container = document.getElementById('ql-attach-preview');
  if (!container) return;
  if (qlAttachedFiles.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }
  container.style.display = 'flex';
  container.innerHTML = qlAttachedFiles.map((f, i) => {
    const thumbHtml = f.previewUrl
      ? '<img class="ql-attach-thumb" src="' + f.previewUrl + '" alt="">'
      : '<div class="ql-attach-icon">📄</div>';
    const uploadingClass = f.uploading ? ' ql-attach-uploading' : '';
    return '<div class="ql-attach-item' + uploadingClass + '" data-idx="' + i + '">' +
      thumbHtml +
      '<div class="ql-attach-info"><span class="ql-attach-name" title="' + escapeHtml(f.file_name) + '">' + escapeHtml(f.file_name) + '</span><span class="ql-attach-size">' + escapeHtml(f.sizeLabel) + '</span></div>' +
      '<button class="ql-attach-remove" data-idx="' + i + '">✕</button>' +
    '</div>';
  }).join('');

  container.querySelectorAll('.ql-attach-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-idx'));
      if (qlAttachedFiles[idx] && qlAttachedFiles[idx].previewUrl) {
        URL.revokeObjectURL(qlAttachedFiles[idx].previewUrl);
      }
      qlAttachedFiles.splice(idx, 1);
      renderAttachPreview();
    });
  });
}

function setupFileAttachment() {
  const attachBtn = document.getElementById('ql-attach-btn');
  const fileInput = document.getElementById('ql-file-input');
  if (!attachBtn || !fileInput) return;

  attachBtn.addEventListener('click', () => {
    if (qlAttachedFiles.length >= MAX_FILES) {
      showCustomAlert('Limit', 'Maximum of ' + MAX_FILES + ' files.');
      return;
    }
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []);
    fileInput.value = '';
    if (!files.length) return;

    const storageData = await new Promise(r => chrome.storage.local.get(['lovable_token'], r));
    let token = storageData.lovable_token || '';
    if (!token) {
      showCustomAlert('Error', 'Token not captured. Browse Lovable to sync.');
      return;
    }
    if (token.startsWith('Bearer ')) token = token.slice(7);

    for (const file of files) {
      if (qlAttachedFiles.length >= MAX_FILES) {
        showCustomAlert('Limit', 'Maximum of ' + MAX_FILES + ' files reached.');
        break;
      }
      if (file.size > MAX_FILE_SIZE) {
        showCustomAlert('Large file', file.name + ' exceeds 20MB.');
        continue;
      }

      let processedFile = file;
      let previewUrl = null;

      if (isImageType(file.type)) {
        const result = await compressImage(file);
        processedFile = result.file;
        previewUrl = result.previewUrl;
      }

      const isImage = isImageType(processedFile.type);
      const placeholderIdx = qlAttachedFiles.length;
      qlAttachedFiles.push({
        file_id: null,
        file_name: file.name,
        previewUrl: previewUrl,
        file_type: processedFile.type,
        sizeLabel: formatFileSize(processedFile.size),
        uploading: true,
        rawFile: processedFile
      });
      renderAttachPreview();

      try {
        const result = await uploadFileDirect(processedFile, token);
        qlAttachedFiles[placeholderIdx].file_id = result.file_id;
        qlAttachedFiles[placeholderIdx].public_url = result.public_url;
        qlAttachedFiles[placeholderIdx].uploading = false;
        renderAttachPreview();
      } catch (err) {
        console.warn('[QL Upload] failed to upload to Supabase Storage:', err.message);
        qlAttachedFiles[placeholderIdx].uploading = false;
        qlAttachedFiles[placeholderIdx].uploadFailed = true;
        renderAttachPreview();
        showCustomAlert('Upload Error', 'Could not upload the image: ' + (err.message || 'unknown error'));
      }
    }
  });
}

async function deliverPromptToLovable(text) {
  if (typeof window.__pkDeliverPrompt === "function") {
    return window.__pkDeliverPrompt(text);
  }
  throw new Error("Extension send bridge not ready. Refresh your Lovable project tab and try again.");
}

function setupSend(){
  const btn = document.getElementById("ql-send");
  if(!btn) return;
  if(btn.dataset.qlSendBound === "1") return;
  btn.dataset.qlSendBound = "1";
  btn.addEventListener("click", async ()=>{
    var msgEl = document.getElementById("ql-msg");
    const mensagem = msgEl ? (msgEl.value || "").trim() : "";
    const log = document.getElementById("ql-log");

    if(!mensagem){
      if(log){ log.className = "ql-log-error"; log.innerText = "⚠ Empty prompt"; }
      return;
    }

    const storageData = await new Promise((resolve) => {
      chrome.storage.local.get(["lovable_projectId"], resolve);
    });
    const projectId = storageData.lovable_projectId || projectIdFromPage() || "";

    if (!projectId) {
      if (log) { log.className = "ql-log-error"; log.innerText = "⚠ Open lovable.dev on your project and wait for sync."; }
      return;
    }

    // Images uploaded to Powerkits storage — attach public links to prompt.
    // We only attach the public links to the user prompt.
    const uploadedImages = qlAttachedFiles.filter(function(f){
      return f.public_url && !f.uploading && !f.uploadFailed;
    });
    const hasImage = uploadedImages.length > 0;

    // Compose final message: prompt + URL(s) das imagens
    var finalMensagem = mensagem;
    if (hasImage) {
      var linkLines = uploadedImages.map(function(f){ return f.public_url; }).join('\n');
      var sep = uploadedImages.length > 1 ? 'Analyze the files at these links:\n' : 'Analyze the file at this link: ';
      finalMensagem = mensagem + '\n\n' + sep + linkLines;
    }

    try{
      if(hasImage) {
        if(log){ log.className = "ql-log-info"; log.innerText = "📎 Attaching image link..."; }
      } else {
        if(log){ log.className = "ql-log-info"; log.innerText = "⏳ Sending prompt..."; }
      }
      btn.classList.add("ql-sending");
      btn.disabled = true;

      await deliverPromptToLovable(finalMensagem);

      if(log){
        if (hasImage) {
          log.className = "ql-log-success";
          log.innerText = "✓ Prompt sent! Valid image 😁";
        } else {
          log.className = "ql-log-success";
          log.innerText = "✓ Prompt sent!";
        }
      }
      try { if(typeof QLSounds!=="undefined") QLSounds.promptSent(); } catch(e){}

      // Save to chat history
      addToChatHistory(mensagem, 'ok');

      var msgEl = document.getElementById("ql-msg");
      if(msgEl) msgEl.value = "";

      qlAttachedFiles.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
      qlAttachedFiles = [];
      renderAttachPreview();
    }catch(err){
      if(log){ log.className = "ql-log-error"; log.innerText = "✗ " + formatApiError(err.message || err); }
      addToChatHistory(mensagem, 'error');
    } finally {
      btn.classList.remove("ql-sending");
      btn.disabled = false;
    }
  });
}

// Store references to avoid stacking listeners
let _dragCleanup = null;
let _resizeCleanup = null;

function setupDrag(){
  if(_dragCleanup) { _dragCleanup(); _dragCleanup = null; }

  const box = document.getElementById("ql-floating");
  const header = document.getElementById("ql-header");
  if(!box || !header) return;

  let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

  function onPointerDown(e){
    if(e.target.closest(".ql-minimize-btn") || e.target.closest(".ql-icon-btn") || e.target.closest("button")) return;
    if(e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    const rect = box.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startLeft = rect.left; startTop = rect.top;
    dragging = true;
    try { header.setPointerCapture(e.pointerId); } catch(ex){}
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.body.style.userSelect = "none";
  }

  function onPointerMove(e){
    if(!dragging) return;
    let newLeft = startLeft + (e.clientX - startX);
    let newTop = startTop + (e.clientY - startY);
    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - box.offsetWidth));
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - box.offsetHeight));
    box.style.left = newLeft + "px";
    box.style.top = newTop + "px";
  }

  function onPointerUp(e){
    if(!dragging) return;
    dragging = false;
    try { header.releasePointerCapture(e.pointerId); } catch(ex){}
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.body.style.userSelect = "";
  }

  header.addEventListener("pointerdown", onPointerDown, {passive:false});

  _dragCleanup = function(){
    header.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
  };
}

function setupResize(){
  if(_resizeCleanup) { _resizeCleanup(); _resizeCleanup = null; }

  const box = document.getElementById("ql-floating");
  const handle = document.getElementById("ql-resize-handle");
  if(!box || !handle) return;

  let resizing = false, startY = 0, startH = 0;

  function onDown(e){
    e.preventDefault();
    e.stopPropagation();
    resizing = true;
    startY = e.clientY;
    startH = box.offsetHeight;
    try { handle.setPointerCapture(e.pointerId); } catch(ex){}
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.body.style.userSelect = "none";
  }

  function onMove(e){
    if(!resizing) return;
    let newH = startH + (e.clientY - startY);
    newH = Math.max(200, Math.min(newH, window.innerHeight * 0.8));
    box.style.height = newH + "px";
  }

  function onUp(e){
    if(!resizing) return;
    resizing = false;
    qlHeight = box.offsetHeight;
    chrome.storage.local.set({ ql_height: qlHeight });
    try { handle.releasePointerCapture(e.pointerId); } catch(ex){}
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.body.style.userSelect = "";
  }

  handle.addEventListener("pointerdown", onDown, {passive:false});

  _resizeCleanup = function(){
    handle.removeEventListener("pointerdown", onDown);
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
  };
}

// ===== CLIPBOARD PASTE (Ctrl+V) for ANY Files =====
function setupClipboardPaste() {
  var textarea = document.getElementById('ql-msg');
  if (!textarea) return;

  // --- Drag and Drop ---
  var dropZone = document.getElementById('ql-floating') || textarea;
  var dragOverlay = null;

  function showDragOverlay() {
    if (dragOverlay) return;
    dragOverlay = document.createElement('div');
    dragOverlay.className = 'ql-drag-overlay';
    dragOverlay.innerHTML = '<div class="ql-drag-overlay-inner">📂 Drop files here</div>';
    var parent = document.getElementById('ql-floating');
    if (parent) parent.appendChild(dragOverlay);
  }

  function hideDragOverlay() {
    if (dragOverlay) { dragOverlay.remove(); dragOverlay = null; }
  }

  dropZone.addEventListener('dragover', function(e) { e.preventDefault(); e.stopPropagation(); showDragOverlay(); });
  dropZone.addEventListener('dragleave', function(e) { e.preventDefault(); e.stopPropagation(); if (!dropZone.contains(e.relatedTarget)) hideDragOverlay(); });
  dropZone.addEventListener('drop', async function(e) {
    e.preventDefault(); e.stopPropagation(); hideDragOverlay();
    var files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    await handleFilesAttach(files);
  });

  // --- Paste (images + non-image files) ---
  textarea.addEventListener('paste', async function(e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    var filesToAttach = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.kind === 'file') {
        e.preventDefault();
        var file = item.getAsFile();
        if (file) filesToAttach.push(file);
      }
    }
    if (filesToAttach.length > 0) await handleFilesAttach(filesToAttach);
  });
}

async function handleFilesAttach(files) {
  if (qlAttachedFiles.length >= MAX_FILES) {
    showCustomAlert('Limit', 'Maximum ' + MAX_FILES + ' files.');
    return;
  }
  var sd = await new Promise(function(r) { chrome.storage.local.get(['lovable_token'], r); });
  var token = sd.lovable_token || '';
  if (!token) { showCustomAlert('Error', 'Token not captured.'); return; }
  if (token.indexOf('Bearer ') === 0) token = token.slice(7);

  for (var fi = 0; fi < files.length; fi++) {
    var file = files[fi];
    if (qlAttachedFiles.length >= MAX_FILES) break;
    if (file.size > MAX_FILE_SIZE) { showCustomAlert('File Too Large', file.name + ' exceeds 20MB.'); continue; }

    var processedFile = file;
    var previewUrl = null;
    if (isImageType(file.type)) {
      var compressed = await compressImage(file);
      processedFile = compressed.file;
      previewUrl = compressed.previewUrl;
    }

    var idx = qlAttachedFiles.length;
    qlAttachedFiles.push({
      file_id: null,
      file_name: file.name || ('file_' + Date.now()),
      previewUrl: previewUrl,
      file_type: processedFile.type,
      sizeLabel: formatFileSize(processedFile.size),
      uploading: true,
      rawFile: processedFile
    });
    renderAttachPreview();

    try {
      var res = await uploadFileDirect(processedFile, token);
      qlAttachedFiles[idx].file_id = res.file_id;
      qlAttachedFiles[idx].uploading = false;
      renderAttachPreview();
    } catch(err) {
      qlAttachedFiles[idx].uploading = false;
      qlAttachedFiles[idx].file_id = 'local_direct_' + crypto.randomUUID();
      qlAttachedFiles[idx].uploadFailed = true;
      renderAttachPreview();
    }
  }
}

// ===== DOWNLOAD ALL PROJECT FILES (Popup) =====
var CURRENT_EXT_VERSION_POPUP = typeof extensionVersionShort === "function" ? extensionVersionShort() : (typeof EXTENSION_VERSION !== "undefined" ? EXTENSION_VERSION : "0.0.0");

function setupDownloadProject() {
  var btn = document.getElementById('ql-download-project');
  if (!btn) return;
  btn.addEventListener('click', async function() {
    var statusEl = document.getElementById('ql-download-status');
    btn.disabled = true;
    btn.textContent = 'Preparing...';
    if (statusEl) { statusEl.style.display = 'block'; statusEl.className = 'ql-log-info'; statusEl.textContent = 'Checking token and project...'; }

    try {
      // ---- Feature flag gate ----
      try {
        var flagUrl = API_BASE + "/rest/v1/feature_flags?select=enabled&flag_key=eq.download_files";
        var flagRows = await bgFetch(flagUrl, { method: "GET", headers: { apikey: API_KEY } });
        if (flagRows && flagRows.length > 0 && flagRows[0].enabled === false) {
          throw new Error('Error using the extension resources.');
        }
      } catch (flagErr) {
        if (flagErr && flagErr.message === 'Error using the extension resources.') throw flagErr;
      }

      var sd = await new Promise(function(r) { chrome.storage.local.get(['lovable_token', 'lovable_projectId'], r); });
      var authToken = sd.lovable_token || '';
      var storedProjectId = sd.lovable_projectId || '';
      if (authToken.indexOf('Bearer ') === 0) authToken = authToken.slice(7);

      var projectId = storedProjectId;
      if (!projectId) throw new Error('Open a Lovable project page first.');
      if (!authToken) {
        var cookieResponse = await new Promise(function(resolve) {
          chrome.runtime.sendMessage({ action: "readCookies" }, function(resp) { resolve(resp); });
        });
        if (cookieResponse && cookieResponse.success && cookieResponse.tokens && cookieResponse.tokens.length > 0) {
          authToken = cookieResponse.tokens[0].token;
        }
      }
      if (!authToken) throw new Error('Token not found. Open a Lovable project and wait for sync.');

      btn.textContent = 'Downloading...';
      if (statusEl) statusEl.textContent = 'Downloading project files...';

      var dlResponse = await new Promise(function(resolve) {
        chrome.runtime.sendMessage({ action: "downloadProject", projectId: projectId, token: authToken }, function(resp) { resolve(resp); });
      });

      if (!dlResponse || !dlResponse.success) throw new Error(dlResponse && dlResponse.error ? dlResponse.error : 'Download failed');
      var files = dlResponse.files;
      if (!files || files.length === 0) throw new Error('No files found in the project.');

      if (statusEl) statusEl.textContent = 'Creating ZIP with ' + files.length + ' files...';
      btn.textContent = 'Packaging...';
      if (typeof JSZip === 'undefined') throw new Error('JSZip not loaded. Use the Side Panel.');

      var zip = new JSZip();
      var imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff'];
      var addedFiles = 0;
      for (var fi = 0; fi < files.length; fi++) {
        var f = files[fi];
        if (!f.name || f.sizeExceeded) continue;
        if (f.contents && f.binary) { zip.file(f.name, f.contents, { base64: true, binary: true }); addedFiles++; }
        else if (!f.contents && imageExts.some(function(ext) { return f.name.toLowerCase().endsWith(ext); })) {
          try {
            var imgResp = await fetch('https://api.lovable.dev/projects/' + projectId + '/files/raw?path=' + encodeURIComponent(f.name), { method: 'GET', headers: { 'Authorization': 'Bearer ' + authToken }, credentials: 'omit', mode: 'cors' });
            if (imgResp.ok) { zip.file(f.name, await imgResp.arrayBuffer(), { binary: true }); addedFiles++; }
            else if (f.contents) { zip.file(f.name, f.contents); addedFiles++; }
          } catch(imgErr) { if (f.contents) { zip.file(f.name, f.contents); addedFiles++; } }
        } else if (f.contents) { zip.file(f.name, f.contents); addedFiles++; }
      }

      var zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = 'lovable-' + projectId.substring(0, 8) + '-' + new Date().toISOString().split('T')[0] + '.zip';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);

      if (statusEl) { statusEl.className = 'ql-log-success'; statusEl.textContent = addedFiles + ' files downloaded!'; }
      btn.textContent = 'Download Complete!';
      setTimeout(function() { btn.textContent = 'Download All Files'; btn.disabled = false; if (statusEl) statusEl.style.display = 'none'; }, 4000);
    } catch(err) {
      if (statusEl) { statusEl.className = 'ql-log-error'; statusEl.textContent = (err.message || err); statusEl.style.display = 'block'; }
      btn.textContent = 'Failed';
      setTimeout(function() { btn.textContent = 'Download All Files'; btn.disabled = false; }, 3000);
    }
  });
}

// ===== UPDATE CHECK (Popup) =====
async function checkForUpdatePopup() {
  try {
    var data = await bgFetch(VERSIONS_URL_POPUP, { method: "GET", headers: { apikey: API_KEY } });
    if (!data || !data.length) return;
    var latest = data[0];
    if (latest.version !== CURRENT_EXT_VERSION_POPUP && latest.is_alert_active) {
      var banner = document.getElementById('ql-update-banner');
      if (banner) {
        var dlUrl = latest.file_path ? API_BASE + "/storage/v1/object/public/extension-releases/" + latest.file_path : null;
        banner.innerHTML = qlTemplateUpdateBanner(latest.version, latest.changelog || '', dlUrl);
        banner.style.display = 'block';
      }
    }
  } catch(e) {}
}

// ===== RESELLER ROLE CHECK (Popup) =====
async function checkResellerRolePopup() {}

// ===== NATIVE CHAT MODE =====
let qlNativeChatActive = false;
let qlNativeChatCleanup = null;

function activateNativeChat() {
  qlNativeChatActive = true;
  chrome.storage.local.set({ ql_native_chat: true });
  try { document.documentElement.setAttribute("data-ql-native-chat", "1"); } catch (e) {}

  // Hide the extension
  const floatingBox = document.getElementById("ql-floating");
  if (floatingBox) {
    floatingBox.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    floatingBox.style.opacity = "0";
    floatingBox.style.transform = "scale(0.95) translateX(20px)";
    setTimeout(() => { floatingBox.style.display = "none"; }, 350);
  }

  injectNativeChatOverlay();
}

function deactivateNativeChat() {
  qlNativeChatActive = false;
  chrome.storage.local.set({ ql_native_chat: false });
  try { document.documentElement.removeAttribute("data-ql-native-chat"); } catch (e) {}

  // Clean up injected elements
  if (qlNativeChatCleanup) { qlNativeChatCleanup(); qlNativeChatCleanup = null; }

  const badge = document.getElementById("ql-native-badge");
  if (badge) badge.remove();
  const returnBtn = document.getElementById("ql-native-return-btn");
  if (returnBtn) returnBtn.remove();

  // Restore send button
  const sendBtn = document.getElementById("chatinput-send-message-button");
  if (sendBtn) {
    sendBtn.classList.remove("ql-native-send-active");
    sendBtn.style.animation = "";
  }

  // Show the extension again
  const floatingBox = document.getElementById("ql-floating");
  if (floatingBox) {
    floatingBox.style.display = "";
    floatingBox.style.opacity = "0";
    floatingBox.style.transform = "scale(0.95)";
    requestAnimationFrame(() => {
      floatingBox.style.transition = "opacity 0.4s ease, transform 0.4s ease";
      floatingBox.style.opacity = "1";
      floatingBox.style.transform = "scale(1) translateX(0)";
    });
  } else {
    // Rebuild if removed
    _buildFloatingUI();
  }
}

function injectNativeChatOverlay() {
  // Wait for chat form to exist
  const chatForm = document.querySelector("form#chat-input");
  if (!chatForm) {
    setTimeout(injectNativeChatOverlay, 500);
    return;
  }

  // Add QL badge on top-right of chat form
  if (!document.getElementById("ql-native-badge")) {
    const existingPos = getComputedStyle(chatForm).position;
    if (existingPos === "static") chatForm.style.position = "relative";

    const badge = document.createElement("div");
    badge.id = "ql-native-badge";
    badge.className = "ql-native-badge";
    badge.innerHTML = "⚡ <span>Lovable Powerkits</span>";
    chatForm.appendChild(badge);
  }

  // Add return button below chat form
  if (!document.getElementById("ql-native-return-btn")) {
    const returnBtn = document.createElement("button");
    returnBtn.id = "ql-native-return-btn";
    returnBtn.className = "ql-native-return-btn";
    returnBtn.innerHTML = "← Return to Extension";
    returnBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      deactivateNativeChat();
    });
    chatForm.parentElement.insertBefore(returnBtn, chatForm.nextSibling);
  }

  // Style the send button with blink animation
  const sendBtn = document.getElementById("chatinput-send-message-button");
  if (sendBtn) {
    sendBtn.classList.add("ql-native-send-active");
  }

  // History tracking only — Lovable native send proceeds (pageHook applies credit bypass).
  function interceptSend() {
    if (!qlNativeChatActive) return;
    const editor = chatForm.querySelector('[contenteditable="true"]');
    const text = editor ? (editor.innerText || editor.textContent || "").trim() : "";
    if (text) addToChatHistory(text, "ok");
  }

  function interceptSubmit() {
    if (!qlNativeChatActive) return;
    const editor = chatForm.querySelector('[contenteditable="true"]');
    const text = editor ? (editor.innerText || editor.textContent || "").trim() : "";
    if (text) addToChatHistory(text, "ok");
  }

  function interceptKeydown(e) {
    if (!qlNativeChatActive) return;
    if (e.key === "Enter" && !e.shiftKey) {
      const editor = chatForm.querySelector('[contenteditable="true"]');
      const text = editor ? (editor.innerText || editor.textContent || "").trim() : "";
      if (text) addToChatHistory(text, "ok");
    }
  }

  if (sendBtn) sendBtn.addEventListener("click", interceptSend, true);
  chatForm.addEventListener("submit", interceptSubmit, true);
  chatForm.addEventListener("keydown", interceptKeydown, true);

  qlNativeChatCleanup = function() {
    if (sendBtn) sendBtn.removeEventListener("click", interceptSend, true);
    chatForm.removeEventListener("submit", interceptSubmit, true);
    chatForm.removeEventListener("keydown", interceptKeydown, true);
  };
}

async function sendViaNativeChat(text) {
  if (text) addToChatHistory(text, "ok");
}

function showNativeSendingOverlay(show) {
  const id = "ql-native-sending-overlay";
  const existing = document.getElementById(id);
  if (!show) { if (existing) existing.remove(); return; }
  if (existing) return;
  const el = document.createElement("div");
  el.id = id;
  el.className = "ql-native-sending-overlay";
  el.innerHTML = '<div class="ql-spinner"></div> Sending prompt...';
  document.body.appendChild(el);
}

function showNativeChatToast(msg, type) {
  const existing = document.getElementById("ql-native-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "ql-native-toast";
  toast.className = "ql-native-toast ql-native-toast-" + type;
  toast.textContent = qlUserText(msg);
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("ql-native-toast-visible"));
  setTimeout(() => {
    toast.classList.remove("ql-native-toast-visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function setupNativeChatButton() {
  const btn = document.getElementById("ql-native-chat-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    activateNativeChat();
  });
}

chrome.runtime.onMessage.addListener(function(msg, _sender, sendResponse) {
  if (msg && msg.action === "setShieldActive") {
    qlShieldActive = !!msg.active;
    if (qlShieldActive) injectShieldOverlay();
    else removeShieldOverlay();
    sendResponse({ ok: true });
    return false;
  }
  if (msg && msg.action === "setNativeChatActive") {
    if (msg.active) activateNativeChat();
    else deactivateNativeChat();
    sendResponse({ ok: true });
    return false;
  }
  if (msg && msg.action === "qlActivateNativeChat") {
    activateNativeChat();
    sendResponse({ ok: true });
    return false;
  }
  if (msg && msg.action === "qlDeactivateNativeChat") {
    deactivateNativeChat();
    sendResponse({ ok: true });
    return false;
  }
  if (msg && msg.action === "qlQuickProjectInit") {
    quickProjectInit()
      .then(function() { sendResponse({ ok: true }); })
      .catch(function(err) { sendResponse({ ok: false, error: err.message }); });
    return true;
  }
  if (msg && msg.action === "getNativeChatCapture") {
    sendResponse({ body: getNativeChatCaptureBody() });
    return false;
  }
  if (msg && msg.action === "requestTokenRefresh") {
    try { window.postMessage({ type: "lovableRequestToken" }, "*"); } catch (e) {}
    setTimeout(function() {
      try { window.postMessage({ type: "lovableRequestToken" }, "*"); } catch (e2) {}
    }, 120);
    sendResponse({ ok: true });
    return false;
  }
  if (msg && msg.action === "getSessionHeaders") {
    buildSessionHeaders(msg.projectId || "").then(function(headers) {
      sendResponse({ headers: headers });
    });
    return true;
  }
  if (msg && msg.action === "getLovableSession") {
    captureLovableSessionFromPage().then(function(session) {
      sendResponse(session);
    });
    return true;
  }
  if (msg && msg.action === "resolveLovableAuth") {
    captureLovableSessionFromPage().then(function(session) {
      if (session.ok) {
        sendResponse({
          token: session.token,
          cookieToken: session.token,
          projectId: session.projectId
        });
        return;
      }
      sendResponse({
        token: "",
        cookieToken: "",
        projectId: projectIdFromPage() || ""
      });
    });
    return true;
  }
});

// Check if native chat was active on page load
chrome.storage.local.get(["ql_native_chat"], (res) => {
  if (res.ql_native_chat === true) {
    qlNativeChatActive = true;
    try { document.documentElement.setAttribute("data-ql-native-chat", "1"); } catch (e) {}
    setTimeout(() => {
      const floatingBox = document.getElementById("ql-floating");
      if (floatingBox) floatingBox.style.display = "none";
      injectNativeChatOverlay();
    }, 500);
  }
});

window.addEventListener("message", (event)=>{
  if(!event.data || event.source !== window) return;
  if(event.data.type === "lovableBrowserSession" && event.data.browserSessionId){
    chrome.runtime.sendMessage({
      action: "lovableSync",
      browserSessionId: event.data.browserSessionId
    });
    return;
  }
  if(event.data.type !== "lovableTokenFound") return;
  const updates = {};
  if(event.data.token && typeof event.data.token === "string"){
    updates.lovable_token = event.data.token.replace(/^Bearer\s+/i, "").trim();
  }
  if(event.data.projectId && typeof event.data.projectId === "string"){
    updates.lovable_projectId = event.data.projectId;
  }
  if(!Object.keys(updates).length) return;
  chrome.runtime.sendMessage({ action: "lovableSync", token: updates.lovable_token, projectId: updates.lovable_projectId });
  chrome.storage.local.set(updates, ()=>{
    updateSyncStatus();
  });
});

window.addEventListener("message", function (event) {
  if (event.source !== window || !event.data) return;
  if (event.data.type === "pkNativeSendBlocked") {
    showNativeChatToast(event.data.error || "Powerkits is still initializing. Please wait.", "error");
  }
});

if (location.hostname && location.hostname.indexOf("lovable.dev") !== -1) {
  syncPkCreditBypassFromStorage();
  pkSetupProjectNameCapture();
}

(function initLovableAuthSync(){
  if (!location.hostname || location.hostname.indexOf("lovable.dev") === -1) return;
  function run() {
    chrome.runtime.sendMessage({
      action: "syncLovableAuth",
      tabUrl: location.href,
      projectId: projectIdFromPage()
    });
    try { window.postMessage({ type: "lovableRequestToken" }, "*"); } catch (e) {}
  }
  run();
  setInterval(run, 8000);
  document.addEventListener("visibilitychange", function() {
    if (!document.hidden) run();
  });
})();

function setupCreateProject() {
  var btn = document.getElementById('ql-quick-init') || document.getElementById('ql-create-project');
  if (!btn) return;
  btn.addEventListener('click', async function() {
    var statusEl = document.getElementById('ql-download-status');
    var originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Creating project...';
    if (statusEl) { statusEl.style.display = 'block'; statusEl.className = 'ql-log-info'; statusEl.textContent = 'Typing placeholder and clicking Build...'; }
    try {
      await quickProjectInit();
      if (statusEl) { statusEl.className = 'ql-log-success'; statusEl.textContent = '✅ Empty project created! Send your real prompt from the extension.'; }
      btn.textContent = '✅ Done!';
      setTimeout(function() {
        btn.disabled = false;
        btn.textContent = originalLabel;
        if (statusEl) statusEl.style.display = 'none';
      }, 5000);
    } catch(err) {
      console.error('[CreateProject]', err);
      if (statusEl) { statusEl.className = 'ql-log-error'; statusEl.textContent = '❌ ' + (err.message || 'Error'); }
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });
}

async function quickProjectInit() {
  if (window.location.pathname.match(/\/projects\/[a-f0-9-]{36}/i)) {
    throw new Error('Use this button on the Lovable home screen without a project open.');
  }

  const chatForm = document.querySelector('form#chat-input');
  if (!chatForm) throw new Error('Chat form not found. Make sure you are on the Lovable home screen.');

  const editor = chatForm.querySelector('[contenteditable="true"]');
  if (!editor) throw new Error('Text field not found.');

  const buildBtn = document.getElementById('chatinput-send-message-button');
  if (!buildBtn) throw new Error('Build button not found.');

  editor.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, '.');
  await new Promise(r => setTimeout(r, 300));

  if (buildBtn.disabled) buildBtn.removeAttribute('disabled');
  buildBtn.click();

  const stopped = await new Promise(function(resolve) {
    const TIMEOUT = 25000;
    const start = Date.now();
    const interval = setInterval(function() {
      if (Date.now() - start > TIMEOUT) {
        clearInterval(interval);
        resolve(false);
        return;
      }
      const stopBtn = document.querySelector('button[aria-label="Stop generating"]');
      if (stopBtn && !stopBtn.disabled) {
        clearInterval(interval);
        stopBtn.click();
        resolve(true);
      }
    }, 200);
  });

  if (!stopped) {
    throw new Error('Timeout waiting for Stop. Check whether a project was created in your list.');
  }
}
