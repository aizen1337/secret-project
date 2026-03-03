import { Redirect } from 'expo-router'
import * as React from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { useAppAuth } from '@/features/auth/hooks/useAppAuth'
import { Text } from '@/components/ui/text'

export default function SsoCallback() {
  const { t } = useTranslation()
  const { isLoaded, isSignedIn } = useAppAuth()
  const [callbackError] = React.useState(false)

  if (!isLoaded) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-base text-muted-foreground">
          {t('auth.signIn.completing')}
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
          ? t('auth.signIn.callbackFailed')
          : t('auth.signIn.completing')}
      </Text>
    </View>
  )
}

