import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useColorScheme } from "nativewind";
import { Image, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";
import type { PromotionalOffer } from "@/features/cars/components/dashboard/types";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

type OfferCompactCardProps = {
  offer: PromotionalOffer;
  startDate: string;
  endDate: string;
  startHour: string;
  endHour: string;
};

export function OfferCompactCard({
  offer,
  startDate,
  endDate,
  startHour,
  endHour,
}: OfferCompactCardProps) {
  const { t } = useTranslation();
  const mode = resolveThemeMode(useColorScheme());
  const href = {
    pathname: `/car/${offer.id}`,
    params: { startDate, endDate, startHour, endHour },
  } as const;
  const primaryImage = offer.images[0] ?? "";
  const badge =
    offer.badge === "best_value"
      ? t("explore.promotions.badges.bestValue")
      : offer.badge === "top_rated"
        ? t("explore.promotions.badges.topRated")
        : offer.badge === "popular"
          ? t("explore.promotions.badges.popular")
          : null;

  return (
    <Link href={href as any} asChild>
      <Pressable className="w-64 overflow-hidden rounded-xl border border-border bg-card">
        <Image source={{ uri: primaryImage }} className="h-36 w-full" resizeMode="cover" />
        <View className="p-3">
          {badge ? (
            <View className="mb-2 self-start rounded-full bg-primary/15 px-2 py-1">
              <Text className="text-[10px] font-semibold text-primary">{badge}</Text>
            </View>
          ) : null}

          <Text className="text-sm font-semibold text-foreground">
            {offer.title || `${offer.make} ${offer.model}`}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {offer.make} {offer.model} - {offer.year}
          </Text>

          <View className="mt-2 flex-row items-center">
            <Ionicons name="location-outline" size={13} color={getTokenColor(mode, "iconMuted")} />
            <Text className="ml-1 text-xs text-muted-foreground">
              {offer.location.city}, {offer.location.country}
            </Text>
          </View>

          <View className="mt-2 flex-row items-center">
            <Ionicons name="star" size={13} color={getTokenColor(mode, "ratingStar")} />
            <Text className="ml-1 text-xs text-foreground">
              {t("explore.promotions.ratingSummary", {
                rating: offer.carRating.toFixed(1),
                count: offer.carReviewCount,
              })}
            </Text>
          </View>

          <View className="mt-3 flex-row items-baseline">
            <Text className="text-lg font-bold text-foreground">${offer.pricePerDay}</Text>
            <Text className="ml-1 text-xs text-muted-foreground">{t("carDetail.perDay")}</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
