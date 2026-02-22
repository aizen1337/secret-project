import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";

type BrowseHeaderProps = {
  iconColor: string;
};

export function BrowseHeader({ iconColor }: BrowseHeaderProps) {
  const { t } = useTranslation();
  return (
    <View className="mb-4 flex-row items-center justify-between">
      <View>
        <Text className="text-xs uppercase text-muted-foreground">{t("bottomNav.explore")}</Text>
        <Text className="text-2xl font-bold">{t("explore.findYourRide")}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
          <Ionicons name="options-outline" size={20} color={iconColor} />
        </Pressable>
        <Link href="/profile" asChild>
          <Pressable className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
            <Ionicons name="person-outline" size={20} color={iconColor} />
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
