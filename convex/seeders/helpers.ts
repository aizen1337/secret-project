export async function seedCarsInternal(ctx: any) {
  const existing = await ctx.db.query("cars").collect();
  if (existing.length > 0) return;

  const cars = [
    {
      title: "Tesla Model 3 – Long Range",
      make: "Tesla",
      model: "Model 3",
      year: 2023,
      pricePerDay: 120,
      location: {
        city: "San Francisco",
        country: "USA",
        lat: 37.7749,
        lng: -122.4194,
      },
      images: ["https://picsum.photos/800/600?1"],
    },
    {
      title: "BMW X5 – Luxury SUV",
      make: "BMW",
      model: "X5",
      year: 2022,
      pricePerDay: 150,
      location: {
        city: "Los Angeles",
        country: "USA",
        lat: 34.0522,
        lng: -118.2437,
      },
      images: ["https://picsum.photos/800/600?2"],
    },
  ];

  for (const car of cars) {
    await ctx.db.insert("cars", {
      hostId: 'jd70pcdndxvzdd1yr05s7k1ejs803qye',
      ...car,
      isActive: true,
      createdAt: Date.now(),
    });
  }
}

export async function seedBookingsInternal(ctx: any) {
  const user = await ctx.db.query("users").first();
  const cars = await ctx.db.query("cars").collect();

  if (!user || cars.length === 0) return;

  const existing = await ctx.db.query("bookings").collect();
  if (existing.length > 0) return;

  const now = Date.now();
  const day = 1000 * 60 * 60 * 24;

  await ctx.db.insert("bookings", {
    carId: cars[0]._id,
    renterId: user._id,
    startDate: new Date(now - 5 * day).toISOString(),
    endDate: new Date(now - 2 * day).toISOString(),
    totalPrice: cars[0].pricePerDay * 3,
    status: "completed",
    createdAt: Date.now(),
  });
}

export async function seedReviewsInternal(ctx: any) {
  const booking = await ctx.db
    .query("bookings")
    .filter((q: any) => q.eq(q.field("status"), "completed"))
    .first();

  if (!booking) return;

  const existing = await ctx.db.query("reviews").collect();
  if (existing.length > 0) return;

  await ctx.db.insert("reviews", {
    carId: booking.carId,
    authorId: booking.renterId,
    rating: 5,
    comment: "Amazing car, smooth ride and very clean!",
    createdAt: Date.now(),
  });
}
