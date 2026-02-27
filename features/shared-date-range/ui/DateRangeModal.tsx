import { Ionicons } from "@expo/vector-icons";
import { Modal, Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";
import { getTokenColor, type ThemeMode } from "@/lib/themeTokens";

import { CalendarGrid } from "./CalendarGrid";
import { humanDate, monthTitle } from "./dateRangeUtils";
import { HourScrollSelect } from "./HourScrollSelect";

type DateRangeModalProps = {
  isOpen: boolean;
  mode: ThemeMode;
  strongIconColor: string;
  draftStart: string;
  draftEnd: string;
  draftStartDate: Date;
  draftEndDate: Date;
  selectionStep: "start" | "end";
  visibleMonth: Date;
  days: Date[];
  today: Date;
  rangeFillColor: string;
  edgeFillColor: string;
  rangeTextColor: string;
  showHours?: boolean;
  draftStartHour?: string;
  draftEndHour?: string;
  onChangeStartHour?: (value: string) => void;
  onChangeEndHour?: (value: string) => void;
  onClose: () => void;
  onApply: () => void;
  onSelectDate: (date: Date) => void;
  onChangeMonth: (delta: number) => void;
};

export function DateRangeModal({
  isOpen,
  mode,
  strongIconColor,
  draftStart,
  draftEnd,
  draftStartDate,
  draftEndDate,
  selectionStep,
  visibleMonth,
  days,
  today,
  rangeFillColor,
  edgeFillColor,
  rangeTextColor,
  showHours = false,
  draftStartHour,
  draftEndHour,
  onChangeStartHour,
  onChangeEndHour,
  onClose,
  onApply,
  onSelectDate,
  onChangeMonth,
}: DateRangeModalProps) {
  const { t } = useTranslation();
  const renderHour = (value: string | undefined) => {
    const parsed = Number(value ?? "");
    if (!Number.isFinite(parsed)) return "00";
    return String(Math.max(0, Math.min(23, Math.trunc(parsed)))).padStart(2, "0");
  };
  const shouldRenderHours =
    showHours &&
    typeof draftStartHour === "string" &&
    typeof draftEndHour === "string" &&
    typeof onChangeStartHour === "function" &&
    typeof onChangeEndHour === "function";

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className={`flex-1 ${
          Platform.OS === "web" ? "items-center justify-center px-4" : "justify-end"
        }`}
        style={{ backgroundColor: getTokenColor(mode, "overlay") }}
      >
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View
          className={`bg-card border border-border ${
            Platform.OS === "web" ? "w-full max-w-[560px] rounded-2xl" : "h-[88%] rounded-t-3xl"
          }`}
        >
          <View className="px-4 py-4 border-b border-border">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-foreground">{t("common.datePicker.selectDates")}</Text>
              <Pressable onPress={onClose} className="p-2">
                <Ionicons name="close" size={20} color={strongIconColor} />
              </Pressable>
            </View>
            <Text className="text-sm text-muted-foreground">
              {shouldRenderHours
                ? `${humanDate(draftStart)} ${renderHour(draftStartHour)}:00 - ${humanDate(draftEnd)} ${renderHour(draftEndHour)}:00`
                : `${humanDate(draftStart)} - ${humanDate(draftEnd)}`}
            </Text>
            <Text className="text-xs text-muted-foreground mt-1">
              {selectionStep === "start" ? t("common.datePicker.pickCheckIn") : t("common.datePicker.pickCheckOut")}
            </Text>
          </View>

          <View className="px-4 py-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Pressable
                onPress={() => onChangeMonth(-1)}
                className="h-9 w-9 items-center justify-center rounded-full border border-border"
              >
                <Ionicons name="chevron-back" size={18} color={strongIconColor} />
              </Pressable>
              <Text className="text-base font-medium text-foreground">{monthTitle(visibleMonth)}</Text>
              <Pressable
                onPress={() => onChangeMonth(1)}
                className="h-9 w-9 items-center justify-center rounded-full border border-border"
              >
                <Ionicons name="chevron-forward" size={18} color={strongIconColor} />
              </Pressable>
            </View>

            <CalendarGrid
              days={days}
              visibleMonth={visibleMonth}
              today={today}
              draftStartDate={draftStartDate}
              draftEndDate={draftEndDate}
              rangeFillColor={rangeFillColor}
              edgeFillColor={edgeFillColor}
              rangeTextColor={rangeTextColor}
              onSelectDate={onSelectDate}
            />
          </View>

          {shouldRenderHours ? (
            <View className="px-4 pb-3">
              <Text className="text-xs uppercase text-muted-foreground">{t("common.datePicker.hours")}</Text>
              <View className="mt-2 flex-row gap-2">
                <HourScrollSelect
                  label={t("common.datePicker.pickStartHour")}
                  value={draftStartHour ?? "00"}
                  onChange={(value) => onChangeStartHour?.(value)}
                />
                <HourScrollSelect
                  label={t("common.datePicker.pickEndHour")}
                  value={draftEndHour ?? "23"}
                  onChange={(value) => onChangeEndHour?.(value)}
                />
              </View>
            </View>
          ) : null}

          <View className="flex-row gap-2 px-4 pb-4">
            <Pressable
              onPress={onClose}
              className="flex-1 items-center rounded-xl border border-border py-3"
            >
              <Text className="text-sm font-medium text-foreground">{t("common.actions.cancel")}</Text>
            </Pressable>
            <Pressable onPress={onApply} className="flex-1 items-center rounded-xl bg-primary py-3">
              <Text className="text-sm font-semibold text-primary-foreground">{t("common.datePicker.apply")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
