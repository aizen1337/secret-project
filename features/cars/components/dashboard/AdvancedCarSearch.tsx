import { TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";

type AdvancedCarSearchProps = {
  makeQuery: string;
  modelQuery: string;
  onChangeMake: (value: string) => void;
  onChangeModel: (value: string) => void;
  placeholderColor: string;
};

export function AdvancedCarSearch({
  makeQuery,
  modelQuery,
  onChangeMake,
  onChangeModel,
  placeholderColor,
}: AdvancedCarSearchProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-2 rounded-xl border border-border bg-card px-3 py-3">
      <TextInput
        value={makeQuery}
        onChangeText={onChangeMake}
        className="rounded-xl bg-secondary px-4 py-3 text-sm text-foreground"
        placeholder={t("explore.makePlaceholder")}
        placeholderTextColor={placeholderColor}
      />
      <TextInput
        value={modelQuery}
        onChangeText={onChangeModel}
        className="rounded-xl bg-secondary px-4 py-3 text-sm text-foreground"
        placeholder={t("explore.modelPlaceholder")}
        placeholderTextColor={placeholderColor}
      />
    </View>
  );
}
