import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";

type BrowseHeaderProps = {
  iconColor: string;
};

export function BrowseHeader({ iconColor }: BrowseHeaderProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const buttonSize = isMobile ? 44 : 40;
  const iconSize = isMobile ? 24 : 20;

  return (
    <View className="mb-4 flex-row items-center justify-between">
      <View>
        <Text className="text-xs uppercase text-muted-foreground">{t("bottomNav.explore")}</Text>
        <Text className="text-2xl font-bold">{t("explore.findYourRide")}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Link href="/profile/settings" asChild>
          <Pressable
            className="items-center justify-center rounded-full border border-border bg-card"
            style={{ width: buttonSize, height: buttonSize }}
          >
            <Ionicons name="settings-outline" size={iconSize} color={iconColor} />
          </Pressable>
        </Link>
        <Link href="/profile" asChild>
          <Pressable
            className="items-center justify-center rounded-full border border-border bg-card"
            style={{ width: buttonSize, height: buttonSize }}
          >
            <Ionicons name="person-outline" size={iconSize} color={iconColor} />
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
