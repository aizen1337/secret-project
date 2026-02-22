export function verificationBadge(status: string | undefined) {
  if (status === "verified") return "bg-green-100 text-green-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  return "bg-secondary text-muted-foreground";
}
