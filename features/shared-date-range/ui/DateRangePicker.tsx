import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";
import { DateRangeModal } from "./DateRangeModal";
import {
  buildCalendarDays,
  formatYmd,
  humanDate,
  parseYmd,
  startOfDay,
} from "./dateRangeUtils";

type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  startHour?: string;
  endHour?: string;
  showLabel?: boolean;
  onApply: (startDate: string, endDate: string) => void;
  onApplyHours?: (startHour: string, endHour: string) => void;
};

const DEFAULT_START_HOUR = "00";
const DEFAULT_END_HOUR = "23";

function sanitizeHour(value: string) {
  return value.replace(/\D/g, "").slice(0, 2);
}

function normalizeHour(value: string, fallback: string) {
  const digits = sanitizeHour(value);
  if (!digits) return fallback;
  const parsed = Number(digits);
  if (!Number.isFinite(parsed)) return fallback;
  const hour = Math.max(0, Math.min(23, Math.trunc(parsed)));
  return String(hour).padStart(2, "0");
}

function toUtcTimestamp(dateValue: string, hourValue: string, minute: number, second: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const hour = Number(hourValue);
  return Date.UTC(year, month - 1, day, hour, minute, second, 0);
}

export function DateRangePicker({
  startDate,
  endDate,
  startHour,
  endHour,
  showLabel = true,
  onApply,
  onApplyHours,
}: DateRangePickerProps) {
  const { t } = useTranslation();
  const mode = resolveThemeMode(useColorScheme());
  const [isOpen, setIsOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [draftStartHour, setDraftStartHour] = useState(startHour ?? DEFAULT_START_HOUR);
  const [draftEndHour, setDraftEndHour] = useState(endHour ?? DEFAULT_END_HOUR);
  const [selectionStep, setSelectionStep] = useState<"start" | "end">("start");
  const [visibleMonth, setVisibleMonth] = useState(parseYmd(startDate));

  const today = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const draftStartDate = parseYmd(draftStart);
  const draftEndDate = parseYmd(draftEnd);
  const edgeFillColor = getTokenColor(mode, "primary");
  const rangeFillColor = edgeFillColor;
  const rangeTextColor = getTokenColor(mode, "primaryForeground");
  const strongIconColor = getTokenColor(mode, "icon");
  const hasHourSelection =
    typeof startHour === "string" &&
    typeof endHour === "string" &&
    typeof onApplyHours === "function";

  const open = () => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setDraftStartHour(startHour ?? DEFAULT_START_HOUR);
    setDraftEndHour(endHour ?? DEFAULT_END_HOUR);
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
    let nextStartDate = draftStart;
    let nextEndDate = draftEnd;
    const start = parseYmd(draftStart);
    const end = parseYmd(draftEnd);
    if (start.getTime() > end.getTime()) {
      nextStartDate = formatYmd(end);
      nextEndDate = formatYmd(start);
    }

    if (!hasHourSelection) {
      onApply(nextStartDate, nextEndDate);
      close();
      return;
    }

    let nextStartHour = normalizeHour(draftStartHour, startHour ?? DEFAULT_START_HOUR);
    let nextEndHour = normalizeHour(draftEndHour, endHour ?? DEFAULT_END_HOUR);

    const startTs = toUtcTimestamp(nextStartDate, nextStartHour, 0, 0);
    const endTs = toUtcTimestamp(nextEndDate, nextEndHour, 59, 59);
    if (startTs > endTs) {
      nextEndDate = nextStartDate;
      nextEndHour = nextStartHour;
    }

    onApply(nextStartDate, nextEndDate);
    onApplyHours?.(nextStartHour, nextEndHour);
    close();
  };

  return (
    <>
      <Pressable
        onPress={open}
        className={`rounded-xl border border-border bg-card px-3 justify-center ${
          showLabel ? "h-16 py-2.5" : "h-14 py-2"
        }`}
      >
        {showLabel ? (
          <Text className="text-xs uppercase text-muted-foreground">{t("common.datePicker.dates")}</Text>
        ) : null}
        <View className={`${showLabel ? "mt-1" : "mt-0"} flex-row items-center justify-between`}>
          <Text className="text-sm text-foreground">
            {hasHourSelection
              ? `${humanDate(startDate)} ${normalizeHour(startHour ?? DEFAULT_START_HOUR, DEFAULT_START_HOUR)}:00 - ${humanDate(endDate)} ${normalizeHour(endHour ?? DEFAULT_END_HOUR, DEFAULT_END_HOUR)}:00`
              : `${humanDate(startDate)} - ${humanDate(endDate)}`}
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
        showHours={hasHourSelection}
        draftStartHour={draftStartHour}
        draftEndHour={draftEndHour}
        onChangeStartHour={(value) => setDraftStartHour(sanitizeHour(value))}
        onChangeEndHour={(value) => setDraftEndHour(sanitizeHour(value))}
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

