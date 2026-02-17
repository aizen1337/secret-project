export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "theme-preference";

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
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return "system";
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

export function applyThemePreference(preference: ThemePreference) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const effective = preference === "system" ? getSystemMode() : preference;
  root.classList.toggle("dark", effective === "dark");
}

export function setStoredThemePreference(preference: ThemePreference) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, preference);
  }
  applyThemePreference(preference);
}
