import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { getThemePalette, getTokenColor, resolveThemeMode } from "@/lib/themeTokens";
import { DateRangeModal } from "@/components/filters/date-range-picker/DateRangeModal";
import {
  buildCalendarDays,
  formatYmd,
  humanDate,
  parseYmd,
  startOfDay,
} from "@/components/filters/date-range-picker/dateRangeUtils";

type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  onApply: (startDate: string, endDate: string) => void;
};

export function DateRangePicker({
  startDate,
  endDate,
  onApply,
}: DateRangePickerProps) {
  const { t } = useTranslation();
  const mode = resolveThemeMode(useColorScheme());
  const [isOpen, setIsOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [selectionStep, setSelectionStep] = useState<"start" | "end">("start");
  const [visibleMonth, setVisibleMonth] = useState(parseYmd(startDate));

  const today = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const draftStartDate = parseYmd(draftStart);
  const draftEndDate = parseYmd(draftEnd);
  const edgeFillColor = getTokenColor(mode, "primary");
  const rangeFillColor = edgeFillColor;
  const rangeTextColor = getTokenColor(mode, "primaryForeground");
  const strongIconColor = getThemePalette(mode).foreground;

  const open = () => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setSelectionStep("start");
    setVisibleMonth(parseYmd(startDate));
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const selectDate = (pickedDate: Date) => {
    const picked = startOfDay(pickedDate);

    if (picked.getTime() < today.getTime()) return;

    const currentStart = parseYmd(draftStart);
    if (selectionStep === "start") {
      setDraftStart(formatYmd(picked));
      if (picked.getTime() > parseYmd(draftEnd).getTime()) {
        setDraftEnd(formatYmd(picked));
      }
      setSelectionStep("end");
      return;
    }

    if (picked.getTime() < currentStart.getTime()) {
      setDraftStart(formatYmd(picked));
      setDraftEnd(formatYmd(currentStart));
    } else {
      setDraftEnd(formatYmd(picked));
    }
    setSelectionStep("start");
  };

  const apply = () => {
    const start = parseYmd(draftStart);
    const end = parseYmd(draftEnd);
    if (start.getTime() > end.getTime()) {
      onApply(formatYmd(end), formatYmd(start));
    } else {
      onApply(draftStart, draftEnd);
    }
    close();
  };

  return (
    <>
      <Pressable
        onPress={open}
        className="h-16 rounded-xl border border-border bg-card px-3 py-2.5 justify-center"
      >
        <Text className="text-xs uppercase text-muted-foreground">{t("common.datePicker.dates")}</Text>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="text-sm text-foreground">
            {humanDate(startDate)} - {humanDate(endDate)}
          </Text>
          <Ionicons
            name="calendar-outline"
            size={18}
            color={strongIconColor}
          />
        </View>
      </Pressable>

      <DateRangeModal
        isOpen={isOpen}
        mode={mode}
        strongIconColor={strongIconColor}
        draftStart={draftStart}
        draftEnd={draftEnd}
        draftStartDate={draftStartDate}
        draftEndDate={draftEndDate}
        selectionStep={selectionStep}
        visibleMonth={visibleMonth}
        days={days}
        today={today}
        rangeFillColor={rangeFillColor}
        edgeFillColor={edgeFillColor}
        rangeTextColor={rangeTextColor}
        onClose={close}
        onApply={apply}
        onSelectDate={selectDate}
        onChangeMonth={(delta) =>
          setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1))
        }
      />
    </>
  );
}

