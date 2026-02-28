import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";

import { profileApi } from "@/features/profile/api";

export type ReviewEntry = {
  review: { _id: string; rating: number; comment: string };
  author: { name?: string } | null;
};

export function useProfileReviewsScreenState() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<"renter" | "host">("renter");
  const convexUser = useQuery(profileApi.getCurrentUser);
  const renterVerification = useQuery(profileApi.getMyRenterVerificationStatus, isSignedIn ? {} : "skip") as
    | { enabled?: boolean; readyToBook?: boolean }
    | undefined;
  const hostPayoutStatus = useQuery(profileApi.getHostPayoutStatus, isSignedIn ? {} : "skip") as
    | { hostVerified?: boolean }
    | undefined;
  const canViewRenterTab = Boolean(renterVerification?.enabled && renterVerification?.readyToBook);
  const canViewHostTab = Boolean(hostPayoutStatus?.hostVerified);
  const isDataLoading =
    isSignedIn &&
    (convexUser === undefined || renterVerification === undefined || hostPayoutStatus === undefined);

  useEffect(() => {
    if (activeTab === "renter" && !canViewRenterTab && canViewHostTab) {
      setActiveTab("host");
      return;
    }
    if (activeTab === "host" && !canViewHostTab && canViewRenterTab) {
      setActiveTab("renter");
    }
  }, [activeTab, canViewHostTab, canViewRenterTab]);

  const renterReviews = useQuery(
    profileApi.listReviewsForUser,
    convexUser?._id && canViewRenterTab
      ? { userId: convexUser._id, direction: "host_to_renter", limit: 20 }
      : "skip",
  ) as ReviewEntry[] | undefined;
  const renterSummary = useQuery(
    profileApi.getUserReviewSummary,
    convexUser?._id && canViewRenterTab
      ? { userId: convexUser._id, direction: "host_to_renter" }
      : "skip",
  ) as { count: number; average: number } | undefined;
  const hostReviews = useQuery(
    profileApi.listReviewsForUser,
    convexUser?._id && canViewHostTab
      ? { userId: convexUser._id, direction: "renter_to_host", limit: 20 }
      : "skip",
  ) as ReviewEntry[] | undefined;
  const hostSummary = useQuery(
    profileApi.getUserReviewSummary,
    convexUser?._id && canViewHostTab
      ? { userId: convexUser._id, direction: "renter_to_host" }
      : "skip",
  ) as { count: number; average: number } | undefined;
  const noVerifiedRoles = useMemo(() => !canViewRenterTab && !canViewHostTab, [canViewHostTab, canViewRenterTab]);

  return {
    router,
    isLoaded,
    isSignedIn,
    activeTab,
    setActiveTab,
    canViewRenterTab,
    canViewHostTab,
    isDataLoading,
    renterReviews,
    renterSummary,
    hostReviews,
    hostSummary,
    noVerifiedRoles,
  };
}

export type ProfileReviewsScreenController = ReturnType<typeof useProfileReviewsScreenState>;
