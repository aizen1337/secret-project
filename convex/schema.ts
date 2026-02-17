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
    stripeConnectAccountId: v.optional(v.string()),
    stripeOnboardingComplete: v.optional(v.boolean()),
    stripeChargesEnabled: v.optional(v.boolean()),
    stripePayoutsEnabled: v.optional(v.boolean()),
    updatedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  cars: defineTable({
    hostId: v.id("hosts"),
    title: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    pricePerDay: v.number(),
    availableFrom: v.optional(v.string()),
    availableUntil: v.optional(v.string()),
    formattedAddress: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    customFeatures: v.optional(v.array(v.string())),
    vin: v.optional(v.string()),
    registrationDate: v.optional(v.string()),
    isCarVerified: v.optional(v.boolean()),
    verificationSource: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    idempotencyKey: v.optional(v.string()),
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
    paymentId: v.optional(v.id("payments")),
    checkoutSessionId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("payment_pending"),
      v.literal("paid"),
      v.literal("confirmed"),
      v.literal("payment_failed"),
      v.literal("cancelled"),
      v.literal("completed")
    ),
    completedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_renter", ["renterId"])
    .index("by_car", ["carId"]),

  payments: defineTable({
    bookingId: v.id("bookings"),
    carId: v.id("cars"),
    renterId: v.id("users"),
    hostId: v.id("hosts"),
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    currency: v.string(),
    rentalAmount: v.number(),
    platformFeeAmount: v.number(),
    hostAmount: v.number(),
    status: v.union(
      v.literal("checkout_created"),
      v.literal("paid"),
      v.literal("refunded"),
      v.literal("partially_refunded"),
      v.literal("disputed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    payoutStatus: v.union(
      v.literal("blocked"),
      v.literal("eligible"),
      v.literal("transferred"),
      v.literal("reversed"),
      v.literal("error")
    ),
    stripeTransferId: v.optional(v.string()),
    stripeTransferReversalId: v.optional(v.string()),
    releaseAt: v.number(),
    lastWebhookEventId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_checkout_session", ["stripeCheckoutSessionId"])
    .index("by_payment_intent", ["stripePaymentIntentId"])
    .index("by_booking", ["bookingId"])
    .index("by_host_payout_status", ["hostId", "payoutStatus"])
    .index("by_release_at", ["payoutStatus", "releaseAt"]),

  reviews: defineTable({
    carId: v.id("cars"),
    authorId: v.id("users"),
    rating: v.number(),
    comment: v.string(),
    createdAt: v.number(),
  }).index("by_car", ["carId"]),
});
