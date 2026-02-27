import { api } from "@/convex/_generated/api";

export const bookingsApi = {
  listMyTripsWithPayments: api.bookings.listMyTripsWithPayments,
  getBookingDetails: api.bookings.getBookingDetails,
  cancelReservation: api.bookings.cancelReservation,
  retryHostPayoutTransfer: api.bookings.retryHostPayoutTransfer,
  createReservationPayNowSession: api.stripe.createReservationPayNowSession,
  reconcileCheckoutSessionFromRedirect: api.stripe.reconcileCheckoutSessionFromRedirect,
  createBookingReview: api.bookingReviews.createBookingReview,
  bookingChat: {
    getBookingChat: api.bookingChat.getBookingChat,
    sendBookingMessage: api.bookingChat.sendBookingMessage,
    markBookingChatRead: api.bookingChat.markBookingChatRead,
    generateBookingChatImageUploadUrl: api.bookingChat.generateBookingChatImageUploadUrl,
    getMyBookingChatUnreadTotal: api.bookingChat.getMyBookingChatUnreadTotal,
    listMyBookingChats: api.bookingChat.listMyBookingChats,
  },
};
