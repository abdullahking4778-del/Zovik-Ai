/**
 * Safe client-side storage utility for Next.js SSR and Browser environments.
 * Prevents hydration crashes, private-mode SecurityErrors, and QuotaExceededErrors.
 */

export const safeLocalStorage = {
  isAvailable(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const testKey = "__zovik_storage_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },

  getItem<T = string>(key: string, fallback: T | null = null): T | null {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        // If not valid JSON, return as string
        return raw as unknown as T;
      }
    } catch {
      return fallback;
    }
  },

  getRawItem(key: string, fallback: string | null = null): string | null {
    if (typeof window === "undefined") return fallback;
    try {
      return window.localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },

  setItem<T>(key: string, value: T): boolean {
    if (typeof window === "undefined") return false;
    try {
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      window.localStorage.setItem(key, serialized);
      return true;
    } catch (err) {
      console.warn(`[safeLocalStorage] Failed to set item for key "${key}":`, err);
      return false;
    }
  },

  removeItem(key: string): boolean {
    if (typeof window === "undefined") return false;
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  getAllKeys(): string[] {
    if (typeof window === "undefined") return [];
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k) keys.push(k);
      }
      return keys;
    } catch {
      return [];
    }
  },
};
