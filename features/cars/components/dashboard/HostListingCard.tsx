import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";

import { HostListingActions } from "./HostListingActions";

type HostListingCardProps = {
  car: {
    _id: string;
    title?: string;
    make: string;
    model: string;
    year: number;
    images: string[];
    location: {
      city: string;
      country: string;
    };
    pricePerDay: number;
    isActive: boolean;
  };
  isBusy: boolean;
  onEdit: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
};

export function HostListingCard({
  car,
  isBusy,
  onEdit,
  onArchiveToggle,
  onDelete,
}: HostListingCardProps) {
  const { t } = useTranslation();
  return (
    <View className="bg-card rounded-xl overflow-hidden mb-3 border border-border p-3">
      <View className="flex-row">
        <Image
          source={{ uri: car.images[0] }}
          className="w-24 h-24 rounded-lg"
          resizeMode="cover"
        />
        <View className="flex-1 pl-3">
          <View className="flex-row items-start justify-between">
            <Text className="font-semibold text-foreground flex-1 pr-2">
              {car.title || `${car.make} ${car.model}`}
            </Text>
            <View className={`rounded-full px-2 py-1 ${car.isActive ? "bg-verified-bg" : "bg-secondary"}`}>
              <Text className={`text-[10px] font-semibold ${car.isActive ? "text-verified-fg" : "text-muted-foreground"}`}>
                {car.isActive ? t("dashboard.listing.statusActive") : t("dashboard.listing.statusArchived")}
              </Text>
            </View>
          </View>
          <Text className="text-sm text-muted-foreground mt-1">
            {car.make} {car.model} - {car.year}
          </Text>
          <Text className="text-sm text-muted-foreground mt-1">
            {car.location.city}, {car.location.country}
          </Text>
          <Text className="text-sm text-foreground mt-1 font-medium">
            ${car.pricePerDay}{t("carDetail.perDay")}
          </Text>
        </View>
      </View>
      <HostListingActions
        isActive={car.isActive}
        isBusy={isBusy}
        onEdit={onEdit}
        onArchiveToggle={onArchiveToggle}
        onDelete={onDelete}
      />
    </View>
  );
}
