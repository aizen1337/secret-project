import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Platform, useWindowDimensions } from "react-native";
import { useAction, useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { api } from "@/convex/_generated/api";
import { useToast } from "@/components/feedback/useToast";
import { useCarDetailBookingActions } from "@/features/car-listing/hooks/useCarDetailBookingActions";
import { useCarDetailDerived } from "@/features/car-listing/hooks/useCarDetailDerived";
import { useCarDetailRouteState } from "@/features/car-listing/hooks/useCarDetailRouteState";

type CollectionMethod = "in_person" | "lockbox" | "host_delivery";
const COLLECTION_METHODS: CollectionMethod[] = ["in_person", "lockbox", "host_delivery"];

export function useCarDetailScreenState() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const { isSignedIn } = useAuth();
  const routeState = useCarDetailRouteState();
  const currentUser = useQuery(api.users.getCurrentUser);
  const offer = useQuery(api.cars.getCarOfferById, routeState.carId ? { carId: routeState.carId } : "skip");
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession) as any;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedCollectionMethod, setSelectedCollectionMethod] = useState<CollectionMethod>("in_person");
  const galleryRef = useRef<FlatList<string>>(null);

  const availableCollectionMethods = useMemo<CollectionMethod[]>(() => {
    const fromOffer = Array.isArray(offer?.car?.collectionMethods)
      ? (offer.car.collectionMethods as string[])
      : [];
    const filtered = fromOffer.filter((method): method is CollectionMethod =>
      COLLECTION_METHODS.includes(method as CollectionMethod),
    );
    return filtered.length > 0 ? filtered : ["in_person"];
  }, [offer?.car?.collectionMethods]);

  useEffect(() => {
    if (!availableCollectionMethods.includes(selectedCollectionMethod)) {
      setSelectedCollectionMethod(availableCollectionMethods[0] ?? "in_person");
    }
  }, [availableCollectionMethods, selectedCollectionMethod]);

  const derived = useCarDetailDerived({
    offer,
    currentUser,
    selectedStartDate: routeState.selectedStartDate,
    selectedEndDate: routeState.selectedEndDate,
    selectedStartHour: routeState.selectedStartHour,
    selectedEndHour: routeState.selectedEndHour,
    activeImageIndex,
  });
  const bookingActions = useCarDetailBookingActions({
    t,
    router,
    toast,
    isSignedIn: Boolean(isSignedIn),
    isWeb,
    car: derived.car,
    hostUserId: derived.hostUserId,
    isOwnListing: derived.isOwnListing,
    dateRangeValid: derived.dateRangeValid,
    startIso: derived.startIso,
    endIso: derived.endIso,
    createCheckoutSession,
    selectedCollectionMethod,
  });

  return {
    router,
    width,
    isWeb,
    isSignedIn,
    currentUser,
    offer,
    activeImageIndex,
    setActiveImageIndex,
    selectedCollectionMethod,
    setSelectedCollectionMethod,
    availableCollectionMethods,
    galleryRef,
    ...routeState,
    ...derived,
    ...bookingActions,
    isBookDisabled: bookingActions.isCreatingCheckout || !derived.dateRangeValid || derived.isOwnListing,
  };
}

export type CarDetailScreenController = ReturnType<typeof useCarDetailScreenState>;
