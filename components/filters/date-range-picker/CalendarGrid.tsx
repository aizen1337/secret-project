import { View } from "react-native";

import { CalendarDayCell } from "./CalendarDayCell";
import { WEEKDAY_LABELS } from "./dateRangeUtils";
import { Text } from "@/components/ui/text";

type CalendarGridProps = {
  days: Date[];
  visibleMonth: Date;
  today: Date;
  draftStartDate: Date;
  draftEndDate: Date;
  rangeFillColor: string;
  edgeFillColor: string;
  rangeTextColor: string;
  onSelectDate: (date: Date) => void;
};

export function CalendarGrid({
  days,
  visibleMonth,
  today,
  draftStartDate,
  draftEndDate,
  rangeFillColor,
  edgeFillColor,
  rangeTextColor,
  onSelectDate,
}: CalendarGridProps) {
  return (
    <>
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
            {days.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => (
              <CalendarDayCell
                key={day.toISOString()}
                day={day}
                visibleMonth={visibleMonth}
                today={today}
                draftStartDate={draftStartDate}
                draftEndDate={draftEndDate}
                rangeFillColor={rangeFillColor}
                edgeFillColor={edgeFillColor}
                rangeTextColor={rangeTextColor}
                onSelectDate={onSelectDate}
              />
            ))}
          </View>
        ))}
      </View>
    </>
  );
}
