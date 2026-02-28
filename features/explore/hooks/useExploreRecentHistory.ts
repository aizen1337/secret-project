import { useEffect, useState } from "react";

import type { RecentLocation } from "@/features/cars/components/dashboard/types";
import { clearGuestRecentSearches, loadGuestRecentSearches } from "@/lib/recentSearches";

export type UpsertRecentLocationSearchMutation = (args: {
  placeId: string;
  description: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}) => Promise<unknown>;

type UseExploreRecentHistoryParams = {
  isSignedIn: boolean;
  upsertRecentLocationSearch: UpsertRecentLocationSearchMutation;
};

export function useExploreRecentHistory({
  isSignedIn,
  upsertRecentLocationSearch,
}: UseExploreRecentHistoryParams) {
  const [guestRecentLocations, setGuestRecentLocations] = useState<RecentLocation[]>([]);
  const [isGuestHistoryLoaded, setIsGuestHistoryLoaded] = useState(false);
  const [isMergingGuestHistory, setIsMergingGuestHistory] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await loadGuestRecentSearches();
      if (cancelled) return;
      setGuestRecentLocations(rows);
      setIsGuestHistoryLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSignedIn || !isGuestHistoryLoaded || guestRecentLocations.length === 0 || isMergingGuestHistory) {
      return;
    }
    let cancelled = false;
    setIsMergingGuestHistory(true);

    void (async () => {
      try {
        for (const row of guestRecentLocations) {
          await upsertRecentLocationSearch({
            placeId: row.placeId,
            description: row.description,
            city: row.city,
            country: row.country,
            lat: row.lat,
            lng: row.lng,
          });
          if (cancelled) return;
        }
        await clearGuestRecentSearches();
        if (!cancelled) setGuestRecentLocations([]);
      } catch {
        // Keep local rows when merge fails and retry on next eligible render.
      } finally {
        if (!cancelled) setIsMergingGuestHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    guestRecentLocations,
    isGuestHistoryLoaded,
    isMergingGuestHistory,
    isSignedIn,
    upsertRecentLocationSearch,
  ]);

  return {
    guestRecentLocations,
    setGuestRecentLocations,
    isGuestHistoryLoaded,
  };
}
