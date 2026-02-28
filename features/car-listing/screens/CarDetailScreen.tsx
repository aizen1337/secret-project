import { Text } from "react-native";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCarDetailScreenState } from "@/features/car-listing/hooks/useCarDetailScreenState";
import { CarDetailContent } from "@/features/car-listing/ui/CarDetailContent";
import { resolveThemeMode } from "@/lib/themeTokens";

function CenterMessage({ message }: { message: string }) {
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
      <Text className="text-lg text-muted-foreground text-center">{message}</Text>
    </SafeAreaView>
  );
}

export default function CarDetailScreen() {
  const { t } = useTranslation();
  const mode = resolveThemeMode(useColorScheme());
  const state = useCarDetailScreenState();

  if (!state.carId) {
    return <CenterMessage message={t("carDetail.notFound")} />;
  }

  if (state.offer === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-base text-muted-foreground">{t("carDetail.loading")}</Text>
      </SafeAreaView>
    );
  }

  if (!state.car) {
    return <CenterMessage message={t("carDetail.notFound")} />;
  }

  return <CarDetailContent state={state} mode={mode} />;
}
