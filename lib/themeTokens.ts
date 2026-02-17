export type ThemeMode = "light" | "dark";

export type AppColorToken =
  | "background"
  | "foreground"
  | "card"
  | "cardForeground"
  | "popover"
  | "popoverForeground"
  | "primary"
  | "primaryForeground"
  | "secondary"
  | "secondaryForeground"
  | "muted"
  | "mutedForeground"
  | "accent"
  | "accentForeground"
  | "destructive"
  | "destructiveForeground"
  | "border"
  | "input"
  | "ring"
  | "placeholder"
  | "icon"
  | "iconMuted"
  | "overlay"
  | "surfaceSubtle"
  | "mapMarkerBg"
  | "mapMarkerFg"
  | "mapMarkerBorder"
  | "mapPopupBg"
  | "mapPopupMuted"
  | "mapPopupCtaBg"
  | "mapPopupCtaFg"
  | "ratingStar"
  | "verifiedBg"
  | "verifiedFg"
  | "calendarRange"
  | "calendarRangeDark";

const TOKENS: Record<ThemeMode, Record<AppColorToken, string>> = {
  light: {
    background: "hsl(0 0% 100%)",
    foreground: "hsl(0 0% 9%)",
    card: "hsl(0 0% 100%)",
    cardForeground: "hsl(0 0% 9%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(0 0% 9%)",
    primary: "hsl(146 63% 45%)",
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(0 0% 96%)",
    secondaryForeground: "hsl(0 0% 9%)",
    muted: "hsl(0 0% 96%)",
    mutedForeground: "hsl(0 0% 45%)",
    accent: "hsl(146 45% 96%)",
    accentForeground: "hsl(146 55% 34%)",
    destructive: "hsl(7 80% 56%)",
    destructiveForeground: "hsl(0 0% 100%)",
    border: "hsl(0 0% 90%)",
    input: "hsl(0 0% 90%)",
    ring: "hsl(146 63% 45%)",
    placeholder: "hsl(0 0% 45%)",
    icon: "hsl(0 0% 9%)",
    iconMuted: "hsl(0 0% 45%)",
    overlay: "rgba(0, 0, 0, 0.45)",
    surfaceSubtle: "hsl(210 20% 96%)",
    mapMarkerBg: "hsl(0 0% 100%)",
    mapMarkerFg: "hsl(0 0% 9%)",
    mapMarkerBorder: "hsl(0 0% 90%)",
    mapPopupBg: "hsl(0 0% 100%)",
    mapPopupMuted: "hsl(0 0% 45%)",
    mapPopupCtaBg: "hsl(0 0% 9%)",
    mapPopupCtaFg: "hsl(0 0% 100%)",
    ratingStar: "hsl(38 92% 50%)",
    verifiedBg: "hsl(142 76% 95%)",
    verifiedFg: "hsl(142 72% 29%)",
    calendarRange: "hsl(214 32% 91%)",
    calendarRangeDark: "rgba(30,41,59,0.6)",
  },
  dark: {
    background: "hsl(0 0% 9%)",
    foreground: "hsl(0 0% 98%)",
    card: "hsl(0 0% 11%)",
    cardForeground: "hsl(0 0% 98%)",
    popover: "hsl(0 0% 11%)",
    popoverForeground: "hsl(0 0% 98%)",
    primary: "hsl(146 63% 45%)",
    primaryForeground: "hsl(0 0% 9%)",
    secondary: "hsl(0 0% 16%)",
    secondaryForeground: "hsl(0 0% 98%)",
    muted: "hsl(0 0% 16%)",
    mutedForeground: "hsl(0 0% 64%)",
    accent: "hsl(146 28% 28%)",
    accentForeground: "hsl(146 52% 75%)",
    destructive: "hsl(7 58% 45%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(0 0% 20%)",
    input: "hsl(0 0% 20%)",
    ring: "hsl(146 63% 45%)",
    placeholder: "hsl(0 0% 64%)",
    icon: "hsl(146 63% 45%)",
    iconMuted: "hsl(146 45% 34%)",
    overlay: "rgba(0, 0, 0, 0.55)",
    surfaceSubtle: "hsl(0 0% 15%)",
    mapMarkerBg: "hsl(0 0% 11%)",
    mapMarkerFg: "hsl(0 0% 98%)",
    mapMarkerBorder: "hsl(0 0% 20%)",
    mapPopupBg: "hsl(0 0% 11%)",
    mapPopupMuted: "hsl(0 0% 64%)",
    mapPopupCtaBg: "hsl(0 0% 98%)",
    mapPopupCtaFg: "hsl(0 0% 9%)",
    ratingStar: "hsl(38 92% 50%)",
    verifiedBg: "hsl(142 40% 24%)",
    verifiedFg: "hsl(142 65% 80%)",
    calendarRange: "hsl(214 32% 91%)",
    calendarRangeDark: "rgba(30,41,59,0.6)",
  },
};

const CSS_VAR_BY_TOKEN: Record<AppColorToken, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  border: "--border",
  input: "--input",
  ring: "--ring",
  placeholder: "--placeholder",
  icon: "--icon",
  iconMuted: "--icon-muted",
  overlay: "--overlay",
  surfaceSubtle: "--surface-subtle",
  mapMarkerBg: "--map-marker-bg",
  mapMarkerFg: "--map-marker-fg",
  mapMarkerBorder: "--map-marker-border",
  mapPopupBg: "--map-popup-bg",
  mapPopupMuted: "--map-popup-muted",
  mapPopupCtaBg: "--map-popup-cta-bg",
  mapPopupCtaFg: "--map-popup-cta-fg",
  ratingStar: "--rating-star",
  verifiedBg: "--verified-bg",
  verifiedFg: "--verified-fg",
  calendarRange: "--calendar-range",
  calendarRangeDark: "--calendar-range-dark",
};

export function resolveThemeMode(
  scheme:
    | string
    | null
    | undefined
    | {
        colorScheme?: string | null;
      },
): ThemeMode {
  if (typeof document !== "undefined") {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }

  const value =
    typeof scheme === "object" && scheme !== null
      ? scheme.colorScheme
      : scheme;
  return value === "dark" ? "dark" : "light";
}

export function getTokenColor(mode: ThemeMode, token: AppColorToken): string {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    const cssVar = CSS_VAR_BY_TOKEN[token];
    const computed = getComputedStyle(root);
    const resolveCssVar = (value: string, depth = 0): string => {
      if (depth > 6) return value;
      const trimmed = value.trim();
      const match = trimmed.match(/^var\((--[^),\s]+)(?:,[^)]+)?\)$/);
      if (!match) return trimmed;
      const next = computed.getPropertyValue(match[1]).trim();
      if (!next) return trimmed;
      return resolveCssVar(next, depth + 1);
    };
    const raw = resolveCssVar(computed.getPropertyValue(cssVar).trim());

    if (raw) {
      if (raw.startsWith("oklch(") || raw.startsWith("hsl(") || raw.startsWith("rgb(") || raw.startsWith("#")) {
        return raw;
      }
      return `hsl(${raw})`;
    }
  }

  return TOKENS[mode][token];
}

export function getThemePalette(mode: ThemeMode) {
  return TOKENS[mode];
}
