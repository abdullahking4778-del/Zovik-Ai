/**
 * Security utility to prevent Server-Side Request Forgery (SSRF)
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

    // 5. Block private IPv4 ranges:
    // 10.0.0.0 - 10.255.255.255 (10.0.0.0/8)
    // 172.16.0.0 - 172.31.255.255 (172.16.0.0/12)
    // 192.168.0.0 - 192.168.255.255 (192.168.0.0/16)
    // 127.0.0.0 - 127.255.255.255 (Loopback)
    // 169.254.0.0 - 169.254.255.255 (Link-local / Cloud Metadata)
    // 0.0.0.0 (Unspecified)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = host.match(ipv4Regex);
    if (ipMatch) {
      const [_, a, b] = ipMatch.map(Number);
      if (a === 127 || a === 10 || a === 0) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      if (a === 169 && b === 254) return false;
    }

    // 6. Block IPv6 loopback and private address notations
    if (host.startsWith("[") || host.includes(":")) {
      const cleanIpv6 = host.replace(/[\[\]]/g, "");
      if (cleanIpv6 === "::1" || cleanIpv6.startsWith("fe80:") || cleanIpv6.startsWith("fc00:") || cleanIpv6.startsWith("fd00:")) {
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
