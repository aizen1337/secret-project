import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToast } from "@/components/feedback/useToast";
import { bookingsApi } from "@/features/bookings/api";
import { useBookingChatComposer } from "@/features/bookings/hooks/useBookingChatComposer";
import { useBookingChatData } from "@/features/bookings/hooks/useBookingChatData";
import { useBookingChatScrollSync } from "@/features/bookings/hooks/useBookingChatScrollSync";
import { normalizeParam } from "@/features/shared/helpers/routeParams";

type BookingChatParams = {
  bookingId?: string | string[];
};

export function useBookingChatScreenState() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { isLoaded, isSignedIn } = useAuth();
  const params = useLocalSearchParams<BookingChatParams>();
  const bookingIdParam = normalizeParam(params.bookingId);
  const sendBookingMessage = useMutation(bookingsApi.bookingChat.sendBookingMessage) as any;
  const markBookingChatRead = useMutation(bookingsApi.bookingChat.markBookingChatRead) as any;
  const generateBookingChatImageUploadUrl = useMutation(
    bookingsApi.bookingChat.generateBookingChatImageUploadUrl,
  ) as any;

  const dataState = useBookingChatData(bookingIdParam, t);
  const composerState = useBookingChatComposer({
    t,
    toast,
    bookingIdParam,
    isReadOnly: dataState.isReadOnly,
    sendBookingMessage,
    generateBookingChatImageUploadUrl,
  });
  const scrollSyncState = useBookingChatScrollSync({
    bookingIdParam,
    bookingChat: dataState.bookingChat,
    lastMessageId: dataState.lastMessageId,
    markBookingChatRead,
  });

  return {
    isLoaded,
    isSignedIn,
    router,
    insets,
    bookingIdParam,
    ...dataState,
    ...composerState,
    ...scrollSyncState,
  };
}

export type BookingChatScreenController = ReturnType<typeof useBookingChatScreenState>;
