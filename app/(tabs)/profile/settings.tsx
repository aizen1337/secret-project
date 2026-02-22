'use client';

import { useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { useToast } from "@/components/feedback/useToast";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";
import {
  getStoredThemePreference,
  setStoredThemePreference,
  type ThemePreference,
} from "@/lib/themePreference";

export default function ProfileSettingsScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const router = useRouter();
  const mode = resolveThemeMode(useColorScheme());
  const { isLoaded, isSignedIn } = useAuth();
  const { language, setLanguage } = useAppLanguage();
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    getStoredThemePreference(),
  );

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isSignedIn) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground text-center mb-4">{t("profile.logInSubtitle")}</Text>
          <Link href="/sign-in" asChild>
            <Pressable className="bg-primary px-6 py-3 rounded-xl">
              <Text className="text-primary-foreground font-semibold text-base">{t("common.actions.signIn")}</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 py-3 border-b border-border flex-row items-center">
        <Pressable onPress={() => router.back()} className="w-9 h-9 rounded-full bg-secondary items-center justify-center">
          <Ionicons name="chevron-back" size={18} color={getTokenColor(mode, "icon")} />
        </Pressable>
        <Text className="ml-3 text-lg font-semibold text-foreground">{t("profile.menu.settings")}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="bg-card rounded-xl border border-border p-4">
          <Text className="text-base font-semibold text-foreground mb-3">{t("common.appearance.title")}</Text>
          <View className="flex-row gap-2">
            {[
              { label: t("common.appearance.system"), value: "system" },
              { label: t("common.appearance.light"), value: "light" },
              { label: t("common.appearance.dark"), value: "dark" },
            ].map((option) => {
              const isActive = themePreference === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    const value = option.value as ThemePreference;
                    setThemePreference(value);
                    setStoredThemePreference(value);
                  }}
                  className={`flex-1 items-center rounded-lg border px-3 py-2 ${
                    isActive ? "border-primary bg-primary/10" : "border-border bg-background"
                  }`}
                >
                  <Text className={isActive ? "text-primary font-semibold" : "text-foreground"}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mt-4 bg-card rounded-xl border border-border p-4">
          <Text className="text-base font-semibold text-foreground mb-3">{t("common.language.title")}</Text>
          <View className="flex-row gap-2">
            {[
              { label: t("common.language.english"), value: "en" },
              { label: t("common.language.polish"), value: "pl" },
            ].map((option) => {
              const isActive = language === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    void setLanguage(option.value as "en" | "pl").then(() => {
                      toast.success(t("common.language.changed"));
                    });
                  }}
                  className={`flex-1 items-center rounded-lg border px-3 py-2 ${
                    isActive ? "border-primary bg-primary/10" : "border-border bg-background"
                  }`}
                >
                  <Text className={isActive ? "text-primary font-semibold" : "text-foreground"}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

