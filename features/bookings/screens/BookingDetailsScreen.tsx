import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBookingDetailsScreenState } from "@/features/bookings/hooks/useBookingDetailsScreenState";
import { BookingDetailsContent } from "@/features/bookings/ui/BookingDetailsContent";
import { resolveThemeMode } from "@/lib/themeTokens";

function CenterMessage({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="flex-1 items-center justify-center px-6">{children}</View>
    </SafeAreaView>
  );
}

export default function BookingDetailsScreen() {
  const { t } = useTranslation();
  const mode = resolveThemeMode(useColorScheme());
  const state = useBookingDetailsScreenState();

  if (!state.bookingIdParam) {
    return (
      <CenterMessage>
        <Text className="text-base text-muted-foreground">{t("bookingDetails.invalidBooking")}</Text>
        <Pressable onPress={state.handleGoBack} className="mt-3 rounded-lg bg-primary px-4 py-2">
          <Text className="text-primary-foreground font-semibold">{t("bookingDetails.back")}</Text>
        </Pressable>
      </CenterMessage>
    );
  }

  if (state.details === undefined) {
    return (
      <CenterMessage>
        <Text className="text-base text-muted-foreground">{t("bookingDetails.loading")}</Text>
      </CenterMessage>
    );
  }

  if (!state.details) {
    return (
      <CenterMessage>
        <Text className="text-base text-muted-foreground text-center">{t("bookingDetails.notAvailable")}</Text>
        <Pressable onPress={state.handleGoBack} className="mt-3 rounded-lg bg-primary px-4 py-2">
          <Text className="text-primary-foreground font-semibold">{t("bookingDetails.back")}</Text>
        </Pressable>
      </CenterMessage>
    );
  }

  return <BookingDetailsContent state={state} mode={mode} />;
}
