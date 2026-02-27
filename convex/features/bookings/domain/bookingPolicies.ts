const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateBillableDays(startIso: string, endIso: string) {
  const startTs = new Date(startIso).getTime();
  const endTs = new Date(endIso).getTime();
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || endTs < startTs) {
    throw new Error("INVALID_INPUT: Invalid booking range.");
  }
  return Math.max(1, Math.ceil((endTs - startTs + 1) / DAY_MS));
}

export function canCancelReservation(booking: any, payment: any) {
  if (!booking) return false;
  if (booking.status === "cancelled" || booking.status === "completed") {
    return false;
  }
  if (
    booking.status !== "pending" &&
    booking.status !== "payment_pending" &&
    booking.status !== "payment_failed"
  ) {
    return false;
  }

  if (!payment) {
    return true;
  }

  return (
    payment.status === "method_collection_pending" ||
    payment.status === "method_saved" ||
    payment.status === "checkout_created" ||
    payment.status === "failed" ||
    payment.status === "cancelled"
  );
}

export function canPayNowForBooking(booking: any, payment: any) {
  return Boolean(
    payment &&
      booking?.status === "payment_pending" &&
      payment.status === "method_saved" &&
      typeof payment.paymentDueAt === "number" &&
      Date.now() < payment.paymentDueAt,
  );
}

export function canRetryPayoutForHost(payment: any) {
  if (!payment) return false;
  if (payment.status !== "paid") return false;
  if ((payment.paymentStrategy ?? "platform_transfer_fallback") !== "platform_transfer_fallback") {
    return false;
  }
  if (payment.payoutStatus === "transferred" || payment.payoutStatus === "reversed") {
    return false;
  }
  if (typeof payment.releaseAt !== "number") {
    return false;
  }
  return Date.now() >= payment.releaseAt;
}
