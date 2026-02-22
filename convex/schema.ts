import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(), // immutable identity
    name: v.string(),
    imageUrl: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    reviewCount: v.optional(v.number()),
    avgRating: v.optional(v.number()),
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
    registrationNumber: v.optional(v.string()),
    registrationDate: v.optional(v.string()),
    kilometersLimitPerDay: v.optional(v.number()),
    depositAmount: v.optional(v.number()),
    fuelPolicy: v.optional(v.string()),
    fuelPolicyNote: v.optional(v.string()),
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
    updatedAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
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
    paymentStrategy: v.optional(
      v.union(v.literal("destination_manual_capture"), v.literal("platform_transfer_fallback")),
    ),
    captureStatus: v.optional(
      v.union(
        v.literal("not_required"),
        v.literal("pending_capture"),
        v.literal("captured"),
        v.literal("capture_failed"),
        v.literal("expired"),
      ),
    ),
    manualCaptureDeadline: v.optional(v.number()),
    currency: v.string(),
    rentalAmount: v.number(),
    platformFeeAmount: v.number(),
    hostAmount: v.number(),
    status: v.union(
      v.literal("method_collection_pending"),
      v.literal("method_saved"),
      v.literal("checkout_created"),
      v.literal("paid"),
      v.literal("refunded"),
      v.literal("partially_refunded"),
      v.literal("disputed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    paymentDueAt: v.optional(v.number()),
    stripeSetupIntentId: v.optional(v.string()),
    stripePaymentMethodId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    depositAmount: v.optional(v.number()),
    depositStatus: v.optional(
      v.union(
        v.literal("not_applicable"),
        v.literal("held"),
        v.literal("case_submitted"),
        v.literal("refund_pending"),
        v.literal("refunded"),
        v.literal("partially_refunded"),
        v.literal("retained"),
      ),
    ),
    depositClaimWindowEndsAt: v.optional(v.number()),
    depositRefundAmount: v.optional(v.number()),
    paidAt: v.optional(v.number()),
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

  renter_verifications: defineTable({
    userId: v.id("users"),
    identityStatus: v.union(
      v.literal("unverified"),
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected"),
    ),
    driverLicenseStatus: v.union(
      v.literal("unverified"),
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected"),
    ),
    identitySessionId: v.optional(v.string()),
    driverLicenseSessionId: v.optional(v.string()),
    identityVerifiedAt: v.optional(v.number()),
    driverLicenseVerifiedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_identity_session", ["identitySessionId"])
    .index("by_driver_session", ["driverLicenseSessionId"]),

  verification_checks: defineTable({
    userId: v.id("users"),
    subjectType: v.union(v.literal("renter")),
    checkType: v.union(v.literal("identity"), v.literal("driver_license")),
    status: v.union(
      v.literal("unverified"),
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected"),
    ),
    provider: v.union(v.literal("stripe")),
    providerSessionId: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_user_subject", ["userId", "subjectType"])
    .index("by_user_subject_check", ["userId", "subjectType", "checkType"])
    .index("by_provider_session", ["providerSessionId"]),

  booking_reviews: defineTable({
    bookingId: v.id("bookings"),
    authorUserId: v.id("users"),
    targetUserId: v.id("users"),
    direction: v.union(v.literal("host_to_renter"), v.literal("renter_to_host")),
    rating: v.number(),
    comment: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_booking", ["bookingId"])
    .index("by_author", ["authorUserId"])
    .index("by_target", ["targetUserId"])
    .index("by_target_direction", ["targetUserId", "direction"])
    .index("by_booking_author", ["bookingId", "authorUserId"]),

  deposit_cases: defineTable({
    paymentId: v.id("payments"),
    bookingId: v.id("bookings"),
    hostId: v.id("hosts"),
    renterId: v.id("users"),
    requestedAmount: v.number(),
    status: v.union(
      v.literal("open"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("partially_approved"),
      v.literal("rejected"),
      v.literal("resolved"),
    ),
    resolutionAmount: v.optional(v.number()),
    reason: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_payment", ["paymentId"])
    .index("by_booking", ["bookingId"])
    .index("by_host", ["hostId"])
    .index("by_payment_status", ["paymentId", "status"]),
});
