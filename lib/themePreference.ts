export type ThemePreference = "system" | "light" | "dark";

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { colorScheme } from "nativewind";

const STORAGE_KEY = "theme-preference";
let cachedPreference: ThemePreference = "system";

function normalizePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function getSystemMode(): "light" | "dark" {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(STORAGE_KEY);
    const normalized = normalizePreference(raw);
    cachedPreference = normalized;
    return normalized;
  }
  return cachedPreference;
}

export async function getStoredThemePreferenceAsync(): Promise<ThemePreference> {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    return getStoredThemePreference();
  }

  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    const normalized = normalizePreference(raw);
    cachedPreference = normalized;
    return normalized;
  } catch {
    cachedPreference = "system";
    return "system";
  }
}

export function applyThemePreference(preference: ThemePreference) {
  const normalized = normalizePreference(preference);
  cachedPreference = normalized;
  try {
    colorScheme.set(normalized as any);
  } catch {
    // Ignore native color scheme manager failures and continue with web fallback.
  }

  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const effective = normalized === "system" ? getSystemMode() : normalized;
  root.classList.toggle("light", normalized === "light");
  root.classList.toggle("dark", effective === "dark");
}

export function setStoredThemePreference(preference: ThemePreference) {
  const normalized = normalizePreference(preference);
  cachedPreference = normalized;

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, normalized);
  } else if (Platform.OS !== "web") {
    void SecureStore.setItemAsync(STORAGE_KEY, normalized).catch(() => {
      // Ignore persistence errors and still apply runtime preference.
    });
  }

  applyThemePreference(normalized);
}
