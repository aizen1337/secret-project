import { useCallback, useState } from "react";
import * as ExpoLinking from "expo-linking";
import type { TFunction } from "i18next";

import type { Id } from "@/convex/_generated/dataModel";
import { toLocalizedErrorMessage } from "@/lib/errors";

type CollectionMethod = "in_person" | "lockbox" | "host_delivery";

type UseCarDetailBookingActionsParams = {
  t: TFunction;
  router: { push: (path: any) => void };
  toast: { error: (message: string) => void };
  isSignedIn: boolean;
  isWeb: boolean;
  car: any;
  hostUserId: string;
  isOwnListing: boolean;
  dateRangeValid: boolean;
  startIso: string;
  endIso: string;
  selectedCollectionMethod: CollectionMethod;
  createCheckoutSession: (args: {
    carId: Id<"cars">;
    successUrl: string;
    cancelUrl: string;
    startDate: string;
    endDate: string;
    collectionMethod?: CollectionMethod;
  }) => Promise<{ url: string }>;
};

export function useCarDetailBookingActions({
  t,
  router,
  toast,
  isSignedIn,
  isWeb,
  car,
  hostUserId,
  isOwnListing,
  dateRangeValid,
  startIso,
  endIso,
  selectedCollectionMethod,
  createCheckoutSession,
}: UseCarDetailBookingActionsParams) {
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  const handleOpenHostProfile = useCallback(() => {
    if (!hostUserId) return;
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    router.push({ pathname: "/user/[userId]", params: { userId: hostUserId, role: "host" } } as any);
  }, [hostUserId, isSignedIn, router]);

  const handleBook = useCallback(async () => {
    if (isOwnListing) {
      toast.error(t("carDetail.cannotBookOwnListing"));
      return;
    }
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (!dateRangeValid) {
      toast.error(t("carDetail.invalidDateRange"));
      return;
    }

    setIsCreatingCheckout(true);
    try {
      const webOrigin = isWeb && typeof window !== "undefined" ? window.location.origin : null;
      const successUrl = webOrigin
        ? `${webOrigin}/trips?checkout=success&session_id={CHECKOUT_SESSION_ID}`
        : ExpoLinking.createURL("/trips?checkout=success&session_id={CHECKOUT_SESSION_ID}");
      const cancelUrl = webOrigin
        ? `${webOrigin}/car/${car.id}?checkout=cancelled`
        : ExpoLinking.createURL(`/car/${car.id}?checkout=cancelled`);
      const checkout = await createCheckoutSession({
        carId: car.id as Id<"cars">,
        successUrl,
        cancelUrl,
        startDate: startIso,
        endDate: endIso,
        collectionMethod: selectedCollectionMethod,
      });
      if (isWeb && typeof window !== "undefined") {
        window.location.href = checkout.url;
        return;
      }
      await ExpoLinking.openURL(checkout.url);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      if (
        raw.startsWith("UNVERIFIED_RENTER:") ||
        raw.startsWith("VERIFICATION_PENDING:") ||
        raw.startsWith("VERIFICATION_REJECTED:")
      ) {
        toast.error(toLocalizedErrorMessage(error, t, "apiErrors.default"));
        router.push("/profile");
      } else {
        toast.error(toLocalizedErrorMessage(error, t, "carDetail.checkoutFailed"));
      }
    } finally {
      setIsCreatingCheckout(false);
    }
  }, [car?.id, createCheckoutSession, dateRangeValid, endIso, isOwnListing, isSignedIn, isWeb, router, selectedCollectionMethod, startIso, t, toast]);

  return { isCreatingCheckout, handleOpenHostProfile, handleBook };
}
