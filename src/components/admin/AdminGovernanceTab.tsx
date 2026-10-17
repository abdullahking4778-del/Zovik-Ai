"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
  FileText,
  AlertTriangle,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  X,
  Lock,
} from "lucide-react";
import { AdminUser, AdminRole, AuditLog, FraudAlert } from "@/types";

interface AdminGovernanceTabProps {
  getAuthHeaders: () => Record<string, string>;
}

export default function AdminGovernanceTab({ getAuthHeaders }: AdminGovernanceTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"team" | "audit" | "fraud" | "export">("team");

  // State: Team
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("support_admin");
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  // State: Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditSeverity, setAuditSeverity] = useState("all");

  // State: Fraud Watchdog
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [isScanningFraud, setIsScanningFraud] = useState(false);

  // State: Loading & Export
  const [loading, setLoading] = useState(true);
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchGovernanceData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [adminsRes, auditRes, fraudRes] = await Promise.all([
        fetch("/api/admin/governance/admins", { headers, cache: "no-store" }),
        fetch("/api/admin/governance/audit", { headers, cache: "no-store" }),
        fetch("/api/admin/governance/fraud", { headers, cache: "no-store" }),
      ]);

      if (adminsRes.ok) {
        const json = await adminsRes.json();
        if (json.success && Array.isArray(json.admins)) setAdmins(json.admins);
      }
      if (auditRes.ok) {
        const json = await auditRes.json();
        if (json.success && Array.isArray(json.logs)) setAuditLogs(json.logs);
      }
      if (fraudRes.ok) {
        const json = await fraudRes.json();
        if (json.success && Array.isArray(json.alerts)) setFraudAlerts(json.alerts);
      }
    } catch (e) {
      console.error("[AdminGovernanceTab] Load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGovernanceData();
  }, []);

  const showToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Add / Invite Admin
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    setIsSubmittingAdmin(true);
    try {
      const res = await fetch("/api/admin/governance/admins", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`Admin account for '${inviteName}' saved successfully.`);
        setShowInviteModal(false);
        setInviteName("");
        setInviteEmail("");
        setInviteRole("support_admin");
        fetchGovernanceData();
      } else {
        alert(json.error || "Failed to save admin user.");
      }
    } catch {
      alert("Network error saving admin user.");
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  // Remove Admin
  const handleDeleteAdmin = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${name}?`)) return;

    try {
      const res = await fetch(`/api/admin/governance/admins?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`Revoked access for '${name}'.`);
        fetchGovernanceData();
      } else {
        alert(json.error || "Failed to remove admin.");
      }
    } catch {
      alert("Network error removing admin.");
    }
  };

  // Run Fraud Watchdog Scan
  const handleRunFraudScan = async () => {
    setIsScanningFraud(true);
    try {
      const res = await fetch("/api/admin/governance/fraud", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFraudAlerts(json.alerts || []);
        showToast("Fraud & Anti-Abuse deep scan completed.");
      }
    } catch {
      alert("Failed to run fraud scan.");
    } finally {
      setIsScanningFraud(false);
    }
  };

  // Update Fraud Alert Status
  const handleUpdateFraudStatus = async (alertId: string, status: "resolved" | "dismissed") => {
    try {
      const res = await fetch("/api/admin/governance/fraud", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: alertId, status }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`Alert marked as ${status}.`);
        fetchGovernanceData();
      }
    } catch {
      alert("Failed to update fraud alert.");
    }
  };

  // Handle CSV / JSON Download
  const handleExportDownload = async (type: "full_backup" | "payments" | "users" | "audit_logs" | "offers") => {
    setExportingType(type);
    try {
      const res = await fetch(`/api/admin/governance/export?type=${type}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Export download failed.");

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = `zovik_${type}_export.${type === "full_backup" ? "json" : "csv"}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showToast(`Export '${filename}' downloaded successfully.`);
    } catch (err: unknown) {
      alert("Failed to export data: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setExportingType(null);
    }
  };

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesSearch =
      auditSearch === "" ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.actorEmail.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase());
    const matchesSeverity = auditSeverity === "all" || log.severity === auditSeverity;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              Phase 5 Governance
            </span>
            <span className="text-xs text-white/80 font-bold">
              {admins.length} Admins • {fraudAlerts.length} Security Alerts
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Operations, Security & Governance</h2>
          <p className="text-xs text-[#aeaeae]">
            Multi-admin role delegation, immutable audit logging, fraud watchdog, and data backup snapshots.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchGovernanceData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
          <CheckCircle className="size-4 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 4-in-1 Sub-navigation Bar */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab("team")}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeSubTab === "team"
              ? "bg-[#f53b70] text-white shadow-lg shadow-pink-500/20"
              : "text-[#aeaeae] hover:text-white"
          }`}
        >
          <Users className="size-3.5" />
          <span>Admin Team & Roles ({admins.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("audit")}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeSubTab === "audit"
              ? "bg-[#f53b70] text-white shadow-lg shadow-pink-500/20"
              : "text-[#aeaeae] hover:text-white"
          }`}
        >
          <FileText className="size-3.5" />
          <span>Immutable Audit Logs ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("fraud")}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeSubTab === "fraud"
              ? "bg-[#f53b70] text-white shadow-lg shadow-pink-500/20"
              : "text-[#aeaeae] hover:text-white"
          }`}
        >
          <ShieldAlert className="size-3.5" />
          <span>Anti-Abuse Watchdog ({fraudAlerts.filter((a) => a.status === "open").length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("export")}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-all ${
            activeSubTab === "export"
              ? "bg-[#f53b70] text-white shadow-lg shadow-pink-500/20"
              : "text-[#aeaeae] hover:text-white"
          }`}
        >
          <Download className="size-3.5" />
          <span>Backup & Data Export 💾</span>
        </button>
      </div>

      {/* SUB-TAB 1: ADMIN TEAM & ROLES (RBAC) */}
      {activeSubTab === "team" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <ShieldCheck className="size-5 text-emerald-400" />
                <span>Admin Team & Role-Based Access Control</span>
              </h3>
              <p className="text-xs text-[#aeaeae]">
                Assign least-privilege roles to team members to keep billing accounts safe.
              </p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] hover:brightness-110 text-white text-xs font-black shadow-lg shadow-pink-600/20"
            >
              <UserPlus className="size-3.5" />
              <span>Add Sub-Admin</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="p-5 rounded-2xl bg-[#140b1c]/90 border border-white/10 space-y-4 hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="size-10 rounded-xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center font-bold text-white">
                        {admin.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">{admin.name}</h4>
                        <p className="text-xs text-[#aeaeae] font-mono">{admin.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Role Badge & Capabilities */}
                  <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#aeaeae] uppercase font-bold">Role:</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          admin.role === "super_admin"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : admin.role === "support_admin"
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        }`}
                      >
                        {admin.role === "super_admin"
                          ? "👑 Super Admin"
                          : admin.role === "support_admin"
                          ? "🎧 Support Admin"
                          : "📢 Marketing Admin"}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#aeaeae]">
                      {admin.role === "super_admin"
                        ? "Full root control over master password, payments, database and characters."
                        : admin.role === "support_admin"
                        ? "Allowed to review payments, inspect user chat quotas, and resolve fraud alerts."
                        : "Allowed to create events, promo codes, banners, and character drops."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] text-[#aeaeae]">
                  <span>Added {new Date(admin.createdAt).toLocaleDateString()}</span>
                  {admin.id !== "adm_owner_primary" && (
                    <button
                      onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                      className="text-rose-400 hover:text-rose-300 font-bold flex items-center space-x-1"
                    >
                      <Trash2 className="size-3" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: IMMUTABLE AUDIT LOGS */}
      {activeSubTab === "audit" && (
        <div className="p-6 rounded-3xl bg-[#140b1c]/80 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <FileText className="size-5 text-indigo-400" />
                <span>Immutable Admin Audit Trail</span>
              </h3>
              <p className="text-xs text-[#aeaeae]">
                Permanent cryptographic ledger of all sensitive admin mutations.
              </p>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="size-3.5 absolute left-3 top-3 text-[#888]" />
                <input
                  type="text"
                  placeholder="Search logs by actor or details..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-[#f53b70]"
                />
              </div>

              <select
                value={auditSeverity}
                onChange={(e) => setAuditSeverity(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-[#f53b70]"
              >
                <option value="all">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[#aeaeae] uppercase tracking-wider text-[10px]">
                  <th className="pb-3 pl-2">Timestamp</th>
                  <th className="pb-3">Actor & Role</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Details</th>
                  <th className="pb-3 text-right pr-2">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#888]">
                      No audit log entries matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 pl-2 text-[#aeaeae] font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className="font-bold text-white block">{log.actorEmail}</span>
                        <span className="text-[10px] text-[#888] font-mono uppercase">{log.actorRole}</span>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[10px] text-pink-400 font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 text-white/90 max-w-md">{log.details}</td>
                      <td className="py-3 text-right pr-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            log.severity === "critical"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : log.severity === "warning"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ANTI-ABUSE WATCHDOG */}
      {activeSubTab === "fraud" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <ShieldAlert className="size-5 text-rose-400" />
                <span>Anti-Abuse & Fraud Watchdog Radar</span>
              </h3>
              <p className="text-xs text-[#aeaeae]">
                Automated detection of duplicate payment slips, multi-account coin farmers, and spammers.
              </p>
            </div>

            <button
              onClick={handleRunFraudScan}
              disabled={isScanningFraud}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isScanningFraud ? "animate-spin" : ""}`} />
              <span>{isScanningFraud ? "Scanning..." : "Run Watchdog Scan"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fraudAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-5 rounded-2xl bg-[#140b1c]/90 border border-white/10 space-y-4 hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`size-2.5 rounded-full ${
                          alert.severity === "high" || alert.severity === "critical"
                            ? "bg-rose-500 animate-ping"
                            : "bg-amber-500"
                        }`}
                      />
                      <span className="text-xs font-black uppercase text-white font-mono">
                        {alert.category.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-black">
                        Risk Score: {alert.riskScore}%
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          alert.status === "open"
                            ? "bg-rose-500/20 text-rose-400"
                            : alert.status === "investigating"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {alert.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-white/90 mt-3 font-medium">{alert.description}</p>
                  <p className="text-[11px] text-[#aeaeae] mt-1">
                    Identifier: <span className="font-mono text-pink-400 font-bold">{alert.identifier}</span> ({alert.occurrences} detections)
                  </p>

                  <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-[#aeaeae]">
                    💡 <span className="text-white font-bold">Recommended:</span> {alert.recommendedAction}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                  <span className="text-[10px] text-[#888]">
                    Last seen {new Date(alert.lastDetectedAt).toLocaleTimeString()}
                  </span>

                  {alert.status === "open" && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdateFraudStatus(alert.id, "resolved")}
                        className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold transition-colors"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleUpdateFraudStatus(alert.id, "dismissed")}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#aeaeae] text-[10px] font-bold transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: BACKUP & DATA EXPORT */}
      {activeSubTab === "export" && (
        <div className="p-6 rounded-3xl bg-[#140b1c]/80 border border-white/10 space-y-6">
          <div>
            <h3 className="text-lg font-black text-white flex items-center space-x-2">
              <Download className="size-5 text-emerald-400" />
              <span>Automated Database Backup & CSV Export Center</span>
            </h3>
            <p className="text-xs text-[#aeaeae]">
              Export production data for offline reporting, accounting audits, and emergency disaster recovery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Full Platform Snapshot */}
            <div className="p-5 rounded-2xl bg-black/40 border border-emerald-500/20 flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all">
              <div>
                <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                  <Download className="size-5" />
                </div>
                <h4 className="text-sm font-black text-white">Full Platform Snapshot (JSON)</h4>
                <p className="text-xs text-[#aeaeae] mt-1">
                  Complete archive of Users, Payments, Characters, Events, Offers, and System Configurations.
                </p>
              </div>
              <button
                onClick={() => handleExportDownload("full_backup")}
                disabled={Boolean(exportingType)}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:brightness-110 text-white text-xs font-black shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {exportingType === "full_backup" ? "Exporting..." : "Download Full JSON Snapshot"}
              </button>
            </div>

            {/* Payments CSV */}
            <div className="p-5 rounded-2xl bg-black/40 border border-sky-500/20 flex flex-col justify-between space-y-4 hover:border-sky-500/40 transition-all">
              <div>
                <div className="size-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3">
                  <FileText className="size-5" />
                </div>
                <h4 className="text-sm font-black text-white">Payments & Revenue Ledger (CSV)</h4>
                <p className="text-xs text-[#aeaeae] mt-1">
                  Standard RFC 4180 CSV with Transaction IDs, JazzCash/Easypaisa amounts, and approvals.
                </p>
              </div>
              <button
                onClick={() => handleExportDownload("payments")}
                disabled={Boolean(exportingType)}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:brightness-110 text-white text-xs font-black shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
              >
                {exportingType === "payments" ? "Exporting..." : "Download Payments CSV"}
              </button>
            </div>

            {/* Users CSV */}
            <div className="p-5 rounded-2xl bg-black/40 border border-purple-500/20 flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition-all">
              <div>
                <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
                  <Users className="size-5" />
                </div>
                <h4 className="text-sm font-black text-white">User Accounts & Balances (CSV)</h4>
                <p className="text-xs text-[#aeaeae] mt-1">
                  Registered emails, VIP subscription statuses, wallet coin balances, and join dates.
                </p>
              </div>
              <button
                onClick={() => handleExportDownload("users")}
                disabled={Boolean(exportingType)}
                className="w-full py-2.5 rounded-xl bg-purple-500 hover:brightness-110 text-white text-xs font-black shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
              >
                {exportingType === "users" ? "Exporting..." : "Download Users CSV"}
              </button>
            </div>

            {/* Audit Logs CSV */}
            <div className="p-5 rounded-2xl bg-black/40 border border-pink-500/20 flex flex-col justify-between space-y-4 hover:border-pink-500/40 transition-all">
              <div>
                <div className="size-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-3">
                  <FileText className="size-5" />
                </div>
                <h4 className="text-sm font-black text-white">Immutable Audit Trail (CSV)</h4>
                <p className="text-xs text-[#aeaeae] mt-1">
                  Every admin operation with actor, action, timestamp, and severity for external audits.
                </p>
              </div>
              <button
                onClick={() => handleExportDownload("audit_logs")}
                disabled={Boolean(exportingType)}
                className="w-full py-2.5 rounded-xl bg-[#f53b70] hover:brightness-110 text-white text-xs font-black shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50"
              >
                {exportingType === "audit_logs" ? "Exporting..." : "Download Audit Logs CSV"}
              </button>
            </div>

            {/* Promo Redemptions CSV */}
            <div className="p-5 rounded-2xl bg-black/40 border border-amber-500/20 flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-all">
              <div>
                <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                  <FileText className="size-5" />
                </div>
                <h4 className="text-sm font-black text-white">Promo Codes & Offers (CSV)</h4>
                <p className="text-xs text-[#aeaeae] mt-1">
                  Coupon usage statistics, discount percentages, caps, and validity windows.
                </p>
              </div>
              <button
                onClick={() => handleExportDownload("offers")}
                disabled={Boolean(exportingType)}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:brightness-110 text-white text-xs font-black shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {exportingType === "offers" ? "Exporting..." : "Download Promo Codes CSV"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Invite Sub-Admin Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#140b1c] border border-white/10 p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="size-10 rounded-xl bg-[#f53b70]/20 flex items-center justify-center text-[#f53b70]">
                <UserPlus className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Add Sub-Admin</h3>
                <p className="text-xs text-[#aeaeae]">Grant delegated role permissions</p>
              </div>
            </div>

            <form onSubmit={handleSaveAdmin} className="space-y-4">
              <div>
                <label className="text-[10px] text-[#aeaeae] uppercase font-bold block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ali Ahmed"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-[#f53b70]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#aeaeae] uppercase font-bold block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ali@zovik.ai"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-[#f53b70]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#aeaeae] uppercase font-bold block mb-1">
                  Assigned Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-[#f53b70]"
                >
                  <option value="support_admin">Support Admin (Payments, Quotas, Fraud)</option>
                  <option value="marketing_admin">Marketing Admin (Events, Offers, Drops, Banners)</option>
                  <option value="super_admin">Super Admin (Full Root Permissions)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdmin}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#f53b70] to-[#8b5cf6] text-xs font-black text-white hover:brightness-110 shadow-lg shadow-pink-600/30 disabled:opacity-50"
                >
                  {isSubmittingAdmin ? "Saving..." : "Save Admin User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
