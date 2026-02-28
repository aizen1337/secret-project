import { useEffect, useRef } from "react";
import { Keyboard, ScrollView } from "react-native";

import type { Id } from "@/convex/_generated/dataModel";

type UseBookingChatScrollSyncParams = {
  bookingIdParam: string | undefined;
  bookingChat: any;
  lastMessageId: string | undefined;
  markBookingChatRead: (args: { bookingId: Id<"bookings"> }) => Promise<unknown>;
};

export function useBookingChatScrollSync({
  bookingIdParam,
  bookingChat,
  lastMessageId,
  markBookingChatRead,
}: UseBookingChatScrollSyncParams) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!bookingIdParam || !bookingChat) return;
    if (Number(bookingChat.chat?.unreadCount ?? 0) <= 0) return;
    void markBookingChatRead({ bookingId: bookingIdParam as Id<"bookings"> }).catch(() => {
      // no-op for read marker failures
    });
  }, [bookingIdParam, bookingChat, lastMessageId, markBookingChatRead]);

  useEffect(() => {
    if (!lastMessageId) return;
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 0);
    return () => clearTimeout(timeout);
  }, [lastMessageId]);

  useEffect(() => {
    const onShow = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
    return () => {
      onShow.remove();
    };
  }, []);

  return { scrollRef };
}
