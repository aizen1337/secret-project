import { ClerkProvider, useAuth } from '@clerk/clerk-expo'
import { tokenCache } from '@clerk/clerk-expo/token-cache'
import { PortalHost } from '@rn-primitives/portal'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { Stack } from 'expo-router'
import { useColorScheme, vars } from 'nativewind'
import { useEffect, useMemo, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ToastProvider } from '@/components/feedback/ToastProvider'
import { initI18n } from '@/lib/i18n'
import {
  applyThemePreference,
  getStoredThemePreferenceAsync,
} from '@/lib/themePreference'
import { getThemeCssVariables, resolveThemeMode } from '@/lib/themeTokens'
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
  const [isI18nReady, setIsI18nReady] = useState(false)
  const colorSchemeState = useColorScheme()
  const mode = resolveThemeMode(colorSchemeState)
  const themeVars = useMemo(() => vars(getThemeCssVariables(mode)), [mode])

  useEffect(() => {
    void (async () => {
      try {
        const preference = await getStoredThemePreferenceAsync()
        applyThemePreference(preference)
        await initI18n()
      } finally {
        setIsI18nReady(true)
      }
    })()
  }, [])

  if (!isI18nReady) return null

  return (
    <ClerkProvider tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ToastProvider>
          <SafeAreaView
            className="flex-1 bg-background"
            style={themeVars}
            edges={['top', 'left', 'right']}
          >
            <Stack screenOptions={{ headerShown: false }} />
            <PortalHost />
          </SafeAreaView>
        </ToastProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}
