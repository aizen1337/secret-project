import { Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import type { SignUpScreenController } from "@/features/auth/hooks/useSignUpScreenState";
import { Text } from "@/components/ui/text";
import { getTokenColor } from "@/lib/themeTokens";

type SignUpContentProps = {
  state: SignUpScreenController;
  mode: "light" | "dark";
};

export function SignUpContent({ state, mode }: SignUpContentProps) {
  const { t } = useTranslation();

  if (state.pendingVerification) {
    return (
      <View className="flex-1 bg-background px-4 pt-6">
        <Text className="text-2xl font-bold text-foreground mb-2">{t("auth.signUp.verifyTitle")}</Text>
        <Text className="text-sm text-muted-foreground mb-4">{t("auth.signUp.verifySubtitle")}</Text>
        <TextInput
          className="bg-card border border-border rounded-xl px-4 py-3 text-base mb-3"
          value={state.code}
          placeholder={t("auth.signUp.verifyPlaceholder")}
          placeholderTextColor={getTokenColor(mode, "placeholder")}
          onChangeText={state.setCode}
          keyboardType="numeric"
        />
        <Pressable className="bg-primary py-4 rounded-xl items-center" onPress={state.onVerifyPress}>
          <Text className="text-primary-foreground font-semibold text-base">{t("auth.signUp.verify")}</Text>
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
      <Text className="text-2xl font-bold text-foreground mb-2">{t("auth.signUp.title")}</Text>
      <Text className="text-sm text-muted-foreground mb-6">{t("auth.signUp.subtitle")}</Text>

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
          onPress={state.onSignUpPress}
          disabled={!state.emailAddress || !state.password}
        >
          <Text className="text-primary-foreground font-semibold text-base">{t("auth.signUp.continue")}</Text>
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
          <Text className="text-sm font-semibold text-foreground">{t("auth.signUp.continueApple")}</Text>
        </Pressable>
        <Pressable
          className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
          onPress={() => state.onSocialPress("google")}
        >
          <Ionicons name="logo-google" size={18} color={getTokenColor(mode, "icon")} />
          <Text className="text-sm font-semibold text-foreground">{t("auth.signUp.continueGoogle")}</Text>
        </Pressable>
        <Pressable
          className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
          onPress={() => state.onSocialPress("facebook")}
        >
          <Ionicons name="logo-facebook" size={18} color={getTokenColor(mode, "icon")} />
          <Text className="text-sm font-semibold text-foreground">{t("auth.signUp.continueFacebook")}</Text>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-center mt-6">
        <Text className="text-sm text-muted-foreground">{t("auth.signUp.hasAccount")} </Text>
        <Link href="/sign-in">
          <Text className="text-sm font-semibold text-foreground">{t("common.actions.signIn")}</Text>
        </Link>
      </View>
    </ScrollView>
  );
}
