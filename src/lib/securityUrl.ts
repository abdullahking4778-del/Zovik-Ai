import dns from "dns";

/**
 * Security utility to prevent Server-Side Request Forgery (SSRF) and DNS Rebinding.
 * Validates external URLs before server-side fetching.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254", // AWS/GCP/Azure instance metadata
  "metadata.google.internal",
  "instance-data",
]);

/**
 * Checks if an IP string belongs to private, loopback, or link-local ranges.
 */
export function isPrivateIpAddress(ip: string): boolean {
  if (!ip) return true;

  // IPv4 Private & Reserved Ranges:
  // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16, 0.0.0.0/8
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = ip.match(ipv4Regex);
  if (ipMatch) {
    const [_, a, b] = ipMatch.map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    return false;
  }

  // IPv6 & IPv4-mapped IPv6 normalization
  const cleanIpv6 = ip.replace(/[\[\]]/g, "").toLowerCase().trim();

  // IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1, ::ffff:169.254.169.254)
  if (cleanIpv6.startsWith("::ffff:") || cleanIpv6.startsWith("ffff:")) {
    const mappedIpv4 = cleanIpv6.replace(/^::?ffff:/, "");
    return isPrivateIpAddress(mappedIpv4);
  }

  // IPv6 Loopback & Private / Link-Local / Unique-Local:
  // ::1, 0:0:0:0:0:0:0:1, fe80::/10, fc00::/7, fd00::/8
  if (
    cleanIpv6 === "::1" ||
    cleanIpv6 === "::" ||
    cleanIpv6 === "0:0:0:0:0:0:0:1" ||
    cleanIpv6 === "0:0:0:0:0:0:0:0" ||
    cleanIpv6.startsWith("fe80:") ||
    cleanIpv6.startsWith("fc00:") ||
    cleanIpv6.startsWith("fd00:")
  ) {
    return true;
  }

  return false;
}

/**
 * Synchronous URL format and hostname pre-validation.
 */
export function isSafeExternalUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;

  try {
    const parsed = new URL(rawUrl);

    // 1. Only allow standard HTTP & HTTPS protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    // 2. Reject credentials in URLs (e.g. http://user:pass@host)
    if (parsed.username || parsed.password) {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // 3. Block well-known internal hostnames
    if (BLOCKED_HOSTNAMES.has(host)) {
      return false;
    }

    // 4. Block local/internal top-level domains
    if (
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".lan") ||
      host.endsWith(".home") ||
      host.endsWith(".arpa")
    ) {
      return false;
    }

    // 5. Block private IPv4 ranges if hostname is an IP
    if (isPrivateIpAddress(host)) {
      return false;
    }

    // 6. Block IPv6 loopback and private address notations
    if (host.startsWith("[") || host.includes(":")) {
      const cleanIpv6 = host.replace(/[\[\]]/g, "");
      if (isPrivateIpAddress(cleanIpv6)) {
        return false;
      }
    }

    // 7. Allowed ports only: 80, 443, 8080, 8443 or default
    if (parsed.port && !["80", "443", "8080", "8443"].includes(parsed.port)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Asynchronous validation that resolves hostnames via DNS lookup
 * to prevent DNS Rebinding attacks (where a public domain points to 127.0.0.1 or cloud metadata).
 */
export async function isSafeResolvedUrl(rawUrl: string): Promise<boolean> {
  if (!isSafeExternalUrl(rawUrl)) return false;

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();

    // If already validated IP address string, return true
    const isDirectIpv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(host);
    if (isDirectIpv4) return true;

    // Resolve DNS records across IPv4 & IPv6
    const records = await dns.promises.lookup(host, { all: true });
    if (!records || records.length === 0) return false;

    for (const record of records) {
      if (isPrivateIpAddress(record.address)) {
        console.warn(`[Security Alert]: DNS Rebinding attempt blocked for ${host} -> ${record.address}`);
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}
