import fs from "fs";
import path from "path";
import crypto from "crypto";
import { AuditLog, AuditLogAction, AuditLogSeverity, AdminRole } from "@/types";

function getAuditLogsStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_audit_logs.json");
  }
  return path.join(process.cwd(), ".data", "audit_logs.json");
}

function safeReadJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw || !raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJsonFile(filePath: string, data: unknown): void {
  const tmpPath = `${filePath}.${Date.now()}.${crypto.randomUUID()}.tmp`;
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch {}
  }
}

// Default Seed Audit Logs
const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log_init_security",
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    actorEmail: "owner@zovik.ai",
    actorRole: "super_admin",
    action: "PLAN_UPDATED",
    resourceType: "plans",
    resourceId: "plan_vip_monthly",
    details: "Updated VIP monthly plan rate to 400 PKR with 2x coin bonus multiplier.",
    severity: "info",
  },
  {
    id: "log_offer_welcome",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    actorEmail: "marketing@zovik.ai",
    actorRole: "marketing_admin",
    action: "OFFER_CREATED",
    resourceType: "offer",
    resourceId: "WELCOME50",
    details: "Created high-converting 50% discount coupon code 'WELCOME50'.",
    severity: "info",
  },
  {
    id: "log_banner_publish",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    actorEmail: "marketing@zovik.ai",
    actorRole: "marketing_admin",
    action: "BANNER_UPDATED",
    resourceType: "banner",
    details: "Published top countdown smart ticker for weekend festival.",
    severity: "info",
  },
  {
    id: "log_payment_review",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actorEmail: "support@zovik.ai",
    actorRole: "support_admin",
    action: "PAYMENT_APPROVED",
    resourceType: "payment",
    resourceId: "pay_jazzcash_01",
    details: "Verified screenshot and credited 500 coins to user wallet.",
    severity: "info",
  },
];

/**
 * Records an immutable audit log entry
 */
export async function recordAuditLog(
  entry: Omit<AuditLog, "id" | "timestamp"> & { timestamp?: string }
): Promise<AuditLog> {
  const filePath = getAuditLogsStoragePath();
  const logs = safeReadJsonFile<AuditLog[]>(filePath, DEFAULT_AUDIT_LOGS);

  const newLog: AuditLog = {
    id: `log_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    actorEmail: entry.actorEmail || "owner@zovik.ai",
    actorRole: entry.actorRole || "super_admin",
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    details: entry.details,
    ipAddress: entry.ipAddress,
    severity: entry.severity || "info",
  };

  // Prepend to show latest first
  logs.unshift(newLog);

  // Keep maximum 1,000 log entries on disk
  if (logs.length > 1000) {
    logs.length = 1000;
  }

  safeWriteJsonFile(filePath, logs);
  return newLog;
}

/**
 * Fetches audit logs with optional filtering
 */
export async function getAuditLogs(filter?: {
  action?: string;
  severity?: string;
  actor?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const filePath = getAuditLogsStoragePath();
  let logs = safeReadJsonFile<AuditLog[]>(filePath, DEFAULT_AUDIT_LOGS);

  if (filter?.action && filter.action !== "all") {
    logs = logs.filter((l) => l.action === filter.action);
  }

  if (filter?.severity && filter.severity !== "all") {
    logs = logs.filter((l) => l.severity === filter.severity);
  }

  if (filter?.actor) {
    const term = filter.actor.toLowerCase();
    logs = logs.filter(
      (l) => l.actorEmail.toLowerCase().includes(term) || l.actorRole.toLowerCase().includes(term)
    );
  }

  const limit = filter?.limit || 50;
  return logs.slice(0, limit);
}
