import { View, Pressable, useWindowDimensions } from "react-native";
import { useColorScheme } from "nativewind";
import { Link, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { useAuth } from "@clerk/clerk-expo";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

type NavItem = {
  href: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const signedOutItems: NavItem[] = [
  { href: "/", labelKey: "bottomNav.explore", icon: "search" },
  { href: "/sign-in", labelKey: "common.actions.signIn", icon: "log-in-outline" },
];

const signedInItems: NavItem[] = [
  { href: "/", labelKey: "bottomNav.explore", icon: "search" },
  { href: "/favorites", labelKey: "bottomNav.favorites", icon: "heart-outline" },
  { href: "/trips", labelKey: "bottomNav.trips", icon: "car-outline" },
  { href: "/dashboard", labelKey: "bottomNav.host", icon: "grid-outline" },
  { href: "/profile", labelKey: "bottomNav.profile", icon: "person-outline" },
];

export function BottomNav(_: Partial<BottomTabBarProps> = {}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const mode = resolveThemeMode(useColorScheme());
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;
  const items = !isLoaded || !isSignedIn ? signedOutItems : signedInItems;
  const activeColor = getTokenColor(mode, "primary");
  const inactiveColor = getTokenColor(mode, "iconMuted");
  const inactiveLabelColor = getTokenColor(mode, "mutedForeground");
  const iconSize = isMobile ? 24 : 20;

  return (
    <View className="bg-card border-t border-border">
      <View
        className="flex-row items-center justify-around px-4 pt-2"
        style={{
          paddingBottom: Math.max(insets.bottom, isMobile ? 12 : 8),
          minHeight: isMobile ? 72 : 56,
        }}
      >
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname === "/index" || pathname === "/search"
              : pathname === item.href;
          const color = isActive ? activeColor : inactiveColor;
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable
                className={`items-center rounded-xl border px-2 ${
                  isActive ? "border-border bg-secondary" : "border-transparent bg-transparent"
                }`}
                style={{
                  width: isMobile ? 74 : 64,
                  paddingVertical: isMobile ? 6 : 4,
                }}
              >
                <Ionicons name={item.icon} size={iconSize} color={color} />
                <Text
                  className={`mt-1 ${isMobile ? "text-[10px]" : "text-xs"}`}
                  style={{ color: isActive ? activeColor : inactiveLabelColor }}
                >
                  {t(item.labelKey)}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

