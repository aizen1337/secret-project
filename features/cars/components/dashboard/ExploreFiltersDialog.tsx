import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";
import { FEATURE_GROUPS } from "@/features/cars/components/lib/features";
import type { BrowseAdvancedFilters } from "@/features/cars/components/dashboard/types";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

type ExploreFiltersDialogProps = {
  visible: boolean;
  value: BrowseAdvancedFilters;
  onChange: (next: BrowseAdvancedFilters) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

export function ExploreFiltersDialog({
  visible,
  value,
  onChange,
  onApply,
  onReset,
  onClose,
}: ExploreFiltersDialogProps) {
  const { t } = useTranslation();
  const mode = resolveThemeMode(useColorScheme());
  const iconColor = getTokenColor(mode, "icon");

  const allFeatures = useMemo(
    () => Array.from(new Set(FEATURE_GROUPS.flatMap((group) => group.items))),
    [],
  );

  const toggleFeature = (feature: string) => {
    if (value.selectedFeatures.includes(feature)) {
      onChange({
        ...value,
        selectedFeatures: value.selectedFeatures.filter((item) => item !== feature),
      });
      return;
    }

    onChange({
      ...value,
      selectedFeatures: [...value.selectedFeatures, feature],
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 items-center justify-center px-4"
        style={{ backgroundColor: getTokenColor(mode, "overlay") }}
      >
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="max-h-[90%] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text className="text-lg font-semibold text-foreground">{t("explore.filters.title")}</Text>
            <Pressable onPress={onClose} className="rounded-full p-1">
              <Ionicons name="close" size={20} color={iconColor} />
            </Pressable>
          </View>

          <ScrollView className="px-4 py-4" showsVerticalScrollIndicator={false}>
            <Text className="mb-2 text-xs uppercase text-muted-foreground">{t("explore.filters.makeModel")}</Text>
            <View className="gap-2">
              <TextInput
                value={value.make}
                onChangeText={(next) => onChange({ ...value, make: next })}
                placeholder={t("explore.makePlaceholder")}
                placeholderTextColor={getTokenColor(mode, "placeholder")}
                className="rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground"
              />
              <TextInput
                value={value.model}
                onChangeText={(next) => onChange({ ...value, model: next })}
                placeholder={t("explore.modelPlaceholder")}
                placeholderTextColor={getTokenColor(mode, "placeholder")}
                className="rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground"
              />
            </View>

            <Text className="mb-2 mt-4 text-xs uppercase text-muted-foreground">{t("explore.filters.yearRange")}</Text>
            <View className="flex-row gap-2">
              <TextInput
                value={value.minYear}
                onChangeText={(next) => onChange({ ...value, minYear: next })}
                placeholder={t("explore.filters.minYear")}
                keyboardType="numeric"
                placeholderTextColor={getTokenColor(mode, "placeholder")}
                className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground"
              />
              <TextInput
                value={value.maxYear}
                onChangeText={(next) => onChange({ ...value, maxYear: next })}
                placeholder={t("explore.filters.maxYear")}
                keyboardType="numeric"
                placeholderTextColor={getTokenColor(mode, "placeholder")}
                className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground"
              />
            </View>

            <Text className="mb-2 mt-4 text-xs uppercase text-muted-foreground">{t("explore.filters.priceRange")}</Text>
            <View className="flex-row gap-2">
              <TextInput
                value={value.minPrice}
                onChangeText={(next) => onChange({ ...value, minPrice: next })}
                placeholder={t("explore.filters.minPrice")}
                keyboardType="numeric"
                placeholderTextColor={getTokenColor(mode, "placeholder")}
                className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground"
              />
              <TextInput
                value={value.maxPrice}
                onChangeText={(next) => onChange({ ...value, maxPrice: next })}
                placeholder={t("explore.filters.maxPrice")}
                keyboardType="numeric"
                placeholderTextColor={getTokenColor(mode, "placeholder")}
                className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground"
              />
            </View>

            <Text className="mb-2 mt-4 text-xs uppercase text-muted-foreground">{t("explore.filters.features")}</Text>
            <View className="flex-row flex-wrap gap-2">
              {allFeatures.map((feature) => {
                const selected = value.selectedFeatures.includes(feature);
                return (
                  <Pressable
                    key={feature}
                    onPress={() => toggleFeature(feature)}
                    className={`rounded-full border px-3 py-2 ${selected ? "border-primary bg-primary" : "border-border bg-secondary"}`}
                  >
                    <Text className={`text-xs font-medium ${selected ? "text-primary-foreground" : "text-foreground"}`}>
                      {feature}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mb-2 mt-4 text-xs uppercase text-muted-foreground">{t("explore.filters.other")}</Text>
            <Pressable
              onPress={() => onChange({ ...value, verifiedOnly: !value.verifiedOnly })}
              className={`rounded-xl border px-4 py-3 ${value.verifiedOnly ? "border-primary bg-primary/10" : "border-border bg-secondary"}`}
            >
              <Text className="text-sm text-foreground">{t("explore.filters.verifiedOnly")}</Text>
            </Pressable>
          </ScrollView>

          <View className="flex-row gap-2 border-t border-border px-4 py-3">
            <Pressable
              onPress={onReset}
              className="flex-1 items-center rounded-xl border border-border bg-secondary py-3"
            >
              <Text className="text-sm font-semibold text-foreground">{t("explore.filters.reset")}</Text>
            </Pressable>
            <Pressable
              onPress={onApply}
              className="flex-1 items-center rounded-xl bg-primary py-3"
            >
              <Text className="text-sm font-semibold text-primary-foreground">{t("explore.filters.apply")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
