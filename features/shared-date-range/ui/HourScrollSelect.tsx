import { useEffect, useMemo, useRef } from "react";
import { FlatList, Pressable, View, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";

import { Text } from "@/components/ui/text";

type HourScrollSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const ITEM_HEIGHT = 34;
const VISIBLE_ROWS = 5;

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));

function clampHourIndex(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(23, Math.trunc(parsed)));
}

export function HourScrollSelect({ label, value, onChange }: HourScrollSelectProps) {
  const listRef = useRef<FlatList<string>>(null);
  const selectedIndex = useMemo(() => clampHourIndex(value), [value]);

  useEffect(() => {
    listRef.current?.scrollToOffset({
      offset: selectedIndex * ITEM_HEIGHT,
      animated: false,
    });
  }, [selectedIndex]);

  const selectAtIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(23, index));
    const nextValue = HOURS[clamped];
    if (nextValue !== value) {
      onChange(nextValue);
    }
    listRef.current?.scrollToOffset({
      offset: clamped * ITEM_HEIGHT,
      animated: true,
    });
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    selectAtIndex(index);
  };

  return (
    <View className="min-w-0 flex-1">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <View className="relative mt-1 overflow-hidden rounded-lg border border-border">
        <FlatList
          ref={listRef}
          data={HOURS}
          keyExtractor={(item) => item}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          initialScrollIndex={selectedIndex}
          onMomentumScrollEnd={handleMomentumEnd}
          showsVerticalScrollIndicator={false}
          style={{ height: ITEM_HEIGHT * VISIBLE_ROWS }}
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
          renderItem={({ item, index }) => {
            const isSelected = index === selectedIndex;
            return (
              <Pressable
                onPress={() => selectAtIndex(index)}
                className={`h-[34px] items-center justify-center ${
                  isSelected ? "bg-primary/15" : "bg-card"
                }`}
              >
                <Text className={`text-sm ${isSelected ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {item}:00
                </Text>
              </Pressable>
            );
          }}
        />
        <View
          pointerEvents="none"
          className="absolute inset-x-0 border-y border-border bg-transparent"
          style={{ top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT }}
        />
      </View>
    </View>
  );
}
