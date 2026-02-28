import { Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import type { SignInScreenController } from "@/features/auth/hooks/useSignInScreenState";
import { Text } from "@/components/ui/text";
import { getTokenColor } from "@/lib/themeTokens";

type SignInContentProps = {
  state: SignInScreenController;
  mode: "light" | "dark";
};

export function SignInContent({ state, mode }: SignInContentProps) {
  const { t } = useTranslation();

  if (state.showEmailCode) {
    return (
      <View className="flex-1 bg-background px-4 pt-6">
        <Text className="text-2xl font-bold text-foreground mb-2">{t("auth.signIn.verifyTitle")}</Text>
        <Text className="text-sm text-muted-foreground mb-4">{t("auth.signIn.verifySubtitle")}</Text>
        <TextInput
          className="bg-card border border-border rounded-xl px-4 py-3 text-base mb-3"
          value={state.code}
          placeholder={t("auth.signIn.verifyPlaceholder")}
          placeholderTextColor={getTokenColor(mode, "placeholder")}
          onChangeText={state.setCode}
          keyboardType="numeric"
        />
        <Pressable className="bg-primary py-4 rounded-xl items-center" onPress={state.onVerifyPress}>
          <Text className="text-primary-foreground font-semibold text-base">{t("auth.signIn.verify")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pt-6 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-2xl font-bold text-foreground mb-2">{t("auth.signIn.title")}</Text>
      <Text className="text-sm text-muted-foreground mb-6">{t("auth.signIn.subtitle")}</Text>

      <View className="bg-card border border-border rounded-2xl p-4">
        <Text className="text-sm font-semibold text-foreground mb-2">{t("auth.signIn.email")}</Text>
        <TextInput
          className="bg-background border border-border rounded-xl px-4 py-3 text-base mb-3"
          autoCapitalize="none"
          value={state.emailAddress}
          placeholder={t("auth.signIn.emailPlaceholder")}
          placeholderTextColor={getTokenColor(mode, "placeholder")}
          onChangeText={state.setEmailAddress}
          keyboardType="email-address"
        />
        <Text className="text-sm font-semibold text-foreground mb-2">{t("auth.signIn.password")}</Text>
        <TextInput
          className="bg-background border border-border rounded-xl px-4 py-3 text-base"
          value={state.password}
          placeholder={t("auth.signIn.passwordPlaceholder")}
          placeholderTextColor={getTokenColor(mode, "placeholder")}
          secureTextEntry={true}
          onChangeText={state.setPassword}
        />
        <Pressable
          className={`mt-4 bg-primary py-4 rounded-xl items-center ${!state.emailAddress || !state.password ? "opacity-50" : ""}`}
          onPress={state.onSignInPress}
          disabled={!state.emailAddress || !state.password}
        >
          <Text className="text-primary-foreground font-semibold text-base">{t("common.actions.signIn")}</Text>
        </Pressable>
        {Platform.OS === "web" ? <View nativeID="clerk-captcha" className="mt-3" /> : null}
      </View>

      <View className="flex-row items-center my-4">
        <View className="flex-1 h-px bg-border" />
        <Text className="mx-3 text-xs text-muted-foreground">{t("common.or")}</Text>
        <View className="flex-1 h-px bg-border" />
      </View>

      <View className="gap-3">
        <Pressable
          className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
          onPress={() => state.onSocialPress("apple")}
        >
          <Ionicons name="logo-apple" size={18} color={getTokenColor(mode, "icon")} />
          <Text className="text-sm font-semibold text-foreground">{t("auth.signIn.continueApple")}</Text>
        </Pressable>
        <Pressable
          className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
          onPress={() => state.onSocialPress("google")}
        >
          <Ionicons name="logo-google" size={18} color={getTokenColor(mode, "icon")} />
          <Text className="text-sm font-semibold text-foreground">{t("auth.signIn.continueGoogle")}</Text>
        </Pressable>
        <Pressable
          className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
          onPress={() => state.onSocialPress("facebook")}
        >
          <Ionicons name="logo-facebook" size={18} color={getTokenColor(mode, "icon")} />
          <Text className="text-sm font-semibold text-foreground">{t("auth.signIn.continueFacebook")}</Text>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-center mt-6">
        <Text className="text-sm text-muted-foreground">{t("auth.signIn.noAccount")} </Text>
        <Link href="/sign-up">
          <Text className="text-sm font-semibold text-foreground">{t("common.actions.signUp")}</Text>
        </Link>
      </View>
    </ScrollView>
  );
}
