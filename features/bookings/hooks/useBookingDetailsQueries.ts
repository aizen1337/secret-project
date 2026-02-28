import { useQuery } from "convex/react";

import { bookingsApi } from "@/features/bookings/api";

export function useBookingDetailsQueries(bookingIdParam: string | undefined) {
  const details = useQuery(
    bookingsApi.getBookingDetails,
    bookingIdParam ? { bookingId: bookingIdParam as any } : "skip",
  );

  return { details };
}
