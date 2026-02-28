import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBookingChatScreenState } from "@/features/bookings/hooks/useBookingChatScreenState";
import { BookingChatContent } from "@/features/bookings/ui/BookingChatContent";
import { resolveThemeMode } from "@/lib/themeTokens";

function CenterMessage({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">{children}</View>
    </SafeAreaView>
  );
}

export default function BookingChatScreen() {
  const { t } = useTranslation();
  const mode = resolveThemeMode(useColorScheme());
  const state = useBookingChatScreenState();

  if (!state.isLoaded) {
    return (
      <CenterMessage>
        <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
      </CenterMessage>
    );
  }

  if (!state.isSignedIn) {
    return (
      <CenterMessage>
        <Text className="text-base text-muted-foreground text-center">{t("bookingChat.signInRequired")}</Text>
        <Pressable onPress={() => state.router.push("/sign-in")} className="mt-4 rounded-xl bg-primary px-5 py-2.5">
          <Text className="text-sm font-semibold text-primary-foreground">{t("common.actions.signIn")}</Text>
        </Pressable>
      </CenterMessage>
    );
  }

  if (!state.bookingIdParam) {
    return (
      <CenterMessage>
        <Text className="text-base text-muted-foreground text-center">{t("bookingChat.unavailable")}</Text>
      </CenterMessage>
    );
  }

  if (state.bookingChat === undefined) {
    return (
      <CenterMessage>
        <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
      </CenterMessage>
    );
  }

  if (!state.bookingChat) {
    return (
      <CenterMessage>
        <Text className="text-base text-muted-foreground text-center">{t("bookingChat.unavailable")}</Text>
      </CenterMessage>
    );
  }

  return <BookingChatContent state={state} mode={mode} />;
}
