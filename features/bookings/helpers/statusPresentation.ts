export function toReadableFallback(status: string | undefined) {
  if (!status) return "-";
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function statusBadgeClasses(status: string | undefined) {
  const normalized = (status ?? "").toLowerCase();

  if (
    normalized === "paid" ||
    normalized === "confirmed" ||
    normalized === "completed" ||
    normalized === "transferred" ||
    normalized === "held" ||
    normalized === "refunded"
  ) {
    return {
      container: "bg-green-500/15",
      text: "text-green-300",
    };
  }

  if (
    normalized === "pending" ||
    normalized === "payment_pending" ||
    normalized === "method_collection_pending" ||
    normalized === "method_saved" ||
    normalized === "eligible" ||
    normalized === "refund_pending" ||
    normalized === "case_submitted" ||
    normalized === "under_review" ||
    normalized === "checkout_created"
  ) {
    return {
      container: "bg-amber-500/15",
      text: "text-amber-300",
    };
  }

  if (
    normalized === "failed" ||
    normalized === "payment_failed" ||
    normalized === "cancelled" ||
    normalized === "blocked" ||
    normalized === "error" ||
    normalized === "rejected" ||
    normalized === "retained" ||
    normalized === "reversed" ||
    normalized === "disputed"
  ) {
    return {
      container: "bg-red-500/15",
      text: "text-red-300",
    };
  }

  return {
    container: "bg-secondary",
    text: "text-muted-foreground",
  };
}
