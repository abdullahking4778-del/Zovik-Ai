"use client";

import { useState, useEffect, useCallback } from "react";
import { safeLocalStorage } from "@/lib/storage";

/**
 * Custom React hook for safely accessing and updating localStorage in Next.js.
 * Handles SSR hydration gracefully and syncs updates.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Sync after mount to avoid hydration mismatch between server and client
  useEffect(() => {
    const item = safeLocalStorage.getItem<T>(key, initialValue);
    if (item !== null && item !== undefined) {
      setStoredValue(item);
    }
  }, [key, initialValue]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((current) => {
          const valueToStore = value instanceof Function ? value(current) : value;
          safeLocalStorage.setItem(key, valueToStore);
          return valueToStore;
        });
      } catch (err) {
        console.warn(`[useLocalStorage] Failed to update key "${key}":`, err);
      }
    },
    [key]
  );

  return [storedValue, setValue];
}
