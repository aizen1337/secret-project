import { useMemo, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, (month || 1) - 1, day || 1);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

type SingleDatePickerProps = {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
};

export function SingleDatePicker({ value, onChange, disabled }: SingleDatePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const currentDate = useMemo(() => fromDateInputValue(value), [value]);

  const handleNativeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setOpen(false);
    }
    if (event.type === "set" && selectedDate) {
      onChange(toDateInputValue(selectedDate));
    }
  };

  if (Platform.OS === "web") {
    return (
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        placeholder="YYYY-MM-DD"
        className="rounded-lg border border-border px-3 py-3 text-foreground"
      />
    );
  }

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        className="rounded-lg border border-border px-3 py-3 bg-card flex-row items-center justify-between"
      >
        <Text className="text-sm text-foreground">{value}</Text>
        <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
      </Pressable>

      {open ? (
        <View className="mt-2 rounded-lg border border-border bg-card p-2">
          <DateTimePicker
            value={currentDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleNativeChange}
          />
          {Platform.OS === "ios" ? (
            <Pressable onPress={() => setOpen(false)} className="mt-2 rounded-lg bg-primary px-3 py-2 items-center">
              <Text className="text-primary-foreground font-semibold">{t("common.actions.done")}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
