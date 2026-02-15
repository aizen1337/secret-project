import { useSSO, useSignIn } from '@clerk/clerk-expo'
import type { EmailCodeFactor } from '@clerk/types'
import * as AuthSession from 'expo-auth-session'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as React from 'react'
import { Alert, Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'

import { Text } from '@/components/ui/text'

WebBrowser.maybeCompleteAuthSession()

export default function Page() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()
  const redirectUrl = AuthSession.makeRedirectUri({ path: 'sso-callback' })
  const redirectUrlComplete = '/(tabs)'
  const { startSSOFlow } = useSSO()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [code, setCode] = React.useState('')
  const [showEmailCode, setShowEmailCode] = React.useState(false)

  // Handle the submission of the sign-in form
  const onSignInPress = React.useCallback(async () => {
    if (!isLoaded) return

    // Start the sign-in process using the email and password provided
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      })

      // If sign-in process is complete, set the created session as active
      // and redirect the user
      if (signInAttempt.status === 'complete') {
        await setActive({
          session: signInAttempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              // Check for tasks and navigate to custom UI to help users resolve them
              // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
              console.log(session?.currentTask)
              return
            }

            router.replace('/')
          },
        })
      } else if (signInAttempt.status === 'needs_second_factor') {
        // Check if email_code is a valid second factor
        // This is required when Client Trust is enabled and the user
        // is signing in from a new device.
        // See https://clerk.com/docs/guides/secure/client-trust
        const emailCodeFactor = signInAttempt.supportedSecondFactors?.find(
          (factor): factor is EmailCodeFactor => factor.strategy === 'email_code',
        )

        if (emailCodeFactor) {
          await signIn.prepareSecondFactor({
            strategy: 'email_code',
            emailAddressId: emailCodeFactor.emailAddressId,
          })
          setShowEmailCode(true)
        }
      } else {
        // If the status is not complete, check why. User may need to
        // complete further steps.
        console.error(JSON.stringify(signInAttempt, null, 2))
        Alert.alert('Sign in pending', 'Please complete the remaining steps.')
      }
    } catch (err) {
      // See https://clerk.com/docs/guides/development/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
      Alert.alert('Sign in failed', 'Please check your credentials and try again.')
    }
  }, [isLoaded, signIn, setActive, router, emailAddress, password])

  // Handle the submission of the email verification code
  const onVerifyPress = React.useCallback(async () => {
    if (!isLoaded) return

    try {
      const signInAttempt = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code,
      })

      if (signInAttempt.status === 'complete') {
        await setActive({
          session: signInAttempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              // Check for tasks and navigate to custom UI to help users resolve them
              // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
              console.log(session?.currentTask)
              return
            }

            router.replace('/(tabs)')
          },
        })
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2))
        Alert.alert('Verification failed', 'Please try again.')
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2))
      Alert.alert('Verification failed', 'Please try again.')
    }
  }, [isLoaded, signIn, setActive, router, code])

  const onSocialPress = React.useCallback(
    async (provider: 'google' | 'apple' | 'facebook') => {
      if (!isLoaded) return

      const strategy =
        provider === 'google'
          ? 'oauth_google'
          : provider === 'apple'
            ? 'oauth_apple'
            : 'oauth_facebook'

      try {
        if (Platform.OS === 'web') {
          await signIn.authenticateWithRedirect({
            strategy,
            redirectUrl,
            redirectUrlComplete,
          })
          return
        }

        const { createdSessionId, setActive, authSessionResult } = await startSSOFlow({
          strategy,
          redirectUrl,
        })

        if (createdSessionId) {
          await setActive?.({ session: createdSessionId })
          router.replace('/(tabs)')
        } else {
          const cancelled =
            authSessionResult?.type === 'cancel' || authSessionResult?.type === 'dismiss'
          Alert.alert(
            cancelled ? 'Sign in cancelled' : 'Sign in failed',
            cancelled ? 'You cancelled the sign in flow.' : 'Please try again.',
          )
        }
      } catch (err) {
        console.error(JSON.stringify(err, null, 2))
        Alert.alert('Sign in failed', 'Please try again.')
      }
    },
    [isLoaded, redirectUrl, redirectUrlComplete, router, signIn, startSSOFlow],
  )

  // Display email code verification form
  if (showEmailCode) {
    return (
      <View className="flex-1 bg-background px-4 pt-6">
        <Text className="text-2xl font-bold text-foreground mb-2">
          Verify your email
        </Text>
        <Text className="text-sm text-muted-foreground mb-4">
          A verification code has been sent to your email.
        </Text>
        <TextInput
          className="bg-card border border-border rounded-xl px-4 py-3 text-base mb-3"
          value={code}
          placeholder="Enter verification code"
          placeholderTextColor="#666666"
          onChangeText={(code) => setCode(code)}
          keyboardType="numeric"
        />
        <Pressable
          className="bg-primary py-4 rounded-xl items-center"
          onPress={onVerifyPress}
        >
          <Text className="text-primary-foreground font-semibold text-base">
            Verify
          </Text>
        </Pressable>
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pt-6 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-2xl font-bold text-foreground mb-2">
        Sign in
      </Text>
      <Text className="text-sm text-muted-foreground mb-6">
        Welcome back. Sign in to continue.
      </Text>

      <View className="bg-card border border-border rounded-2xl p-4">
        <Text className="text-sm font-semibold text-foreground mb-2">
          Email address
        </Text>
        <TextInput
          className="bg-background border border-border rounded-xl px-4 py-3 text-base mb-3"
          autoCapitalize="none"
          value={emailAddress}
          placeholder="Enter email"
          placeholderTextColor="#666666"
          onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
          keyboardType="email-address"
        />
        <Text className="text-sm font-semibold text-foreground mb-2">
          Password
        </Text>
        <TextInput
          className="bg-background border border-border rounded-xl px-4 py-3 text-base"
          value={password}
          placeholder="Enter password"
          placeholderTextColor="#666666"
          secureTextEntry={true}
          onChangeText={(password) => setPassword(password)}
        />
        <Pressable
          className={`mt-4 bg-primary py-4 rounded-xl items-center ${
            !emailAddress || !password ? 'opacity-50' : ''
          }`}
          onPress={onSignInPress}
          disabled={!emailAddress || !password}
        >
          <Text className="text-primary-foreground font-semibold text-base">
            Sign in
          </Text>
        </Pressable>
        {Platform.OS === 'web' ? (
          <View nativeID="clerk-captcha" className="mt-3" />
        ) : null}
      </View>

      <View className="flex-row items-center my-4">
        <View className="flex-1 h-px bg-border" />
        <Text className="mx-3 text-xs text-muted-foreground">OR</Text>
        <View className="flex-1 h-px bg-border" />
      </View>

      <View className="gap-3">
        <Pressable
          className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
          onPress={() => onSocialPress('apple')}
        >
          <Ionicons name="logo-apple" size={18} color="#171717" />
          <Text className="text-sm font-semibold text-foreground">
            Continue with Apple
          </Text>
        </Pressable>
        <Pressable
          className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
          onPress={() => onSocialPress('google')}
        >
          <Ionicons name="logo-google" size={18} color="#171717" />
          <Text className="text-sm font-semibold text-foreground">
            Continue with Google
          </Text>
        </Pressable>
        <Pressable
          className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
          onPress={() => onSocialPress('facebook')}
        >
          <Ionicons name="logo-facebook" size={18} color="#171717" />
          <Text className="text-sm font-semibold text-foreground">
            Continue with Facebook
          </Text>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-center mt-6">
        <Text className="text-sm text-muted-foreground">
          Don{"'"}t have an account?{' '}
        </Text>
        <Link href="/sign-up">
          <Text className="text-sm font-semibold text-foreground">Sign up</Text>
        </Link>
      </View>
    </ScrollView>
  )
}
