import fs from "fs";
import path from "path";
import crypto from "crypto";
import { AdminUser, AdminRole, AdminPermission } from "@/types";

function getAdminUsersStoragePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "zovik_admin_users.json");
  }
  return path.join(process.cwd(), ".data", "admin_users.json");
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

// Default Seed Admin Accounts
const DEFAULT_ADMIN_USERS: AdminUser[] = [
  {
    id: "adm_owner_primary",
    email: "owner@zovik.ai",
    name: "Master Owner",
    role: "super_admin",
    status: "active",
    avatar: "/characters/zovik_01.jpg",
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: "adm_support_lead",
    email: "support@zovik.ai",
    name: "Support Desk Lead",
    role: "support_admin",
    status: "active",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    invitedBy: "owner@zovik.ai",
  },
  {
    id: "adm_growth_marketer",
    email: "marketing@zovik.ai",
    name: "Growth & Events Lead",
    role: "marketing_admin",
    status: "active",
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    lastLoginAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    invitedBy: "owner@zovik.ai",
  },
];

// Role to Permissions Map
const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    "manage_settings",
    "manage_admins",
    "manage_payments",
    "manage_characters",
    "manage_events",
    "manage_offers",
    "manage_banners",
    "view_analytics",
    "export_data",
    "manage_fraud",
  ],
  support_admin: ["manage_payments", "manage_fraud", "view_analytics"],
  marketing_admin: [
    "manage_events",
    "manage_offers",
    "manage_banners",
    "view_analytics",
    "export_data",
  ],
};

/**
 * Checks if a given AdminRole has the requested permission
 */
export function hasPermission(role: AdminRole, permission: AdminPermission): boolean {
  if (role === "super_admin") return true;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Returns all configured admin team members
 */
export async function getAllAdminUsers(): Promise<AdminUser[]> {
  const filePath = getAdminUsersStoragePath();
  const admins = safeReadJsonFile<AdminUser[]>(filePath, DEFAULT_ADMIN_USERS);
  return admins;
}

/**
 * Saves or updates an admin team member
 */
export async function saveAdminUser(admin: Partial<AdminUser> & { email: string; role: AdminRole; name: string }): Promise<AdminUser> {
  const filePath = getAdminUsersStoragePath();
  const list = await getAllAdminUsers();

  const id = admin.id || `adm_${crypto.randomUUID().slice(0, 8)}`;
  const cleanEmail = admin.email.trim().toLowerCase();

  const existingIdx = list.findIndex((a) => a.id === id || a.email.toLowerCase() === cleanEmail);

  const updatedAdmin: AdminUser = {
    id: existingIdx >= 0 ? list[existingIdx].id : id,
    email: cleanEmail,
    name: admin.name.trim(),
    role: admin.role,
    status: admin.status || "active",
    avatar: admin.avatar || (existingIdx >= 0 ? list[existingIdx].avatar : undefined),
    createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : new Date().toISOString(),
    lastLoginAt: admin.lastLoginAt || (existingIdx >= 0 ? list[existingIdx].lastLoginAt : undefined),
    invitedBy: admin.invitedBy || (existingIdx >= 0 ? list[existingIdx].invitedBy : undefined),
  };

  if (existingIdx >= 0) {
    list[existingIdx] = updatedAdmin;
  } else {
    list.push(updatedAdmin);
  }

  safeWriteJsonFile(filePath, list);
  return updatedAdmin;
}

/**
 * Deletes or revokes a sub-admin. Super admin cannot be deleted.
 */
export async function deleteAdminUser(id: string): Promise<boolean> {
  const filePath = getAdminUsersStoragePath();
  const list = await getAllAdminUsers();
  const target = list.find((a) => a.id === id);

  if (!target) return false;
  if (target.role === "super_admin" && target.id === "adm_owner_primary") {
    throw new Error("Primary Super Admin account cannot be deleted.");
  }

  const filtered = list.filter((a) => a.id !== id);
  safeWriteJsonFile(filePath, filtered);
  return true;
}
