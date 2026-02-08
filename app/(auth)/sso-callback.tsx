import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import { Redirect } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'

export default function SsoCallback() {
  const { isLoaded, isSignedIn } = useAuth()

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
      <Text className="text-base text-muted-foreground">
        Sign in was not completed. You can close this page.
      </Text>
    </View>
  )
}
