"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  ShieldCheck,
  Smartphone,
  Activity,
  FileText,
  Settings,
  Plus,
  RefreshCw,
  LogOut,
  Search,
  Download,
  Moon,
  Sun,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Menu,
  X,
  PlusCircle,
  Trash2,
  Lock,
} from "lucide-react";

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState("licenses");
  const [darkMode, setDarkMode] = useState(true);

  // Dashboard Data
  const [stats, setStats] = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState("YEARLY");
  const [newMaxDevices, setNewMaxDevices] = useState(1);
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerNotes, setNewCustomerNotes] = useState("");
  const [createdKey, setCreatedKey] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadStats();
      if (activeTab === "licenses") loadLicenses();
      if (activeTab === "devices") loadDevices();
      if (activeTab === "logs") loadLogs();
      if (activeTab === "config") loadConfig();
    }
  }, [authenticated, activeTab, search]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/v1/admin/auth");
      if (res.ok) {
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
      }
    } catch (e) {
      setAuthenticated(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/v1/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuthenticated(true);
      } else {
        setLoginError(data.error || "Invalid credentials.");
      }
    } catch (e) {
      setLoginError("Login connection failed.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/v1/admin/auth", { method: "DELETE" });
    setAuthenticated(false);
  };

  const loadStats = async () => {
    const res = await fetch("/api/v1/admin/stats");
    if (res.ok) {
      const data = await res.json();
      setStats(data.stats);
    }
  };

  const loadLicenses = async () => {
    const res = await fetch(`/api/v1/admin/licenses?search=${encodeURIComponent(search)}`);
    if (res.ok) {
      const data = await res.json();
      setLicenses(data.licenses || []);
    }
  };

  const loadDevices = async () => {
    const res = await fetch("/api/v1/admin/devices");
    if (res.ok) {
      const data = await res.json();
      setDevices(data.devices || []);
    }
  };

  const loadLogs = async () => {
    const res = await fetch("/api/v1/admin/logs?limit=100");
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs || []);
    }
  };

  const loadConfig = async () => {
    const res = await fetch("/api/v1/admin/config");
    if (res.ok) {
      const data = await res.json();
      setConfig(data.config || {});
    }
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: newPlan,
          maxDevices: newMaxDevices,
          customerEmail: newCustomerEmail,
          customerNotes: newCustomerNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedKey(data.license.key);
        loadLicenses();
        loadStats();
      }
    } catch (e) {}
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    await fetch(`/api/v1/admin/licenses/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-status" }),
    });
    loadLicenses();
    loadStats();
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this license permanently?")) return;
    await fetch(`/api/v1/admin/licenses/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke" }),
    });
    loadLicenses();
    loadStats();
  };

  const handleExtend = async (id: string) => {
    await fetch(`/api/v1/admin/licenses/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extend", days: 30 }),
    });
    loadLicenses();
    loadStats();
  };

  const handleRemoveDevice = async (id: string) => {
    if (!confirm("Reset/Remove this device activation slot?")) return;
    await fetch(`/api/v1/admin/devices?id=${id}`, { method: "DELETE" });
    loadDevices();
    loadStats();
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/v1/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    alert("Configuration updated successfully!");
  };

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <RefreshCw className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
          <div className="flex items-center justify-center mb-6 space-x-2">
            <ShieldCheck className="w-8 h-8 text-blue-500" />
            <h1 className="text-xl font-bold tracking-tight">License System Admin</h1>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-800/80 text-red-200 text-sm rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@powerkits.net"
                className="w-full px-3 py-2 bg-slate-850 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-semibold rounded-lg text-sm transition-all shadow-lg shadow-blue-600/20"
            >
              Sign In to Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"} flex flex-col`}>
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
            <span className="font-bold tracking-wide text-lg">Powerkits Admin</span>
            <span className="text-xs px-2 py-0.5 bg-blue-950 border border-blue-800 text-blue-400 rounded-full font-mono">v1.0.0</span>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={handleLogout} className="flex items-center space-x-1 text-sm text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg hover:bg-red-950/40">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-400">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className={`w-full md:w-64 space-y-1 ${mobileMenuOpen ? "block" : "hidden md:block"}`}>
          <button
            onClick={() => setActiveTab("licenses")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "licenses" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-slate-800/60 text-slate-400"
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Licenses</span>
          </button>
          <button
            onClick={() => setActiveTab("devices")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "devices" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-slate-800/60 text-slate-400"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Devices</span>
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "logs" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-slate-800/60 text-slate-400"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Activity Logs</span>
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "config" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-slate-800/60 text-slate-400"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configuration</span>
          </button>

          <div className="pt-4 mt-6 border-t border-slate-800 space-y-2">
            <a
              href="/api/v1/admin/export?target=licenses&format=csv"
              className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <Download className="w-4 h-4" />
              <span>Export Licenses (CSV)</span>
            </a>
            <a
              href="/api/v1/admin/export?target=logs&format=json"
              className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <FileText className="w-4 h-4" />
              <span>Export Logs (JSON)</span>
            </a>
          </div>
        </aside>

        {/* Main Panel Content */}
        <main className="flex-1 space-y-6">
          {/* Stats Bar */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 font-medium">Active Licenses</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.activeLicenses}</div>
                <div className="text-xs text-slate-500 mt-1">Total: {stats.totalLicenses}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 font-medium">Active Devices</div>
                <div className="text-2xl font-bold text-blue-400 mt-1">{stats.totalDevices}</div>
                <div className="text-xs text-slate-500 mt-1">Registered slots</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 font-medium">Heartbeats & Checks</div>
                <div className="text-2xl font-bold text-purple-400 mt-1">{stats.totalHeartbeats}</div>
                <div className="text-xs text-slate-500 mt-1">Activations: {stats.totalActivations}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 font-medium">Blocked Attempts</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">{stats.totalFailedAttempts}</div>
                <div className="text-xs text-slate-500 mt-1">Expired / Revoked</div>
              </div>
            </div>
          )}

          {/* Tab: Licenses */}
          {activeTab === "licenses" && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by key, customer email, notes..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 font-semibold rounded-lg text-sm transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Generate License</span>
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-950/40">
                      <th className="py-3 px-3">License Key</th>
                      <th className="py-3 px-3">Plan</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Devices</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Expires</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {licenses.map((lic) => (
                      <tr key={lic.id} className="hover:bg-slate-800/30 font-mono text-xs">
                        <td className="py-3 px-3 font-semibold text-blue-300">{lic.key}</td>
                        <td className="py-3 px-3 font-sans">
                          <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs">
                            {lic.plan}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              lic.status === "ACTIVE"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : lic.status === "DISABLED"
                                ? "bg-amber-950 text-amber-400 border border-amber-800"
                                : "bg-red-950 text-red-400 border border-red-800"
                            }`}
                          >
                            {lic.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-sans">
                          {lic.devices?.length || 0} / {lic.maxDevices}
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-300">{lic.customerEmail || "N/A"}</td>
                        <td className="py-3 px-3 font-sans text-slate-400">
                          {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : "Never (Lifetime)"}
                        </td>
                        <td className="py-3 px-3 font-sans text-right space-x-2">
                          <button
                            onClick={() => handleToggleStatus(lic.id, lic.status)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-medium text-slate-300"
                          >
                            {lic.status === "ACTIVE" ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => handleExtend(lic.id)}
                            className="px-2 py-1 bg-blue-950 hover:bg-blue-900 border border-blue-800 rounded text-xs font-medium text-blue-300"
                          >
                            +30 Days
                          </button>
                          <button
                            onClick={() => handleRevoke(lic.id)}
                            className="px-2 py-1 bg-red-950 hover:bg-red-900 border border-red-800 rounded text-xs font-medium text-red-300"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Devices */}
          {activeTab === "devices" && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-lg">Active Device Registrations</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-950/40">
                      <th className="py-3 px-3">Device ID</th>
                      <th className="py-3 px-3">License Key</th>
                      <th className="py-3 px-3">Ext Version</th>
                      <th className="py-3 px-3">Last Seen</th>
                      <th className="py-3 px-3 text-right">Reset Slot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {devices.map((dev) => (
                      <tr key={dev.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 text-slate-300">{dev.deviceId}</td>
                        <td className="py-3 px-3 text-blue-400">{dev.license?.key || "N/A"}</td>
                        <td className="py-3 px-3 font-sans text-slate-400">{dev.extensionVersion || "v6.7.9"}</td>
                        <td className="py-3 px-3 font-sans text-slate-400">{new Date(dev.lastSeenAt).toLocaleString()}</td>
                        <td className="py-3 px-3 font-sans text-right">
                          <button
                            onClick={() => handleRemoveDevice(dev.id)}
                            className="px-2 py-1 bg-red-950 hover:bg-red-900 border border-red-800 rounded text-xs text-red-300 flex items-center ml-auto space-x-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Logs */}
          {activeTab === "logs" && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-lg">System Activity & Security Logs</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-950/40">
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3">Action</th>
                      <th className="py-3 px-3">License Key</th>
                      <th className="py-3 px-3">Device ID</th>
                      <th className="py-3 px-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-sans text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="py-3 px-3 font-sans font-semibold text-blue-400">{log.action}</td>
                        <td className="py-3 px-3 text-slate-300">{log.license?.key || "-"}</td>
                        <td className="py-3 px-3 text-slate-400">{log.deviceId || "-"}</td>
                        <td className="py-3 px-3 font-sans text-slate-400">{log.details || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Configuration */}
          {activeTab === "config" && (
            <form onSubmit={handleSaveConfig} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-lg">Extension Version & Grace Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Minimum Extension Version</label>
                  <input
                    type="text"
                    value={config.min_extension_version || "6.0.0"}
                    onChange={(e) => setConfig({ ...config, min_extension_version: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Latest Extension Version</label>
                  <input
                    type="text"
                    value={config.latest_extension_version || "6.7.9"}
                    onChange={(e) => setConfig({ ...config, latest_extension_version: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                  />
                </div>
              </div>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 font-semibold rounded-lg text-sm">
                Save System Settings
              </button>
            </form>
          )}
        </main>
      </div>

      {/* Create License Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Generate Manual License Key</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdKey ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-lg space-y-3">
                <div className="text-xs font-semibold text-emerald-400">License Generated Successfully!</div>
                <div className="font-mono text-lg font-bold text-white bg-slate-950 p-2 rounded text-center select-all border border-slate-800">
                  {createdKey}
                </div>
                <button
                  onClick={() => {
                    setCreatedKey("");
                    setCreateModalOpen(false);
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateLicense} className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Select Plan</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                  >
                    <option value="MONTHLY">Monthly (1 Month)</option>
                    <option value="QUARTERLY">Quarterly (3 Months)</option>
                    <option value="YEARLY">Yearly (1 Year)</option>
                    <option value="LIFETIME">Lifetime</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Max Devices Allowed</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newMaxDevices}
                    onChange={(e) => setNewMaxDevices(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Customer Email (Optional)</label>
                  <input
                    type="email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Notes / Sales Reference</label>
                  <input
                    type="text"
                    value={newCustomerNotes}
                    onChange={(e) => setNewCustomerNotes(e.target.value)}
                    placeholder="Manual sale via Telegram"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-semibold rounded-lg">
                  Generate Secure Key
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
