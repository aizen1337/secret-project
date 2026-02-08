
import { useSSO, useSignUp } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import * as React from 'react'
import { Alert, Pressable, ScrollView, TextInput, View, Platform } from 'react-native'
import { Text } from '@/components/ui/text'
import * as WebBrowser from 'expo-web-browser'
import { Ionicons } from '@expo/vector-icons'
import * as Linking from 'expo-linking'

WebBrowser.maybeCompleteAuthSession()

export default function Page() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()
  const redirectUrl = Linking.createURL('/sso-callback')
  const { startSSOFlow } = useSSO()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [pendingVerification, setPendingVerification] = React.useState(false)
  const [code, setCode] = React.useState('')

  // Handle submission of sign-up form
  const onSignUpPress = async () => {
    if (!isLoaded) return

    // Start sign-up process using email and password provided
    try {
      await signUp.create({
        emailAddress,
        password,
      })

      // Send user an email with verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })

      // Set 'pendingVerification' to true to display second form
      // and capture code
      setPendingVerification(true)
    } catch (err) {
      // See https://clerk.com/docs/guides/development/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
      Alert.alert('Sign up failed', 'Please check your details and try again.')
    }
  }

  // Handle submission of verification form
  const onVerifyPress = async () => {
    if (!isLoaded) return

    try {
      // Use the code the user provided to attempt verification
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      })

      // If verification was completed, set the session to active
      // and redirect the user
      if (signUpAttempt.status === 'complete') {
        await setActive({
          session: signUpAttempt.createdSessionId,
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
        // If the status is not complete, check why. User may need to
        // complete further steps.
        console.error(JSON.stringify(signUpAttempt, null, 2))
        Alert.alert('Verification failed', 'Please try again.')
      }
    } catch (err) {
      // See https://clerk.com/docs/guides/development/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
      Alert.alert('Verification failed', 'Please try again.')
    }
  }

  const onSocialPress = React.useCallback(
    async (provider: 'google' | 'apple' | 'facebook') => {
      try {
        const { createdSessionId, setActive, authSessionResult } =
          await startSSOFlow({
            strategy:
              provider === 'google'
                ? 'oauth_google'
                : provider === 'apple'
                  ? 'oauth_apple'
                  : 'oauth_facebook',
            ...(Platform.OS === 'web' ? { redirectUrl } : {}),
          })
        if (createdSessionId) {
          await setActive?.({ session: createdSessionId })
          router.replace('/(tabs)')
        } else {
          const cancelled =
            authSessionResult?.type === 'cancel' ||
            authSessionResult?.type === 'dismiss'
          Alert.alert(
            cancelled ? 'Sign up cancelled' : 'Sign up failed',
            cancelled
              ? 'You cancelled the sign up flow.'
              : 'Please try again.',
          )
        }
      } catch (err) {
        console.error(JSON.stringify(err, null, 2))
        Alert.alert('Sign up failed', 'Please try again.')
      }
    },
    [redirectUrl, router, startSSOFlow],
  )

  if (pendingVerification) {
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
          placeholder="Enter your verification code"
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
        Sign up
      </Text>
      <Text className="text-sm text-muted-foreground mb-6">
        Create your account to start booking and hosting.
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
          onChangeText={(email) => setEmailAddress(email)}
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
          onPress={onSignUpPress}
          disabled={!emailAddress || !password}
        >
          <Text className="text-primary-foreground font-semibold text-base">
            Continue
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
          Have an account?{' '}
        </Text>
        <Link href="/sign-in">
          <Text className="text-sm font-semibold text-foreground">Sign in</Text>
        </Link>
      </View>
    </ScrollView>
  )
}
