// Safe Tags Normalizer Helper
// Ensures character tags are ALWAYS a clean string[] array regardless of source format

export function normalizeTags(tags: unknown): string[] {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags
      .map((t) => (typeof t === "string" ? t.trim() : String(t).trim()))
      .filter((t) => t.length > 0);
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  return [];
}
