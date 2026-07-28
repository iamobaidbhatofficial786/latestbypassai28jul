/**
 * Lovable Powerkits — extension configuration
 */
var EXTENSION_NAME = "Lovable Powerkits";
var EXTENSION_VERSION = "6.7.9";

/** Single source for UI version labels (footer, badges). Keep in sync with manifest.json version. */
function extensionVersionShort() {
  return typeof EXTENSION_VERSION !== "undefined" ? String(EXTENSION_VERSION) : "0.0.0";
}

function extensionFooterBadge() {
  var name = typeof EXTENSION_NAME !== "undefined" ? String(EXTENSION_NAME) : "Lovable Powerkits";
  return name + " • v" + extensionVersionShort();
}

var POWERKITS_API_BASE = "https://lov.powerkits.net";
var POWERKITS_API_KEY = "pk_lov_ext_a8f3c21e9d4b7f0e6a2c5d8b1e4f7a0c";

/** @deprecated Use POWERKITS_* — kept for older script references */
var GRINGOW_API_BASE = POWERKITS_API_BASE;
var GRINGOW_API_KEY = POWERKITS_API_KEY;

/** Official Discord — support */
var DISCORD_SUPPORT_URL = "https://discord.gg/9ZBezyTEu5";

/** Emergency fallback only — normal sends must not use relay (credits). */
var PROXY_COMMAND_URL = POWERKITS_API_BASE + "/functions/v1/proxy-command";

/**
 * Prompt send strategy:
 * - "native" — fill Lovable chat + click Send (default)
 * - "websocket" — inject via pageHook WebSocket, fallback to native
 * - "relay" — server proxy-command (debug only; consumes credits)
 */
var SEND_STRATEGY = "native";

var POWERKITS_DEBUG = false;

/** Side panel only — no floating bubble on lovable.dev. */
var SIDE_PANEL_ONLY = true;

function powerkitsApiHeaders(extra) {
  var h = { apikey: POWERKITS_API_KEY };
  if (typeof EXTENSION_VERSION !== "undefined") {
    h["X-Extension-Version"] = String(EXTENSION_VERSION);
  }
  return Object.assign(h, extra || {});
}

function pkPageHookUrl() {
  return POWERKITS_API_BASE + "/functions/v1/page-hook";
}

function gringowApiHeaders(extra) {
  return powerkitsApiHeaders(extra);
}

/** Read Plan Mode toggle. */
function readPlanModeFromStorage(res) {
  res = res || {};
  return !!(res.ql_modo_plano || res.ql_license_mode || res.ql_modo_licença);
}

/** Persist Plan Mode. */
function writePlanModeToStorage(on, cb) {
  chrome.storage.local.set({ ql_modo_plano: !!on }, cb);
}

/** One-time migration to ql_modo_plano. */
function migratePlanModeStorageKeys(cb) {
  chrome.storage.local.get([
    "ql_modo_plano", "ql_license_mode", "ql_modo_licença",
    "ql_modo_plano_alert_dismissed", "ql_license_mode_alert_dismissed"
  ], function(res) {
    var patch = {};
    var on = readPlanModeFromStorage(res);
    if (on && res.ql_modo_plano !== true) patch.ql_modo_plano = true;
    var dismissed = !!(res.ql_modo_plano_alert_dismissed || res.ql_license_mode_alert_dismissed);
    if (dismissed && res.ql_modo_plano_alert_dismissed !== true) {
      patch.ql_modo_plano_alert_dismissed = true;
    }
    if (Object.keys(patch).length) {
      chrome.storage.local.set(patch, function() { if (cb) cb(on, dismissed); });
    } else if (cb) {
      cb(on, dismissed);
    }
  });
}

/** Page localStorage helpers. */
function pkPageStorageGet(suffix) {
  try {
    return localStorage.getItem("pk_" + suffix) || localStorage.getItem("gringow_" + suffix) || "";
  } catch (e) {
    return "";
  }
}

function pkPageStorageSet(suffix, value) {
  try {
    localStorage.setItem("pk_" + suffix, value);
  } catch (e) {}
}

/** Parse API expiry to epoch ms. */
function pkParseUtcExpiry(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && !isNaN(value)) return value;
  var s = String(value).trim();
  if (!s) return null;
  if (!/Z|[+-]\d{2}:?\d{2}$/.test(s)) {
    s = s.replace(" ", "T") + "Z";
  }
  var ms = Date.parse(s);
  return isNaN(ms) ? null : ms;
}
