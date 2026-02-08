import { Id } from "../_generated/dataModel";

type DateRange = {
  startDate: string;
  endDate: string;
};

export async function assertCarIsBookable(
  ctx: any,
  carId: Id<"cars">,
  { startDate, endDate }: DateRange
) {
  const car = await ctx.db.get(carId);
  if (!car || !car.isPublished) {
    throw new Error("Car not available");
  }

  const overlappingBookings = await ctx.db
    .query("bookings")
    .withIndex("by_car", q => q.eq("carId", carId))
    .filter(q =>
      q.and(
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "confirmed")
        ),
        q.lte(q.field("startDate"), endDate),
        q.gte(q.field("endDate"), startDate)
      )
    )
    .collect();

  if (overlappingBookings.length > 0) {
    throw new Error("Car already booked for selected dates");
  }

  return car;
}
