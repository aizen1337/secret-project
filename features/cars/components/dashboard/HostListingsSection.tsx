import { Alert, Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";

import { HostListingCard } from "./HostListingCard";

type CarListing = {
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

type HostListingsSectionProps = {
  cars: CarListing[] | undefined;
  isLoading: boolean;
  listingStatus: "active" | "archived";
  onChangeStatus: (status: "active" | "archived") => void;
  pendingCarId: string | null;
  onEditCar: (carId: string) => void;
  onArchiveCar: (carId: string) => Promise<void>;
  onUnarchiveCar: (carId: string) => Promise<void>;
  onDeleteCar: (carId: string) => Promise<void>;
  onAddNewCar: () => void;
};

export function HostListingsSection({
  cars,
  isLoading,
  listingStatus,
  onChangeStatus,
  pendingCarId,
  onEditCar,
  onArchiveCar,
  onUnarchiveCar,
  onDeleteCar,
  onAddNewCar,
}: HostListingsSectionProps) {
  const { t } = useTranslation();
  const askArchiveConfirmation = (carId: string) => {
    Alert.alert(
      t("dashboard.listing.archiveTitle"),
      t("dashboard.listing.archiveMessage"),
      [
        { text: t("common.actions.cancel"), style: "cancel" },
        { text: t("common.actions.archive"), style: "destructive", onPress: () => void onArchiveCar(carId) },
      ],
    );
  };

  const askDeleteConfirmation = (carId: string) => {
    if (Platform.OS === "web") {
      const confirmed = globalThis.confirm(t("dashboard.listing.deleteConfirmWeb"));
      if (confirmed) {
        void onDeleteCar(carId);
      }
      return;
    }

    Alert.alert(
      t("dashboard.listing.deleteTitle"),
      t("dashboard.listing.deleteMessage"),
      [
        { text: t("common.actions.cancel"), style: "cancel" },
        { text: t("common.actions.delete"), style: "destructive", onPress: () => void onDeleteCar(carId) },
      ],
    );
  };

  return (
    <View>
      <View className="flex-row bg-secondary rounded-xl p-1 mb-4">
        <Pressable
          onPress={() => onChangeStatus("active")}
          className={`flex-1 py-3 rounded-lg ${listingStatus === "active" ? "bg-card" : ""}`}
        >
          <Text
            className={`text-center font-medium ${
              listingStatus === "active" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {t("dashboard.listing.active")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChangeStatus("archived")}
          className={`flex-1 py-3 rounded-lg ${listingStatus === "archived" ? "bg-card" : ""}`}
        >
          <Text
            className={`text-center font-medium ${
              listingStatus === "archived" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {t("dashboard.listing.archived")}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <Text className="text-sm text-muted-foreground">{t("dashboard.loadingListings")}</Text>
      ) : cars && cars.length > 0 ? (
        cars.map((car) => (
          <HostListingCard
            key={car._id}
            car={car}
            isBusy={pendingCarId === car._id}
            onEdit={() => onEditCar(car._id)}
            onArchiveToggle={() =>
              car.isActive ? askArchiveConfirmation(car._id) : void onUnarchiveCar(car._id)
            }
            onDelete={() => askDeleteConfirmation(car._id)}
          />
        ))
      ) : (
        <View className="bg-card rounded-xl p-4 border border-border">
          <Text className="text-sm text-muted-foreground text-center">
            {listingStatus === "active" ? t("dashboard.listing.noActive") : t("dashboard.listing.noArchived")}
          </Text>
        </View>
      )}

      <Pressable
        onPress={onAddNewCar}
        className="bg-primary py-4 rounded-xl items-center mt-2"
      >
        <Text className="text-primary-foreground font-semibold text-base">
          {t("dashboard.listing.addNew")}
        </Text>
      </Pressable>
    </View>
  );
}
