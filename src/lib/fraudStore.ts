import fs from "fs";
import path from "path";
import crypto from "crypto";
import { FraudAlert, FraudAlertCategory, FraudAlertSeverity } from "@/types";
import { getPersistentPayments } from "./serverDb";
import { getAllStoredUsers } from "./userStore";

function getFraudAlertsStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_fraud_alerts.json");
  }
  return path.join(process.cwd(), ".data", "fraud_alerts.json");
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

// Seed baseline alerts
const DEFAULT_FRAUD_ALERTS: FraudAlert[] = [
  {
    id: "alert_trx_dup_jazz",
    category: "trx_duplicate",
    severity: "high",
    riskScore: 88,
    identifier: "TXN98273618",
    description: "Duplicate transaction ID reused across two different user submissions.",
    status: "open",
    occurrences: 2,
    firstDetectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    lastDetectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    recommendedAction: "Verify JazzCash SMS timestamp and reject second submission.",
  },
  {
    id: "alert_rapid_spam_bot",
    category: "rapid_chat_spam",
    severity: "medium",
    riskScore: 65,
    identifier: "guest_crawler_99",
    description: "Rapid message bursts detected (32 chat requests within 10 seconds).",
    status: "investigating",
    occurrences: 5,
    firstDetectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    lastDetectedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    recommendedAction: "Apply IP rate-limit throttle or temporary 10-minute cooldown.",
  },
];

/**
 * Returns all active and historical fraud alerts
 */
export async function getFraudAlerts(): Promise<FraudAlert[]> {
  const filePath = getFraudAlertsStoragePath();
  const alerts = safeReadJsonFile<FraudAlert[]>(filePath, DEFAULT_FRAUD_ALERTS);
  return alerts;
}

/**
 * Updates status of a fraud alert
 */
export async function updateFraudAlertStatus(
  id: string,
  status: "open" | "investigating" | "resolved" | "dismissed"
): Promise<FraudAlert | null> {
  const filePath = getFraudAlertsStoragePath();
  const alerts = await getFraudAlerts();
  const idx = alerts.findIndex((a) => a.id === id);

  if (idx < 0) return null;

  alerts[idx] = {
    ...alerts[idx],
    status,
    lastDetectedAt: new Date().toISOString(),
  };

  safeWriteJsonFile(filePath, alerts);
  return alerts[idx];
}

/**
 * Executes automated Watchdog security scan on live platform data
 */
export async function runFraudWatchdogScan(): Promise<FraudAlert[]> {
  const [payments, existingAlerts] = await Promise.all([
    getPersistentPayments().catch(() => []),
    getFraudAlerts(),
  ]);
  const users = getAllStoredUsers();

  const updatedAlerts = [...existingAlerts];

  // Rule 1: Duplicate Transaction ID Detection
  const trxMap = new Map<string, string[]>();
  for (const p of payments) {
    if (p.trxId && p.trxId.trim().length > 3) {
      const cleanTrx = p.trxId.trim().toUpperCase();
      const list = trxMap.get(cleanTrx) || [];
      list.push(p.userEmail || p.senderName || "Unknown");
      trxMap.set(cleanTrx, list);
    }
  }

  for (const [trx, emails] of trxMap.entries()) {
    if (emails.length > 1) {
      const alertId = `alert_dup_${trx}`;
      const existingIdx = updatedAlerts.findIndex((a) => a.identifier === trx);
      if (existingIdx >= 0) {
        updatedAlerts[existingIdx].occurrences = emails.length;
        updatedAlerts[existingIdx].lastDetectedAt = new Date().toISOString();
      } else {
        updatedAlerts.unshift({
          id: alertId,
          category: "trx_duplicate",
          severity: "high",
          riskScore: 92,
          identifier: trx,
          description: `Duplicate transaction ID '${trx}' used by ${emails.length} accounts: ${emails.slice(0, 2).join(", ")}.`,
          status: "open",
          occurrences: emails.length,
          firstDetectedAt: new Date().toISOString(),
          lastDetectedAt: new Date().toISOString(),
          recommendedAction: "Cross-check bank receipt and reject duplicated payment proofs.",
        });
      }
    }
  }

  // Rule 2: Multi-Account Coin Farm Detection
  const highCoinUsers = users.filter((u) => (u.coins || 0) > 10000 && !u.isVip);
  for (const u of highCoinUsers) {
    const alertId = `alert_coin_spike_${u.id}`;
    if (!updatedAlerts.some((a) => a.identifier === u.email)) {
      updatedAlerts.unshift({
        id: alertId,
        category: "abnormal_coin_velocity",
        severity: "medium",
        riskScore: 74,
        identifier: u.email,
        description: `Unusually high coin balance (${u.coins} coins) detected on non-VIP account.`,
        status: "open",
        occurrences: 1,
        firstDetectedAt: new Date().toISOString(),
        lastDetectedAt: new Date().toISOString(),
        recommendedAction: "Audit wallet transaction logs for unauthorized bonus exploitation.",
      });
    }
  }

  const filePath = getFraudAlertsStoragePath();
  safeWriteJsonFile(filePath, updatedAlerts);
  return updatedAlerts;
}
