import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(), // immutable identity
    name: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkUserId"]),

  hosts: defineTable({
    userId: v.id("users"),
    bio: v.optional(v.string()),
    isVerified: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  cars: defineTable({
    hostId: v.id("hosts"),
    title: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    pricePerDay: v.number(),
    location: v.object({
      city: v.string(),
      country: v.string(),
      lat: v.number(),
      lng: v.number(),
    }),
    images: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_active", ["isActive"])
    .index("by_host", ["hostId"])
    .index("by_city", ["location.city"]),

  bookings: defineTable({
    carId: v.id("cars"),
    renterId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    totalPrice: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("completed")
    ),
    createdAt: v.number(),
  })
    .index("by_renter", ["renterId"])
    .index("by_car", ["carId"]),

  reviews: defineTable({
    carId: v.id("cars"),
    authorId: v.id("users"),
    rating: v.number(),
    comment: v.string(),
    createdAt: v.number(),
  }).index("by_car", ["carId"]),
});
