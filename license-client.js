/**
 * Powerkits Licensing Client - Isolated Extension Module
 * Zero business logic changes to existing extension files.
 * Handles client device UUID, activation prompt modal, offline 72h grace period,
 * and background periodic heartbeats.
 */

(function () {
  var DEFAULT_SERVER_URL = "https://latestbypassai28jul.vercel.app";
  var GRACE_PERIOD_MS = 72 * 60 * 60 * 1000; // 72 Hours

  function getOrGenerateDeviceId() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(["ql_device_id"], function (res) {
        if (res.ql_device_id) {
          return resolve(res.ql_device_id);
        }
        var uuid = "dev_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        chrome.storage.local.set({ ql_device_id: uuid }, function () {
          resolve(uuid);
        });
      });
    });
  }

  function getLicenseState() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(
        ["ql_license_key", "ql_license_token", "ql_last_validated_at", "ql_license_status"],
        function (res) {
          resolve({
            key: res.ql_license_key || "",
            token: res.ql_license_token || "",
            lastValidatedAt: res.ql_last_validated_at || 0,
            status: res.ql_license_status || "UNACTIVATED",
          });
        }
      );
    });
  }

  async function activateLicense(key) {
    var deviceId = await getOrGenerateDeviceId();
    var extVersion = typeof EXTENSION_VERSION !== "undefined" ? EXTENSION_VERSION : "6.7.9";
    var res = await fetch(DEFAULT_SERVER_URL + "/api/v1/license/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: key,
        device_id: deviceId,
        extension_version: extVersion,
        metadata: { userAgent: navigator.userAgent },
      }),
    });
    var data = await res.json();
    if (res.ok && data.success) {
      await new Promise(function (resolve) {
        chrome.storage.local.set(
          {
            ql_license_key: key.trim().toUpperCase(),
            ql_license_token: data.token,
            ql_last_validated_at: Date.now(),
            ql_license_status: "ACTIVE",
          },
          resolve
        );
      });
      return { success: true };
    }
    return { success: false, error: data.error || "Activation failed." };
  }

  async function performHeartbeatOrValidate() {
    var state = await getLicenseState();
    if (!state.key || !state.token) return { valid: false, reason: "NO_LICENSE" };

    var deviceId = await getOrGenerateDeviceId();
    var extVersion = typeof EXTENSION_VERSION !== "undefined" ? EXTENSION_VERSION : "6.7.9";

    try {
      var res = await fetch(DEFAULT_SERVER_URL + "/api/v1/license/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: state.token,
          device_id: deviceId,
          extension_version: extVersion,
        }),
      });
      var data = await res.json();
      if (res.ok && data.success) {
        chrome.storage.local.set({
          ql_license_token: data.token,
          ql_last_validated_at: Date.now(),
          ql_license_status: "ACTIVE",
        });
        return { valid: true };
      } else {
        // Server explicitly rejected license (revoked, disabled, expired)
        chrome.storage.local.set({ ql_license_status: data.status || "INVALID" });
        return { valid: false, reason: data.error || "License invalid" };
      }
    } catch (e) {
      // Network unreachable — enforce 72-hour grace period policy
      var elapsed = Date.now() - state.lastValidatedAt;
      if (elapsed <= GRACE_PERIOD_MS) {
        return { valid: true, gracePeriod: true };
      }
      return { valid: false, reason: "Offline grace period expired (72h)." };
    }
  }

  function renderActivationModal() {
    if (document.getElementById("pk-license-modal-overlay")) return;

    var overlay = document.createElement("div");
    overlay.id = "pk-license-modal-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);z-index:999999;display:flex;align-items:center;justify-align:center;font-family:sans-serif;";

    var box = document.createElement("div");
    box.style.cssText =
      "background:#0f172a;border:1px solid #334155;border-radius:12px;padding:24px;width:100%;max-width:400px;color:#f8fafc;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);";

    box.innerHTML =
      '<h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#38bdf8;">Activate License Key</h2>' +
      '<p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">Enter your license key to activate Lovable Powerkits.</p>' +
      '<div id="pk-lic-err" style="display:none;margin-bottom:12px;padding:8px 12px;background:#450a0a;border:1px solid #991b1b;color:#fca5a5;font-size:12px;border-radius:6px;"></div>' +
      '<input id="pk-lic-input" type="text" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" style="width:100%;box-sizing:border-box;padding:10px;background:#1e293b;border:1px solid #475569;border-radius:6px;color:#fff;font-family:monospace;font-size:14px;margin-bottom:16px;text-transform:uppercase;">' +
      '<button id="pk-lic-submit" style="width:100%;padding:10px;background:#0284c7;border:none;border-radius:6px;color:#fff;font-weight:600;font-size:14px;cursor:pointer;">Activate License</button>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var input = document.getElementById("pk-lic-input");
    var btn = document.getElementById("pk-lic-submit");
    var err = document.getElementById("pk-lic-err");

    btn.addEventListener("click", async function () {
      var val = input.value.trim();
      if (!val) return;
      btn.innerText = "Activating...";
      btn.disabled = true;
      err.style.display = "none";

      var res = await activateLicense(val);
      if (res.success) {
        overlay.remove();
        if (typeof window !== "undefined" && window.location) {
          window.location.reload();
        }
      } else {
        btn.innerText = "Activate License";
        btn.disabled = false;
        err.innerText = res.error;
        err.style.display = "block";
      }
    });
  }

  // Manifest V3 Service Worker Persistent Background Heartbeat Alarm (Every 10 minutes)
  if (typeof chrome !== "undefined" && chrome.alarms) {
    chrome.alarms.create("ql_license_heartbeat_alarm", { periodInMinutes: 10 });
    chrome.alarms.onAlarm.addListener(function (alarm) {
      if (alarm.name === "ql_license_heartbeat_alarm") {
        performHeartbeatOrValidate();
      }
    });
  }

  var clientObj = {
    getOrGenerateDeviceId: getOrGenerateDeviceId,
    getLicenseState: getLicenseState,
    activateLicense: activateLicense,
    performHeartbeatOrValidate: performHeartbeatOrValidate,
    renderActivationModal: renderActivationModal,
  };

  if (typeof window !== "undefined") {
    window.LicenseClient = clientObj;
  } else if (typeof self !== "undefined") {
    self.LicenseClient = clientObj;
  }
})();
