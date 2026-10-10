import fs from "fs";
import path from "path";

export interface DeletedUserRecord {
  id?: string;
  email?: string;
  deletedAt: string;
}

function getDeletedUsersPath(): string {
  const dir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "deleted_users.json");
}

function readDeletedUsers(): DeletedUserRecord[] {
  try {
    const file = getDeletedUsersPath();
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, "utf-8");
    if (!raw.trim()) return [];
    return JSON.parse(raw) as DeletedUserRecord[];
  } catch {
    return [];
  }
}

function writeDeletedUsers(records: DeletedUserRecord[]): void {
  try {
    const file = getDeletedUsersPath();
    fs.writeFileSync(file, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed writing deleted users registry:", err);
  }
}

/**
 * Permanently records a user UID / Email as deleted by administrator.
 */
export async function recordDeletedUser(id: string, email?: string): Promise<void> {
  const cleanId = (id || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanId && !cleanEmail) return;

  const current = readDeletedUsers();
  // Filter out duplicate if already exists
  const filtered = current.filter(
    (u) =>
      (!cleanId || u.id !== cleanId) &&
      (!cleanEmail || u.email?.toLowerCase() !== cleanEmail)
  );

  filtered.push({
    id: cleanId || undefined,
    email: cleanEmail || undefined,
    deletedAt: new Date().toISOString(),
  });

  writeDeletedUsers(filtered);
}

/**
 * Checks if a user has been deleted by administrator.
 */
export function isUserDeleted(id?: string, email?: string): boolean {
  const cleanId = (id || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanId && !cleanEmail) return false;

  const current = readDeletedUsers();
  return current.some(
    (u) =>
      (cleanId && u.id && u.id === cleanId) ||
      (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
  );
}

/**
 * Unmarks a tombstone when the user intentionally signs in afresh as a brand new account.
 */
export function removeDeletedUserTombstone(id?: string, email?: string): void {
  const cleanId = (id || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanId && !cleanEmail) return;

  const current = readDeletedUsers();
  const filtered = current.filter(
    (u) =>
      (!cleanId || u.id !== cleanId) &&
      (!cleanEmail || u.email?.toLowerCase() !== cleanEmail)
  );
  writeDeletedUsers(filtered);
}
