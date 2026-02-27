import { useSSO, useSignIn } from '@clerk/clerk-expo'
import { useColorScheme } from "nativewind";
import type { EmailCodeFactor } from '@clerk/types'
import * as AuthSession from 'expo-auth-session'
import { Link, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as React from 'react'
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import * as WebBrowser from 'expo-web-browser'

import { useToast } from '@/components/feedback/useToast'
import { Text } from '@/components/ui/text'
import { toLocalizedErrorMessage } from '@/lib/errors'
import { getTokenColor, resolveThemeMode } from '@/lib/themeTokens'

WebBrowser.maybeCompleteAuthSession()

export default function Page() {
  const { t } = useTranslation()
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()
  const redirectUrl = AuthSession.makeRedirectUri({ path: 'sso-callback' })
  const redirectUrlComplete = '/(tabs)'
  const { startSSOFlow } = useSSO()
  const toast = useToast()
  const mode = resolveThemeMode(useColorScheme())

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
        toast.warning(t('auth.signIn.warningPending'))
      }
    } catch (err) {
      // See https://clerk.com/docs/guides/development/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
      toast.error(toLocalizedErrorMessage(err, t, 'auth.signIn.failedCredentials'))
    }
  }, [emailAddress, isLoaded, password, router, setActive, signIn, t, toast])

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
        toast.error(t('auth.signIn.verifyFailed'))
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2))
      toast.error(t('auth.signIn.verifyFailed'))
    }
  }, [code, isLoaded, router, setActive, signIn, t, toast])

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
          if (cancelled) {
            toast.warning(t('auth.signIn.cancelled'))
          } else {
            toast.error(t('auth.signIn.failed'))
          }
        }
      } catch (err) {
        console.error(JSON.stringify(err, null, 2))
        toast.error(toLocalizedErrorMessage(err, t, 'auth.signIn.failed'))
      }
    },
    [isLoaded, redirectUrl, redirectUrlComplete, router, signIn, startSSOFlow, t, toast],
  )

  // Display email code verification form
  if (showEmailCode) {
    return (
      <View className="flex-1 bg-background px-4 pt-6">
        <Text className="text-2xl font-bold text-foreground mb-2">
          {t('auth.signIn.verifyTitle')}
        </Text>
        <Text className="text-sm text-muted-foreground mb-4">
          {t('auth.signIn.verifySubtitle')}
        </Text>
        <TextInput
          className="bg-card border border-border rounded-xl px-4 py-3 text-base mb-3"
          value={code}
          placeholder={t('auth.signIn.verifyPlaceholder')}
          placeholderTextColor={getTokenColor(mode, 'placeholder')}
          onChangeText={(code) => setCode(code)}
          keyboardType="numeric"
        />
        <Pressable
          className="bg-primary py-4 rounded-xl items-center"
          onPress={onVerifyPress}
        >
          <Text className="text-primary-foreground font-semibold text-base">
            {t('auth.signIn.verify')}
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
        {t('auth.signIn.title')}
      </Text>
      <Text className="text-sm text-muted-foreground mb-6">
        {t('auth.signIn.subtitle')}
      </Text>

      <View className="bg-card border border-border rounded-2xl p-4">
        <Text className="text-sm font-semibold text-foreground mb-2">
          {t('auth.signIn.email')}
        </Text>
        <TextInput
          className="bg-background border border-border rounded-xl px-4 py-3 text-base mb-3"
          autoCapitalize="none"
          value={emailAddress}
          placeholder={t('auth.signIn.emailPlaceholder')}
          placeholderTextColor={getTokenColor(mode, 'placeholder')}
          onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
          keyboardType="email-address"
        />
        <Text className="text-sm font-semibold text-foreground mb-2">
          {t('auth.signIn.password')}
        </Text>
        <TextInput
          className="bg-background border border-border rounded-xl px-4 py-3 text-base"
          value={password}
          placeholder={t('auth.signIn.passwordPlaceholder')}
          placeholderTextColor={getTokenColor(mode, 'placeholder')}
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
            {t('common.actions.signIn')}
          </Text>
        </Pressable>
        {Platform.OS === 'web' ? (
          <View nativeID="clerk-captcha" className="mt-3" />
        ) : null}
      </View>

      <View className="flex-row items-center my-4">
        <View className="flex-1 h-px bg-border" />
        <Text className="mx-3 text-xs text-muted-foreground">{t('common.or')}</Text>
        <View className="flex-1 h-px bg-border" />
      </View>

      <View className="gap-3">
        <Pressable
          className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
          onPress={() => onSocialPress('apple')}
        >
          <Ionicons name="logo-apple" size={18} color={getTokenColor(mode, 'icon')} />
          <Text className="text-sm font-semibold text-foreground">
            {t('auth.signIn.continueApple')}
          </Text>
        </Pressable>
        <Pressable
          className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
          onPress={() => onSocialPress('google')}
        >
          <Ionicons name="logo-google" size={18} color={getTokenColor(mode, 'icon')} />
          <Text className="text-sm font-semibold text-foreground">
            {t('auth.signIn.continueGoogle')}
          </Text>
        </Pressable>
        <Pressable
          className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
          onPress={() => onSocialPress('facebook')}
        >
          <Ionicons name="logo-facebook" size={18} color={getTokenColor(mode, 'icon')} />
          <Text className="text-sm font-semibold text-foreground">
            {t('auth.signIn.continueFacebook')}
          </Text>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-center mt-6">
        <Text className="text-sm text-muted-foreground">
          {t('auth.signIn.noAccount')}{' '}
        </Text>
        <Link href="/sign-up">
          <Text className="text-sm font-semibold text-foreground">{t('common.actions.signUp')}</Text>
        </Link>
      </View>
    </ScrollView>
  )
}

