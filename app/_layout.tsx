import { PortalHost } from '@rn-primitives/portal'
import { ConvexReactClient } from 'convex/react'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { Stack } from 'expo-router'
import { useColorScheme, vars } from 'nativewind'
import { useEffect, useMemo, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ToastProvider } from '@/components/feedback/ToastProvider'
import { StripeAppProvider } from '@/features/payments/ui/StripeAppProvider'
import { initI18n } from '@/lib/i18n'
import {
  applyThemePreference,
  getStoredThemePreferenceAsync,
} from '@/lib/themePreference'
import { getThemeCssVariables, resolveThemeMode } from '@/lib/themeTokens'
import { authClient } from '@/lib/auth/authClient'
import '../global.css'

if (!process.env.EXPO_PUBLIC_CONVEX_URL) {
  throw new Error(
    'EXPO_PUBLIC_CONVEX_URL is not set, please check your .env.local file',
  )
}

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL, {
  unsavedChangesWarning: false,
})
const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''

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
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <StripeAppProvider publishableKey={stripePublishableKey}>
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
      </StripeAppProvider>
    </ConvexBetterAuthProvider>
  )
}
