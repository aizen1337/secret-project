import { Redirect, Stack } from 'expo-router'
import { useAppAuth } from '@/features/auth/hooks/useAppAuth'

export default function AuthRoutesLayout() {
  const { isSignedIn } = useAppAuth()

  if (isSignedIn) {
    return <Redirect href={'/'} />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
