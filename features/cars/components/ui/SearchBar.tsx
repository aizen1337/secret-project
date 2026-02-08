import { View, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search cars...",
  onFilterPress,
}: SearchBarProps) {
  return (
    <View className="flex-row items-center bg-secondary rounded-xl px-4 py-3 mb-4">
      <Ionicons name="search" size={20} color="#737373" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#737373"
        className="flex-1 ml-3 text-base text-foreground"
      />
      {onFilterPress && (
        <Pressable onPress={onFilterPress} className="ml-2 p-1">
          <Ionicons name="options-outline" size={20} color="#171717" />
        </Pressable>
      )}
    </View>
  );
}
