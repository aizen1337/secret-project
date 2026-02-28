import { useRef } from "react";
import { FlatList, useWindowDimensions } from "react-native";
import { useColorScheme } from "nativewind";
import { Redirect, useRouter } from "expo-router";

import type { CarItem } from "@/features/cars/components/dashboard/types";
import { useSearchScreenState } from "@/features/search/hooks/useSearchScreenState";
import { SearchScreenContent } from "@/features/search/ui/SearchScreenContent";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

export default function SearchScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const mode = resolveThemeMode(useColorScheme());
  const listRef = useRef<FlatList<CarItem>>(null);
  const state = useSearchScreenState();

  if (!state.hasValidCenter) return <Redirect href="/" />;

  return (
    <SearchScreenContent
      state={state}
      listRef={listRef}
      router={router}
      mode={mode}
      isMobile={width < 768}
      strongIconColor={getTokenColor(mode, "icon")}
    />
  );
}
