import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ClerkProvider } from '@clerk/clerk-expo'
import { tokenCache } from '@clerk/clerk-expo/token-cache'
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {PortalHost} from '@rn-primitives/portal'
import "../global.css"
if (!process.env.EXPO_PUBLIC_CONVEX_URL) {
  throw new Error(
    "EXPO_PUBLIC_CONVEX_URL is not set, please check your .env.local file"
  );
}

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL, {
  unsavedChangesWarning: false,
});

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <ClerkProvider tokenCache={tokenCache}>
        <SafeAreaView className="flex-1 bg-background" edges={["left", "right", "bottom"]}>
          <Stack screenOptions={{ headerShown: false }} />
          <PortalHost />
        </SafeAreaView>
      </ClerkProvider>
    </ConvexProvider>
  );
}
