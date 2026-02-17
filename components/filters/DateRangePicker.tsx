import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  View,
} from "react-native";

import { Text } from "@/components/ui/text";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  onApply: (startDate: string, endDate: string) => void;
};

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseYmd(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function monthTitle(monthDate: Date) {
  return monthDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function humanDate(value: string) {
  return parseYmd(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DateRangePicker({
  startDate,
  endDate,
  onApply,
}: DateRangePickerProps) {
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
  const rangeFillColor = getTokenColor(
    mode,
    mode === "dark" ? "calendarRangeDark" : "calendarRange",
  );
  const edgeFillColor = getTokenColor(mode, "primary");
  const strongIconColor = getTokenColor(mode, "foreground");

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
        className="rounded-xl border border-border bg-card px-3 py-3"
      >
        <Text className="text-xs uppercase text-muted-foreground">Dates</Text>
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

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={close}>
        <View
          className={`flex-1 ${
            Platform.OS === "web" ? "items-center justify-center px-4" : "justify-end"
          }`}
          style={{ backgroundColor: getTokenColor(mode, "overlay") }}
        >
          <Pressable className="absolute inset-0" onPress={close} />
          <View
            className={`bg-card border border-border ${
              Platform.OS === "web"
                ? "w-full max-w-[560px] rounded-2xl"
                : "h-[88%] rounded-t-3xl"
            }`}
          >
          <View className="px-4 py-4 border-b border-border">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-foreground">Select dates</Text>
              <Pressable onPress={close} className="p-2">
                <Ionicons
                  name="close"
                  size={20}
                  color={strongIconColor}
                />
              </Pressable>
            </View>
            <Text className="text-sm text-muted-foreground">
              {humanDate(draftStart)} - {humanDate(draftEnd)}
            </Text>
            <Text className="text-xs text-muted-foreground mt-1">
              {selectionStep === "start" ? "Pick check-in date" : "Pick check-out date"}
            </Text>
          </View>

          <View className="px-4 py-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Pressable
                onPress={() =>
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1),
                  )
                }
                className="h-9 w-9 items-center justify-center rounded-full border border-border"
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={strongIconColor}
                />
              </Pressable>
              <Text className="text-base font-medium text-foreground">
                {monthTitle(visibleMonth)}
              </Text>
              <Pressable
                onPress={() =>
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1),
                  )
                }
                className="h-9 w-9 items-center justify-center rounded-full border border-border"
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={strongIconColor}
                />
              </Pressable>
            </View>

            <View className="mb-2 flex-row">
              {WEEKDAY_LABELS.map((label) => (
                <View key={label} className="items-center py-2" style={{ flex: 1 }}>
                  <Text className="text-xs text-muted-foreground">{label}</Text>
                </View>
              ))}
            </View>

            <View className="gap-1">
              {Array.from({ length: 6 }, (_, weekIndex) => (
                <View key={`week-${weekIndex}`} className="flex-row">
                  {days.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => {
                    const isCurrentMonth =
                      day.getMonth() === visibleMonth.getMonth() &&
                      day.getFullYear() === visibleMonth.getFullYear();
                    const isDisabled = startOfDay(day).getTime() < today.getTime();
                    const dayTime = day.getTime();
                    const inRange =
                      dayTime >= draftStartDate.getTime() &&
                      dayTime <= draftEndDate.getTime();
                    const isStart = isSameDay(day, draftStartDate);
                    const isEnd = isSameDay(day, draftEndDate);
                    const isEdge = isStart || isEnd;
                    const isSingleDay = isStart && isEnd;
                    const showLeftRange = inRange && !isStart;
                    const showRightRange = inRange && !isEnd;

                    return (
                      <View
                        key={formatYmd(day)}
                        style={{
                          flex: 1,
                          height: 40,
                          justifyContent: "center",
                        }}
                      >
                        {inRange && !isSingleDay ? (
                          <>
                            {showLeftRange ? (
                              <View
                                style={{
                                  position: "absolute",
                                  left: 0,
                                  width: "50%",
                                  height: 32,
                                  backgroundColor: rangeFillColor,
                                  borderTopLeftRadius: isEdge ? 0 : 0,
                                  borderBottomLeftRadius: isEdge ? 16 : 0,
                                }}
                              />
                            ) : null}
                            {showRightRange ? (
                              <View
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  width: "50%",
                                  height: 32,
                                  backgroundColor: rangeFillColor,
                                  borderTopRightRadius: isEdge ? 16 : 0,
                                  borderBottomRightRadius: isEdge ? 16 : 0,
                                }}
                              />
                            ) : null}
                          </>
                        ) : null}
                        <Pressable
                          onPress={() => selectDate(day)}
                          disabled={isDisabled}
                          className="mx-auto items-center justify-center"
                          style={{
                            backgroundColor: isEdge ? edgeFillColor : "transparent",
                            width: 32,
                            height: 32,
                            borderRadius: 999,
                          }}
                        >
                          <Text
                            className={`text-sm ${
                              isDisabled
                                ? "text-muted-foreground/40"
                                : isEdge
                                  ? "text-primary-foreground font-semibold"
                                  : isCurrentMonth
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                            }`}
                          >
                            {day.getDate()}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          <View className="flex-row gap-2 px-4 pb-4">
            <Pressable
              onPress={close}
              className="flex-1 items-center rounded-xl border border-border py-3"
            >
              <Text className="text-sm font-medium text-foreground">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={apply}
              className="flex-1 items-center rounded-xl bg-primary py-3"
            >
              <Text className="text-sm font-semibold text-primary-foreground">Apply</Text>
            </Pressable>
          </View>
        </View>
        </View>
      </Modal>
    </>
  );
}

