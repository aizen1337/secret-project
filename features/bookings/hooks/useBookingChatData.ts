import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { TFunction } from "i18next";

import type { Id } from "@/convex/_generated/dataModel";
import { bookingsApi } from "@/features/bookings/api";
import { toReadableFallback } from "@/features/bookings/helpers/statusPresentation";

export type BookingChatPayload = {
  booking: { id: string; status: string; startDate: string; endDate: string };
  viewerRole: "host" | "renter";
  counterpart: { id: string; name: string; imageUrl: string | null };
  chat: {
    unreadCount: number;
    canSend: boolean;
    sendDisabledReason: "not_confirmed" | "expired" | "cancelled" | null;
    windowEndsAt: number;
  };
  messages: {
    id: string;
    senderUserId: string;
    sender: { name: string; imageUrl: string | null } | null;
    text: string | null;
    imageUrls: string[];
    createdAt: number;
  }[];
};

export function useBookingChatData(bookingIdParam: string | undefined, t: TFunction) {
  const bookingChat = useQuery(
    bookingsApi.bookingChat.getBookingChat,
    bookingIdParam ? { bookingId: bookingIdParam as Id<"bookings">, limit: 50 } : "skip",
  ) as BookingChatPayload | null | undefined;

  const lastMessageId = bookingChat?.messages?.[bookingChat.messages.length - 1]?.id;
  const isReadOnly = !bookingChat?.chat?.canSend;

  const bookingStatusLabel = useMemo(() => {
    const status = bookingChat?.booking?.status?.toLowerCase();
    const key = `trips.statuses.${status}`;
    const translated = t(key);
    if (translated === key) return toReadableFallback(status);
    return translated;
  }, [bookingChat?.booking?.status, t]);

  const tripDateLabel = useMemo(() => {
    if (!bookingChat?.booking?.startDate || !bookingChat?.booking?.endDate) return null;
    return `${new Date(bookingChat.booking.startDate).toLocaleDateString()} - ${new Date(
      bookingChat.booking.endDate,
    ).toLocaleDateString()}`;
  }, [bookingChat?.booking?.startDate, bookingChat?.booking?.endDate]);

  const disabledReasonLabel = useMemo(() => {
    const reason = bookingChat?.chat?.sendDisabledReason;
    if (!reason) return null;
    return t(`bookingChat.disabledReasons.${reason}`);
  }, [bookingChat?.chat?.sendDisabledReason, t]);

  return {
    bookingChat,
    lastMessageId,
    isReadOnly,
    bookingStatusLabel,
    tripDateLabel,
    disabledReasonLabel,
  };
}
