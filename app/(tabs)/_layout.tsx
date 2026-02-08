import { Tabs } from "expo-router";
import { BottomNav } from "@/components/navigation/BottomNav";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Explore" }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: "Favorites" }}
      />
      <Tabs.Screen
        name="trips"
        options={{ title: "Trips" }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Host" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile" }}
      />
    </Tabs>
  );
}
