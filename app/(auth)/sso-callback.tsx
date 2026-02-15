import { useAuth, useClerk } from '@clerk/clerk-expo'
import { Redirect } from 'expo-router'
import * as React from 'react'
import { Platform, View } from 'react-native'

import { Text } from '@/components/ui/text'

export default function SsoCallback() {
  const { isLoaded, isSignedIn } = useAuth()
  const clerk = useClerk()
  const [callbackError, setCallbackError] = React.useState(false)
  const hasHandledRedirect = React.useRef(false)

  React.useEffect(() => {
    if (Platform.OS !== 'web') return
    if (!isLoaded || hasHandledRedirect.current) return

    hasHandledRedirect.current = true

    void clerk
      .handleRedirectCallback({
        signInUrl: '/sign-in',
        signUpUrl: '/sign-up',
        signInFallbackRedirectUrl: '/(tabs)',
        signUpFallbackRedirectUrl: '/(tabs)',
      })
      .catch((err) => {
        console.error(JSON.stringify(err, null, 2))
        setCallbackError(true)
      })
  }, [clerk, isLoaded])

  if (!isLoaded) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-base text-muted-foreground">
          Completing sign in...
        </Text>
      </View>
    )
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)" />
  }

  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <Text className="text-base text-muted-foreground text-center">
        {callbackError
          ? 'Sign in was not completed. Please try again.'
          : 'Completing sign in...'}
      </Text>
    </View>
  )
}
