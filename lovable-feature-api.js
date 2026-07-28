/**
 * Shared Lovable feature helpers (watermark, publish, cloud, create project).
 */
function pkSanitizeServerError(value) {
  if (value == null) return "";
  var s = String(value).trim();
  if (!s) return s;
  if (s.length > 200 && /<!DOCTYPE|<html|cloudflare|bad gateway|error code 502|error code 503/i.test(s)) {
    return "Service is temporarily unavailable. Try again in a few minutes.";
  }
  if (/^error code: 502$/i.test(s) || /^error code: 503$/i.test(s)) {
    return "Request timed out. Try again in a few minutes.";
  }
  if (/^Request failed \(HTTP 502\)$/i.test(s) || /^Request failed \(HTTP 503\)$/i.test(s)) {
    return "Service is temporarily unavailable. Try again in a few minutes.";
  }
  if (typeof translateUserMessage === "function") {
    return translateUserMessage(s);
  }
  return s;
}

function pkCreateProjectLink(data) {
  if (!data || data.success === false) return "";
  if (data.link) return String(data.link);
  if (data.url) return String(data.url);
  var id = data.project_id || data.id;
  if (id) return "https://lovable.dev/projects/" + String(id);
  return "";
}

function pkFeatureApiHeaders(extra) {
  return typeof powerkitsApiHeaders === "function"
    ? powerkitsApiHeaders(Object.assign({ "Content-Type": "application/json" }, extra || {}))
    : typeof gringowApiHeaders === "function"
      ? gringowApiHeaders(Object.assign({ "Content-Type": "application/json" }, extra || {}))
      : Object.assign({ apikey: typeof POWERKITS_API_KEY !== "undefined" ? POWERKITS_API_KEY : "" }, { "Content-Type": "application/json" }, extra || {});
}

/** Feature buttons: resolve JSON body even on HTTP 4xx (same UX as legacy store extension). */
function pkResolveFeatureBgFetch(resp) {
  if (!resp) {
    return { ok: false, error: "No response from background" };
  }
  var data = resp.data;
  if (data && typeof data === "object") {
    return { ok: true, data: data };
  }
  if (!resp.ok) {
    return { ok: false, error: "Fetch failed (" + resp.status + ")" };
  }
  return { ok: true, data: data };
}

function pkResolveVendorFeatureBgFetch(resp) {
  return pkResolveFeatureBgFetch(resp);
}

/** Edge request body: token_lovable, project_id */
function pkFeatureRequestBody(token, projectId, extra) {
  var body = {
    token_lovable: String(token || "").replace(/^Bearer\s+/i, "").trim()
  };
  if (projectId) {
    body.project_id = projectId;
  }
  return Object.assign(body, extra || {});
}

function pkVendorFeatureBody(token, projectId, extra) {
  return pkFeatureRequestBody(token, projectId, extra);
}

/** Single source — remove Lovable preview badge via native chat send (same path as Send button). */
var PK_WATERMARK_PROMPT =
  "Add this CSS to the project's global stylesheet (prefer src/index.css or index.css) so it applies on every page and in the published preview:\n\n" +
  "#lovable-badge,\n[id=\"lovable-badge\"],\na[href*=\"lovable.dev\"]:has(svg),\ndiv[class*=\"lovable\"][class*=\"badge\"] {\n" +
  "  display: none !important;\n  visibility: hidden !important;\n  opacity: 0 !important;\n  pointer-events: none !important;\n" +
  "  width: 0 !important;\n  height: 0 !important;\n  overflow: hidden !important;\n}\n\n" +
  "Remove or hide the entire floating \"Made with Lovable\" widget in the bottom-right corner, including its close (X) button. " +
  "Do not leave an empty box. CSS only — do not change app logic or routes.";

function pkGetWatermarkPrompt() {
  return PK_WATERMARK_PROMPT;
}

/** Same pre-checks as extension Send (project synced). */
function pkValidatePromptSendContext(projectIdFromPageFn) {
  return new Promise(function (resolve) {
    chrome.storage.local.get(["lovable_projectId"], function (sd) {
      var projectId = sd.lovable_projectId || "";
      if (typeof projectIdFromPageFn === "function") {
        projectId = projectIdFromPageFn() || projectId;
      }
      if (!projectId) {
        resolve({ ok: false, error: "Open lovable.dev on your project and wait for sync." });
        return;
      }
      resolve({ ok: true, projectId: projectId });
    });
  });
}
