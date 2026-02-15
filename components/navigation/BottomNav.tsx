import { View, Pressable, useColorScheme } from "react-native";
import { Link, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { useAuth } from "@clerk/clerk-expo";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const signedOutItems: NavItem[] = [
  { href: "/", label: "Explore", icon: "search" },
  { href: "/sign-in", label: "Sign in", icon: "log-in-outline" },
];

const signedInItems: NavItem[] = [
  { href: "/", label: "Explore", icon: "search" },
  { href: "/favorites", label: "Favorites", icon: "heart-outline" },
  { href: "/trips", label: "Trips", icon: "car-outline" },
  { href: "/dashboard", label: "Host", icon: "grid-outline" },
  { href: "/profile", label: "Profile", icon: "person-outline" },
];

export function BottomNav(_: Partial<BottomTabBarProps> = {}) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const items = !isLoaded || !isSignedIn ? signedOutItems : signedInItems;
  const activeColor = colorScheme === "dark" ? "#fafafa" : "#171717";
  const inactiveColor = colorScheme === "dark" ? "#9ca3af" : "#737373";

  return (
    <View className="bg-card border-t border-border">
      <View
        className="flex-row items-center justify-around px-4 pt-2"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname === "/index"
              : pathname === item.href;
          const color = isActive ? activeColor : inactiveColor;
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable className="items-center">
                <Ionicons name={item.icon} size={20} color={color} />
                <Text className="text-xs mt-1" style={{ color }}>
                  {item.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}
