import fs from "fs";
import path from "path";
import crypto from "crypto";
import { generateSystemBackupJson } from "./backupService";
import { recordAuditLog } from "./auditStore";

export interface SnapshotMeta {
  filename: string;
  filepath: string;
  timestamp: string;
  sizeBytes: number;
  checksum: string;
  trigger: "cron" | "manual" | "pre_deploy";
  recordCounts: Record<string, number>;
}

function getBackupsDirectory(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_backups");
  }
  return path.join(process.cwd(), ".data", "backups");
}

function safeEnsureDir(dir: string): void {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {}
}

/**
 * Creates an automated system backup snapshot and rotates older backups
 */
export async function createAutomatedSnapshot(
  trigger: "cron" | "manual" | "pre_deploy" = "manual"
): Promise<SnapshotMeta> {
  const dir = getBackupsDirectory();
  safeEnsureDir(dir);

  const backupData = await generateSystemBackupJson();
  const rawString = JSON.stringify(backupData, null, 2);

  // Compute cryptographic SHA-256 checksum for disaster verification
  const checksum = crypto.createHash("sha256").update(rawString).digest("hex");

  const isoTime = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `snapshot_${isoTime}_${trigger}.json`;
  const filepath = path.join(dir, filename);

  fs.writeFileSync(filepath, rawString, "utf-8");
  const stats = fs.statSync(filepath);

  const meta: SnapshotMeta = {
    filename,
    filepath,
    timestamp: new Date().toISOString(),
    sizeBytes: stats.size,
    checksum,
    trigger,
    recordCounts: backupData.metadata?.counts || {},
  };

  // Keep latest 7 snapshots, rotate older ones
  try {
    const allFiles = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith("snapshot_") && f.endsWith(".json"))
      .sort()
      .reverse();

    if (allFiles.length > 7) {
      const toDelete = allFiles.slice(7);
      for (const oldFile of toDelete) {
        try {
          fs.unlinkSync(path.join(dir, oldFile));
        } catch {}
      }
    }
  } catch {}

  // Record audit trail event
  await recordAuditLog({
    actorEmail: trigger === "cron" ? "cron_scheduler@zovik.ai" : "owner@zovik.ai",
    actorRole: "super_admin",
    action: "BACKUP_EXPORTED",
    resourceType: "disaster_recovery",
    resourceId: filename,
    details: `Automated disaster snapshot created (${trigger}). Checksum: ${checksum.slice(0, 12)}...`,
    severity: "info",
  });

  return meta;
}

/**
 * Lists all available automated backup snapshots
 */
export async function listAutomatedSnapshots(): Promise<SnapshotMeta[]> {
  const dir = getBackupsDirectory();
  safeEnsureDir(dir);

  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith("snapshot_") && f.endsWith(".json"))
      .sort()
      .reverse();

    const snapshots: SnapshotMeta[] = [];

    for (const f of files) {
      try {
        const fullPath = path.join(dir, f);
        const stats = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, "utf-8");
        const parsed = JSON.parse(content);
        const checksum = crypto.createHash("sha256").update(content).digest("hex");

        snapshots.push({
          filename: f,
          filepath: fullPath,
          timestamp: parsed.metadata?.exportedAt || stats.mtime.toISOString(),
          sizeBytes: stats.size,
          checksum,
          trigger: f.includes("_cron") ? "cron" : f.includes("_pre_deploy") ? "pre_deploy" : "manual",
          recordCounts: parsed.metadata?.counts || {},
        });
      } catch {}
    }

    return snapshots;
  } catch {
    return [];
  }
}

/**
 * Validates integrity of a snapshot by recalculating checksum and inspecting JSON structure
 */
export function verifySnapshotIntegrity(filename: string): { valid: boolean; checksum?: string; error?: string } {
  const dir = getBackupsDirectory();
  const targetPath = path.join(dir, path.basename(filename));

  if (!fs.existsSync(targetPath)) {
    return { valid: false, error: "Snapshot file does not exist." };
  }

  try {
    const content = fs.readFileSync(targetPath, "utf-8");
    const parsed = JSON.parse(content);
    if (!parsed.data || !parsed.metadata) {
      return { valid: false, error: "Snapshot payload missing required metadata or data roots." };
    }

    const checksum = crypto.createHash("sha256").update(content).digest("hex");
    return { valid: true, checksum };
  } catch (err: unknown) {
    return { valid: false, error: err instanceof Error ? err.message : "JSON corrupted." };
  }
}
