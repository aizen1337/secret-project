import { View, Pressable } from "react-native";
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
  { href: "/favourites", label: "Favorites", icon: "heart-outline" },
  { href: "/trips", label: "Trips", icon: "car-outline" },
  { href: "/dashboard", label: "Host", icon: "grid-outline" },
  { href: "/profile", label: "Profile", icon: "person-outline" },
];

export function BottomNav(_: BottomTabBarProps) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const items = !isLoaded || !isSignedIn ? signedOutItems : signedInItems;

  return (
    <View
      className="bg-white border-t border-border"
      style={{ paddingBottom: insets.bottom }}
    >
      <View className="flex-row items-center justify-around px-4 py-3">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname === "/index"
              : pathname === item.href;
          const color = isActive ? "#171717" : "#737373";
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
