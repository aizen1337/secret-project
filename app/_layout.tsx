import { ClerkProvider, useAuth } from '@clerk/clerk-expo'
import { tokenCache } from '@clerk/clerk-expo/token-cache'
import { PortalHost } from '@rn-primitives/portal'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import '../global.css'

if (!process.env.EXPO_PUBLIC_CONVEX_URL) {
  throw new Error(
    'EXPO_PUBLIC_CONVEX_URL is not set, please check your .env.local file',
  )
}

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL, {
  unsavedChangesWarning: false,
})

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
          <Stack screenOptions={{ headerShown: false }} />
          <PortalHost />
        </SafeAreaView>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}
