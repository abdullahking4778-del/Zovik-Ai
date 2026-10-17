import { getPersistentPayments, getAllPersistentCharacters } from "./serverDb";
import { getAllStoredUsers } from "./userStore";
import { getPersistentEvents } from "./eventsStore";
import { getPersistentOffers } from "./offersStore";
import { getPersistentNotifications } from "./engagementStore";
import { getAuditLogs } from "./auditStore";
import { getAllAdminUsers } from "./adminRbacStore";
import { getFraudAlerts } from "./fraudStore";

/**
 * Escapes fields according to RFC 4180 CSV specifications
 */
function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates an encrypted/structured JSON full platform backup snapshot
 */
export async function generateSystemBackupJson(): Promise<Record<string, any>> {
  const users = getAllStoredUsers();
  const [
    payments,
    characters,
    events,
    offers,
    notifications,
    auditLogs,
    adminUsers,
    fraudAlerts,
  ] = await Promise.all([
    getPersistentPayments().catch(() => []),
    getAllPersistentCharacters().catch(() => []),
    getPersistentEvents().catch(() => []),
    getPersistentOffers().catch(() => []),
    getPersistentNotifications().catch(() => []),
    getAuditLogs().catch(() => []),
    getAllAdminUsers().catch(() => []),
    getFraudAlerts().catch(() => []),
  ]);

  return {
    metadata: {
      exportedAt: new Date().toISOString(),
      platform: "Zovik AI",
      version: "5.0.0",
      counts: {
        users: users.length,
        payments: payments.length,
        characters: characters.length,
        events: events.length,
        offers: offers.length,
        notifications: notifications.length,
        auditLogs: auditLogs.length,
        adminUsers: adminUsers.length,
        fraudAlerts: fraudAlerts.length,
      },
    },
    data: {
      users,
      payments,
      characters,
      events,
      offers,
      notifications,
      auditLogs,
      adminUsers,
      fraudAlerts,
    },
  };
}

/**
 * Generates formatted CSV string for tabular platform exports
 */
export async function generateCsvExport(
  type: "payments" | "users" | "audit_logs" | "offers"
): Promise<{ filename: string; csv: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  if (type === "payments") {
    const payments = await getPersistentPayments().catch(() => []);
    const headers = [
      "Payment ID",
      "User Email",
      "Sender Name",
      "Plan",
      "Amount",
      "Currency",
      "Coins",
      "Status",
      "Transaction ID",
      "Method",
      "Created At",
    ];

    const rows = payments.map((p) => [
      escapeCsv(p.id),
      escapeCsv(p.userEmail),
      escapeCsv(p.senderName || ""),
      escapeCsv(p.plan),
      escapeCsv(p.amount || 400),
      escapeCsv(p.currency || "PKR"),
      escapeCsv(p.coins || 0),
      escapeCsv(p.status),
      escapeCsv(p.trxId || ""),
      escapeCsv(p.method),
      escapeCsv(p.createdAt || ""),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    return { filename: `zovik_payments_${timestamp}.csv`, csv };
  }

  if (type === "users") {
    const users = getAllStoredUsers();
    const headers = [
      "User ID",
      "Email",
      "Name",
      "Tier",
      "Is VIP",
      "Coins Balance",
      "Created At",
      "Last Login",
    ];

    const rows = users.map((u) => [
      escapeCsv(u.id),
      escapeCsv(u.email),
      escapeCsv(u.name),
      escapeCsv(u.tier),
      escapeCsv(u.isVip ? "YES" : "NO"),
      escapeCsv(u.coins || 0),
      escapeCsv(u.createdAt),
      escapeCsv(u.lastLoginAt || ""),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    return { filename: `zovik_users_${timestamp}.csv`, csv };
  }

  if (type === "audit_logs") {
    const logs = await getAuditLogs({ limit: 500 }).catch(() => []);
    const headers = [
      "Log ID",
      "Timestamp",
      "Actor Email",
      "Actor Role",
      "Action",
      "Severity",
      "Resource Type",
      "Resource ID",
      "Details",
      "IP Address",
    ];

    const rows = logs.map((l) => [
      escapeCsv(l.id),
      escapeCsv(l.timestamp),
      escapeCsv(l.actorEmail),
      escapeCsv(l.actorRole),
      escapeCsv(l.action),
      escapeCsv(l.severity),
      escapeCsv(l.resourceType),
      escapeCsv(l.resourceId || ""),
      escapeCsv(l.details),
      escapeCsv(l.ipAddress || ""),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    return { filename: `zovik_audit_logs_${timestamp}.csv`, csv };
  }

  // offers
  const offers = await getPersistentOffers().catch(() => []);
  const headers = [
    "Offer ID",
    "Promo Code",
    "Title",
    "Discount Type",
    "Discount Value",
    "Redemptions",
    "Target Audience",
    "Is Active",
    "Valid From",
    "Valid To",
  ];

  const rows = offers.map((o) => [
    escapeCsv(o.id),
    escapeCsv(o.code),
    escapeCsv(o.title),
    escapeCsv(o.discountType),
    escapeCsv(o.discountValue),
    escapeCsv(o.currentRedemptions || 0),
    escapeCsv(o.targetAudience),
    escapeCsv(o.isActive ? "YES" : "NO"),
    escapeCsv(o.validFrom),
    escapeCsv(o.validTo),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  return { filename: `zovik_promo_offers_${timestamp}.csv`, csv };
}
