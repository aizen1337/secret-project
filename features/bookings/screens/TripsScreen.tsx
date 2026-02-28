import { useColorScheme } from "nativewind";

import { useTripsScreenState } from "@/features/bookings/hooks/useTripsScreenState";
import { TripsContent } from "@/features/bookings/ui/TripsContent";
import { resolveThemeMode } from "@/lib/themeTokens";

export default function TripsScreen() {
  const mode = resolveThemeMode(useColorScheme());
  const state = useTripsScreenState();
  return <TripsContent state={state} mode={mode} />;
}
