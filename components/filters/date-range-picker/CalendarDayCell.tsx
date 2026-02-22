import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";

import { isSameDay, startOfDay } from "./dateRangeUtils";

type CalendarDayCellProps = {
  day: Date;
  visibleMonth: Date;
  today: Date;
  draftStartDate: Date;
  draftEndDate: Date;
  rangeFillColor: string;
  edgeFillColor: string;
  rangeTextColor: string;
  onSelectDate: (date: Date) => void;
};

export function CalendarDayCell({
  day,
  visibleMonth,
  today,
  draftStartDate,
  draftEndDate,
  rangeFillColor,
  edgeFillColor,
  rangeTextColor,
  onSelectDate,
}: CalendarDayCellProps) {
  const isCurrentMonth =
    day.getMonth() === visibleMonth.getMonth() &&
    day.getFullYear() === visibleMonth.getFullYear();
  const isDisabled = startOfDay(day).getTime() < today.getTime();
  const dayTime = day.getTime();
  const inRange =
    dayTime >= draftStartDate.getTime() && dayTime <= draftEndDate.getTime();
  const isStart = isSameDay(day, draftStartDate);
  const isEnd = isSameDay(day, draftEndDate);
  const isEdge = isStart || isEnd;
  const isSingleDay = isStart && isEnd;
  const showLeftRange = inRange && !isStart;
  const showRightRange = inRange && !isEnd;
  const showRangeText = inRange && !isEdge && !isDisabled;

  return (
    <View
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
                borderTopLeftRadius: isEnd ? 16 : 0,
                borderBottomLeftRadius: isEnd ? 16 : 0,
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
                borderTopRightRadius: isStart ? 16 : 0,
                borderBottomRightRadius: isStart ? 16 : 0,
              }}
            />
          ) : null}
        </>
      ) : null}
      <Pressable
        onPress={() => onSelectDate(day)}
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
                : showRangeText
                  ? "font-medium"
                  : isCurrentMonth
                    ? "text-foreground"
                    : "text-muted-foreground"
          }`}
          style={showRangeText ? { color: rangeTextColor } : undefined}
        >
          {day.getDate()}
        </Text>
      </Pressable>
    </View>
  );
}
