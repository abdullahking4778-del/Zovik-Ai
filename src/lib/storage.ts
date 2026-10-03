/**
 * Safe client-side storage utility for Next.js SSR and Browser environments.
 * Prevents hydration crashes, private-mode SecurityErrors, and QuotaExceededErrors.
 */

import { useState, useEffect } from "react";

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

  /**
   * Retrieves string value without any JSON parsing.
   */
  getRawItem(key: string, fallback: string | null = null): string | null {
    if (typeof window === "undefined") return fallback;
    try {
      return window.localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },

  /**
   * Retrieves a boolean value reliably from localStorage.
   * Handles "true", "1", true, etc.
   */
  getBoolean(key: string, fallback = false): boolean {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      const lower = raw.trim().toLowerCase();
      return lower === "true" || lower === "1";
    } catch {
      return fallback;
    }
  },

  /**
   * Safe item retrieval. Parses objects/arrays if stored as JSON,
   * but preserves plain strings (e.g. "true", "vip", "aria-solis") without unwanted coercion.
   */
  getItem<T = string>(key: string, fallback: T | null = null): T | null {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;

      const trimmed = raw.trim();
      // Only parse JSON objects and arrays
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          return JSON.parse(raw) as T;
        } catch {
          return raw as unknown as T;
        }
      }

      // Return raw string for primitive values
      return raw as unknown as T;
    } catch {
      return fallback;
    }
  },

  setItem<T>(key: string, value: T): boolean {
    if (typeof window === "undefined") return false;
    try {
      let serialized: string;
      if (typeof value === "string") {
        serialized = value;
      } else if (typeof value === "boolean" || typeof value === "number") {
        serialized = String(value);
      } else {
        serialized = JSON.stringify(value);
      }
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

/**
 * React Hook for SSR-safe localStorage with hydration safety.
 * Initializes to initialValue on the server and first client render,
 * then hydrates from localStorage inside useEffect without causing UI flicker.
 */
export function useSafeLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const item = safeLocalStorage.getItem<T>(key);
    if (item !== null && item !== undefined) {
      setState(item);
    }
    setIsHydrated(true);
  }, [key]);

  const setLocalStorageValue = (val: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof val === "function" ? (val as (prev: T) => T)(prev) : val;
      safeLocalStorage.setItem(key, next);
      return next;
    });
  };

  return [state, setLocalStorageValue, isHydrated];
}
