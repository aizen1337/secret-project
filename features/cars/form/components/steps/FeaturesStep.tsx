import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { FEATURE_GROUPS } from "@/features/cars/components/lib/features";
import type { FieldErrors } from "@/features/cars/form/types";

type FeaturesStepProps = {
  selectedFeatures: string[];
  customFeatureInput: string;
  customFeatures: string[];
  fieldErrors: FieldErrors;
  customRemoveIconColor: string;
  t: (key: string) => string;
  onToggleFeature: (feature: string) => void;
  onCustomFeatureInputChange: (value: string) => void;
  onAddCustomFeature: () => void;
  onRemoveCustomFeature: (feature: string) => void;
};

export function FeaturesStep({
  selectedFeatures,
  customFeatureInput,
  customFeatures,
  fieldErrors,
  customRemoveIconColor,
  t,
  onToggleFeature,
  onCustomFeatureInputChange,
  onAddCustomFeature,
  onRemoveCustomFeature,
}: FeaturesStepProps) {
  return (
    <View className="bg-card rounded-xl border border-border p-4 mb-3">
      <Text className="text-base font-semibold text-foreground mb-3">{t("carForm.features.title")}</Text>

      {FEATURE_GROUPS.map((group) => (
        <View key={group.title} className="mb-3">
          <Text className="text-xs uppercase text-muted-foreground mb-2">{group.title}</Text>
          <View className="flex-row flex-wrap gap-2">
            {group.items.map((feature) => {
              const selected = selectedFeatures.includes(feature);
              return (
                <Pressable
                  key={`${group.title}-${feature}`}
                  onPress={() => onToggleFeature(feature)}
                  className={`px-3 py-2 rounded-full border ${selected ? "bg-primary border-primary" : "bg-secondary border-border"}`}
                >
                  <Text className={`text-xs font-medium ${selected ? "text-primary-foreground" : "text-foreground"}`}>
                    {feature}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <View className="flex-row gap-2 mt-2">
        <TextInput
          value={customFeatureInput}
          onChangeText={onCustomFeatureInputChange}
          placeholder={t("carForm.features.addCustomPlaceholder")}
          className="flex-1 rounded-lg border border-border px-3 py-3 text-foreground"
        />
        <Pressable onPress={onAddCustomFeature} className="px-4 rounded-lg bg-primary items-center justify-center">
          <Text className="text-sm font-semibold text-primary-foreground">{t("common.actions.add")}</Text>
        </Pressable>
      </View>

      {customFeatures.length > 0 ? (
        <View className="flex-row flex-wrap gap-2 mt-3">
          {customFeatures.map((feature) => (
            <Pressable
              key={`custom-${feature}`}
              onPress={() => onRemoveCustomFeature(feature)}
              className="px-3 py-2 rounded-full border border-border bg-card flex-row items-center"
            >
              <Text className="text-xs text-foreground mr-1">{feature}</Text>
              <Ionicons name="close" size={12} color={customRemoveIconColor} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {fieldErrors.features ? <Text className="text-xs text-destructive mt-2">{fieldErrors.features}</Text> : null}
    </View>
  );
}
