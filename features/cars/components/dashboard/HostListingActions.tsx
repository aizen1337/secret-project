import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";

type HostListingActionsProps = {
  isActive: boolean;
  isBusy: boolean;
  onEdit: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
};

export function HostListingActions({
  isActive,
  isBusy,
  onEdit,
  onArchiveToggle,
  onDelete,
}: HostListingActionsProps) {
  const { t } = useTranslation();
  return (
    <View className="mt-3 flex-row gap-2">
      <Pressable
        onPress={onEdit}
        disabled={isBusy}
        className={`flex-1 rounded-lg border border-border py-2 items-center ${
          isBusy ? "opacity-60" : ""
        }`}
      >
        <Text className="text-sm font-medium text-foreground">{t("common.actions.edit")}</Text>
      </Pressable>
      <Pressable
        onPress={onArchiveToggle}
        disabled={isBusy}
        className={`flex-1 rounded-lg py-2 items-center ${
          isActive ? "bg-secondary" : "bg-primary"
        } ${isBusy ? "opacity-60" : ""}`}
      >
        <Text className={`text-sm font-semibold ${isActive ? "text-foreground" : "text-primary-foreground"}`}>
          {isActive ? t("common.actions.archive") : t("common.actions.unarchive")}
        </Text>
      </Pressable>
      <Pressable
        onPress={onDelete}
        disabled={isBusy}
        className={`rounded-lg bg-red-600 px-4 py-2 items-center ${
          isBusy ? "opacity-60" : ""
        }`}
      >
        <Text className="text-sm font-semibold text-white">{t("common.actions.delete")}</Text>
      </Pressable>
    </View>
  );
}
