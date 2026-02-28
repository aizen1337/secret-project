import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";

import type { Id } from "@/convex/_generated/dataModel";
import { profileApi } from "@/features/profile/api";
import { normalizeParam } from "@/features/shared/helpers/routeParams";

export type UserProfileTab = "renter" | "host";
export type RatingDistribution = { 1: number; 2: number; 3: number; 4: number; 5: number };
export type PublicProfileReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: number;
  author: { id: string; name: string; imageUrl: string | null } | null;
};
export type PublicUserProfile = {
  user: { id: string; name: string; imageUrl: string | null; createdAt: number };
  renter: {
    completedBookingsCount: number;
    rating: { average: number; count: number; distribution: RatingDistribution };
    reviews: PublicProfileReview[];
  };
  host: {
    isHost: boolean;
    completedRentalsCount: number;
    rating: { average: number; count: number; distribution: RatingDistribution };
    reviews: PublicProfileReview[];
  };
};

function resolveInitialTab(roleParam: string | undefined): UserProfileTab {
  return roleParam === "host" ? "host" : "renter";
}

export function usePublicUserProfileScreenState() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const params = useLocalSearchParams<{ userId?: string | string[]; role?: string | string[] }>();
  const userIdParam = normalizeParam(params.userId);
  const roleParam = normalizeParam(params.role);
  const [activeTab, setActiveTab] = useState<UserProfileTab>(() => resolveInitialTab(roleParam));

  useEffect(() => {
    setActiveTab(resolveInitialTab(roleParam));
  }, [roleParam, userIdParam]);

  const profile = useQuery(
    profileApi.getPublicUserProfile,
    isSignedIn && userIdParam ? { userId: userIdParam as Id<"users"> } : "skip",
  ) as PublicUserProfile | null | undefined;

  return {
    router,
    isLoaded,
    isSignedIn,
    userIdParam,
    profile,
    activeTab,
    setActiveTab,
  };
}

export type PublicUserProfileScreenController = ReturnType<typeof usePublicUserProfileScreenState>;
