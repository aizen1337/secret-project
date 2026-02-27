import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { BottomNav } from "@/features/app-shell/ui/BottomNav";

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t("bottomNav.explore") }}
      />
      <Tabs.Screen
        name="search"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: t("bottomNav.favorites") }}
      />
      <Tabs.Screen
        name="trips"
        options={{ title: t("bottomNav.trips") }}
      />
      <Tabs.Screen
        name="chats"
        options={{ title: t("bottomNav.chats") }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t("bottomNav.profile") }}
      />
    </Tabs>
  );
}
