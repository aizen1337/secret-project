import { ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";
import type { PromotionalOffer } from "@/features/cars/components/dashboard/types";

import { OfferCompactCard } from "./OfferCompactCard";

type OfferSectionProps = {
  title: string;
  subtitle?: string;
  offers: PromotionalOffer[];
  startDate: string;
  endDate: string;
  isLoading: boolean;
  error: string | null;
  emptyMessage: string;
};

export function OfferSection({
  title,
  subtitle,
  offers,
  startDate,
  endDate,
  isLoading,
  error,
  emptyMessage,
}: OfferSectionProps) {
  const { t } = useTranslation();
  const galleryItemWidth = 268;

  return (
    <View className="gap-2">
      <View>
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        {subtitle ? <Text className="mt-1 text-xs text-muted-foreground">{subtitle}</Text> : null}
      </View>

      {isLoading ? (
        <Text className="text-xs text-muted-foreground">{t("explore.promotions.loading")}</Text>
      ) : null}

      {!isLoading && error ? (
        <Text className="text-xs text-destructive">{t("explore.promotions.error")}</Text>
      ) : null}

      {!isLoading && !error && offers.length === 0 ? (
        <Text className="text-xs text-muted-foreground">{emptyMessage}</Text>
      ) : null}

      {!isLoading && !error && offers.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToAlignment="start"
          snapToInterval={galleryItemWidth}
          contentContainerStyle={{ gap: 12, paddingRight: 12, paddingVertical: 4 }}
        >
          {offers.map((offer) => (
            <OfferCompactCard
              key={offer.id}
              offer={offer}
              startDate={startDate}
              endDate={endDate}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
