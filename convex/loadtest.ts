import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type SeededCar = {
  _id: Id<"cars">;
  offerIds: Id<"car_offers">[];
  hostId: Id<"hosts">;
  pricePerDay: number;
  collectionMethods?: Array<"in_person" | "lockbox" | "host_delivery">;
  collectionInPersonInstructions?: string;
  collectionLockboxCode?: string;
  collectionLockboxInstructions?: string;
  collectionDeliveryInstructions?: string;
};

const POLAND_CITY_POOL = [
  { city: "Warsaw", lat: 52.2297, lng: 21.0122 },
  { city: "Krakow", lat: 50.0647, lng: 19.945 },
  { city: "Lodz", lat: 51.7592, lng: 19.456 },
  { city: "Wroclaw", lat: 51.1079, lng: 17.0385 },
  { city: "Poznan", lat: 52.4064, lng: 16.9252 },
  { city: "Gdansk", lat: 54.352, lng: 18.6466 },
  { city: "Szczecin", lat: 53.4285, lng: 14.5528 },
  { city: "Bydgoszcz", lat: 53.1235, lng: 18.0084 },
  { city: "Lublin", lat: 51.2465, lng: 22.5684 },
  { city: "Bialystok", lat: 53.1325, lng: 23.1688 },
];

type SeedInputUser = { clerkUserId: string; name?: string };
type SeedResolvedUser = { id: Id<"users">; clerkUserId: string; name?: string };

function assertLoadtestModeEnabled() {
  if (process.env.LOADTEST_MODE !== "true") {
    throw new Error("UNAUTHORIZED: LOADTEST_MODE is not enabled.");
  }
}

async function upsertUserByClerkId(ctx: any, args: { clerkUserId: string; name?: string }) {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", args.clerkUserId))
    .first();
  if (existing) {
    if (args.name && existing.name !== args.name) {
      await ctx.db.patch(existing._id, { name: args.name });
    }
    return existing._id as Id<"users">;
  }
  return (await ctx.db.insert("users", {
    clerkUserId: args.clerkUserId,
    name: args.name ?? `[LT] ${args.clerkUserId}`,
    createdAt: Date.now(),
  })) as Id<"users">;
}

async function listLoadtestUsersForSeeding(ctx: any): Promise<SeedInputUser[]> {
  const users = await ctx.db.query("users").collect();
  return users
    .filter((user: any) => String(user.name ?? "").startsWith("[LT]"))
    .sort((a: any, b: any) => String(a.clerkUserId).localeCompare(String(b.clerkUserId)))
    .map((user: any) => ({
      clerkUserId: String(user.clerkUserId),
      name: typeof user.name === "string" ? user.name : undefined,
    }));
}

async function listLoadtestUsersWithIds(ctx: any): Promise<SeedResolvedUser[]> {
  const users = await ctx.db.query("users").collect();
  return users
    .filter((user: any) => String(user.name ?? "").startsWith("[LT]"))
    .sort((a: any, b: any) => String(a.clerkUserId).localeCompare(String(b.clerkUserId)))
    .map((user: any) => ({
      id: user._id as Id<"users">,
      clerkUserId: String(user.clerkUserId),
      name: typeof user.name === "string" ? user.name : undefined,
    }));
}

function pickCollectionMethod(car: SeededCar, seed: number) {
  const methods: Array<"in_person" | "lockbox" | "host_delivery"> = car.collectionMethods?.length
    ? car.collectionMethods
    : ["in_person"];
  return methods[seed % methods.length] ?? "in_person";
}

function getCollectionSnapshot(car: SeededCar, method: "in_person" | "lockbox" | "host_delivery") {
  return {
    collectionMethod: method,
    collectionInPersonInstructions:
      method === "in_person" ? car.collectionInPersonInstructions ?? "Meet at parking P1." : undefined,
    collectionLockboxCode: method === "lockbox" ? car.collectionLockboxCode ?? "0000" : undefined,
    collectionLockboxInstructions:
      method === "lockbox" ? car.collectionLockboxInstructions ?? "Lockbox at gate A." : undefined,
    collectionDeliveryInstructions:
      method === "host_delivery"
        ? car.collectionDeliveryInstructions ?? "Host delivers to provided address."
        : undefined,
  };
}

function toIso(ms: number) {
  return new Date(ms).toISOString();
}

export const upsertLoadtestUsersBatchInternal = internalMutation({
  args: {
    users: v.array(
      v.object({
        clerkUserId: v.string(),
        name: v.optional(v.string()),
      }),
    ),
  },
  async handler(ctx, args) {
    assertLoadtestModeEnabled();
    let upserted = 0;
    for (const user of args.users) {
      await upsertUserByClerkId(ctx, user);
      upserted += 1;
    }
    return {
      ok: true,
      upserted,
    };
  },
});

export const seedLoadtestDatasetInternal = internalMutation({
  args: {
    users: v.optional(
      v.array(
        v.object({
          clerkUserId: v.string(),
          name: v.optional(v.string()),
        }),
      ),
    ),
    hostCount: v.number(),
    hostOffset: v.optional(v.number()),
    hostLimit: v.optional(v.number()),
    renterCount: v.number(),
    carsPerHost: v.number(),
    pricePerDay: v.optional(v.number()),
    startDate: v.string(),
    endDate: v.string(),
    bookingsPerRenter: v.optional(v.number()),
    chatMessagesPerBooking: v.optional(v.number()),
    includeReviews: v.optional(v.boolean()),
    offersPerCar: v.optional(v.number()),
    availabilityRangesPerOffer: v.optional(v.number()),
    polandOnly: v.optional(v.boolean()),
    renterOffset: v.optional(v.number()),
    renterLimit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    assertLoadtestModeEnabled();
    if (args.hostCount < 1 || args.renterCount < 1) {
      throw new Error("INVALID_INPUT: hostCount and renterCount must be > 0.");
    }
    const hostOffset = Math.max(0, Math.floor(args.hostOffset ?? 0));
    const hostLimitRaw = args.hostLimit == null ? args.hostCount : Math.floor(args.hostLimit);
    const hostLimit = Math.max(1, hostLimitRaw);
    const hostEnd = Math.min(args.hostCount, hostOffset + hostLimit);
    if (hostOffset >= args.hostCount) {
      return {
        ok: true,
        usersSeeded: 0,
        hostsSeeded: 0,
        rentersSeeded: 0,
        carsSeeded: 0,
        offersSeeded: 0,
        availabilityRangesSeeded: 0,
        bookingsSeeded: 0,
        paymentsSeeded: 0,
        chatsSeeded: 0,
        messagesSeeded: 0,
        reviewsSeeded: 0,
        bookingReviewsSeeded: 0,
        depositCasesSeeded: 0,
        race: {
          carId: null,
          offerId: null,
          startDate: args.startDate,
          endDate: args.endDate,
        },
        hostOffset,
        hostLimit: 0,
        hasMoreHostChunks: false,
      };
    }
    const renterOffset = Math.max(0, Math.floor(args.renterOffset ?? 0));
    const renterLimitRaw = args.renterLimit == null ? args.renterCount : Math.floor(args.renterLimit);
    const renterLimit = Math.max(1, renterLimitRaw);
    const renterEnd = Math.min(args.renterCount, renterOffset + renterLimit);
    if (renterOffset >= args.renterCount) {
      return {
        ok: true,
        usersSeeded: 0,
        hostsSeeded: 0,
        rentersSeeded: 0,
        carsSeeded: 0,
        offersSeeded: 0,
        availabilityRangesSeeded: 0,
        bookingsSeeded: 0,
        paymentsSeeded: 0,
        chatsSeeded: 0,
        messagesSeeded: 0,
        reviewsSeeded: 0,
        bookingReviewsSeeded: 0,
        depositCasesSeeded: 0,
        race: {
          carId: null,
          startDate: args.startDate,
          endDate: args.endDate,
        },
        renterOffset,
        renterLimit: 0,
        hasMoreRenterChunks: false,
      };
    }
    const requiredUsers = args.hostCount + args.renterCount;

    const seedUsers = args.users?.length ? args.users : await listLoadtestUsersForSeeding(ctx);
    if (seedUsers.length < requiredUsers) {
      throw new Error("INVALID_INPUT: Provided/stored users are fewer than host+renter requirements.");
    }

    const now = Date.now();
    const bookingsPerRenter = Math.max(0, Math.floor(args.bookingsPerRenter ?? 2));
    const chatMessagesPerBooking = Math.max(0, Math.floor(args.chatMessagesPerBooking ?? 2));
    const includeReviews = args.includeReviews ?? true;
    const offersPerCar = Math.max(1, Math.floor(args.offersPerCar ?? 1));
    const availabilityRangesPerOffer = Math.max(1, Math.floor(args.availabilityRangesPerOffer ?? 1));
    const polandOnly = args.polandOnly ?? true;

    let userIds: Id<"users">[] = [];
    if (args.users?.length) {
      for (const user of seedUsers) {
        userIds.push(await upsertUserByClerkId(ctx, user));
      }
    } else {
      const existingUsers = await listLoadtestUsersWithIds(ctx);
      if (existingUsers.length < requiredUsers) {
        throw new Error("INVALID_STATE: Expected pre-upserted [LT] users are missing.");
      }
      userIds = existingUsers.slice(0, requiredUsers).map((user) => user.id);
    }

    const hostUserIdsAll = userIds.slice(0, args.hostCount);
    const hostUserIds = hostUserIdsAll.slice(hostOffset, hostEnd);
    const renterUserIdsAll = userIds.slice(args.hostCount, args.hostCount + args.renterCount);
    const renterUserIds = renterUserIdsAll.slice(renterOffset, renterEnd);
    const hostIds: Id<"hosts">[] = [];
    const hostUserByHostId = new Map<string, Id<"users">>();

    for (let i = 0; i < hostUserIds.length; i += 1) {
      const userId = hostUserIds[i];
      const existingHost = await ctx.db
        .query("hosts")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
      if (existingHost) {
        hostIds.push(existingHost._id as Id<"hosts">);
        hostUserByHostId.set(String(existingHost._id), userId);
        continue;
      }
      const hostId = (await ctx.db.insert("hosts", {
        userId,
        bio: "[LT] Host profile",
        isVerified: true,
        createdAt: now,
        updatedAt: now,
      })) as Id<"hosts">;
      hostIds.push(hostId);
      hostUserByHostId.set(String(hostId), userId);
    }

    const seededCars: SeededCar[] = [];
    let offersSeeded = 0;
    let availabilityRangesSeeded = 0;
    for (let hostIndex = 0; hostIndex < hostIds.length; hostIndex += 1) {
      const hostId = hostIds[hostIndex];
      const globalHostIndex = hostOffset + hostIndex;
      for (let carIndex = 0; carIndex < args.carsPerHost; carIndex += 1) {
        const title = `[LT] Host ${hostIndex + 1} Car ${carIndex + 1}`;
        const existingCar = await ctx.db
          .query("cars")
          .withIndex("by_host", (q: any) => q.eq("hostId", hostId))
          .filter((q: any) => q.eq(q.field("title"), title))
          .first();
        if (existingCar) {
          const offers = await ctx.db
            .query("car_offers")
            .withIndex("by_car", (q: any) => q.eq("carId", existingCar._id))
            .collect();
          seededCars.push({
            _id: existingCar._id as Id<"cars">,
            hostId: existingCar.hostId as Id<"hosts">,
            pricePerDay: existingCar.pricePerDay,
            collectionMethods: existingCar.collectionMethods,
            collectionInPersonInstructions: existingCar.collectionInPersonInstructions,
            collectionLockboxCode: existingCar.collectionLockboxCode,
            collectionLockboxInstructions: existingCar.collectionLockboxInstructions,
            collectionDeliveryInstructions: existingCar.collectionDeliveryInstructions,
            offerIds: offers.map((offer: any) => offer._id as Id<"car_offers">),
          });
          continue;
        }

        const collectionMethods: Array<"in_person" | "lockbox" | "host_delivery"> =
          carIndex % 3 === 0
            ? ["in_person"]
            : carIndex % 3 === 1
              ? ["lockbox", "in_person"]
              : ["host_delivery", "in_person"];

        const carId = (await ctx.db.insert("cars", {
          hostId,
          title,
          make: "LT",
          model: "Sim",
          year: 2024,
          pricePerDay: args.pricePerDay ?? 79,
          availableFrom: args.startDate,
          availableUntil: args.endDate,
          location: {
            city: "Warsaw",
            country: "Poland",
            lat: 52.2297 + hostIndex * 0.0001,
            lng: 21.0122 + carIndex * 0.0001,
          },
          formattedAddress: "Loadtest street 1",
          images: ["https://example.com/loadtest-car.jpg"],
          isActive: true,
          isCarVerified: true,
          verificationSource: "seed",
          verifiedAt: now,
          collectionMethods,
          collectionInPersonInstructions: "Meet near terminal B.",
          collectionLockboxCode: "0000",
          collectionLockboxInstructions: "Lockbox is behind the right mirror.",
          collectionDeliveryInstructions: "Host delivers to your pin.",
          createdAt: now,
          updatedAt: now,
        })) as Id<"cars">;

        const offerIds: Id<"car_offers">[] = [];
        for (let offerIndex = 0; offerIndex < offersPerCar; offerIndex += 1) {
          const cityPick =
            POLAND_CITY_POOL[
              (globalHostIndex * args.carsPerHost + carIndex + offerIndex) % POLAND_CITY_POOL.length
            ];
          const offerTitle = offersPerCar > 1 ? `${title} Offer ${offerIndex + 1}` : title;
          const offerPrice = (args.pricePerDay ?? 79) + offerIndex * 3;
          const rangeStarts: Array<{ startDate: string; endDate: string }> = [];
          for (let rangeIndex = 0; rangeIndex < availabilityRangesPerOffer; rangeIndex += 1) {
            const startMs = Date.now() + (7 * rangeIndex + offerIndex + 1) * 24 * 60 * 60 * 1000;
            const endMs = startMs + (2 + (rangeIndex % 4)) * 24 * 60 * 60 * 1000;
            rangeStarts.push({ startDate: toIso(startMs), endDate: toIso(endMs) });
          }
          const offerId = (await ctx.db.insert("car_offers", {
            carId,
            title: offerTitle,
            pricePerDay: offerPrice,
            availableFrom: rangeStarts[0].startDate,
            availableUntil: rangeStarts[rangeStarts.length - 1].endDate,
            formattedAddress: `[LT] ${cityPick.city}, Poland`,
            location: {
              city: cityPick.city,
              country: polandOnly ? "Poland" : "Poland",
              lat: cityPick.lat + globalHostIndex * 0.0001,
              lng: cityPick.lng + carIndex * 0.0001,
            },
            isActive: true,
            isOfferVerified: true,
            verificationSource: "seed",
            verifiedAt: now,
            createdAt: now,
            updatedAt: now,
          })) as Id<"car_offers">;
          offerIds.push(offerId);
          offersSeeded += 1;
          for (const range of rangeStarts) {
            await ctx.db.insert("offer_availability_ranges", {
              offerId,
              startDate: range.startDate,
              endDate: range.endDate,
              createdAt: now,
              updatedAt: now,
            });
            availabilityRangesSeeded += 1;
          }
        }

        seededCars.push({
          _id: carId,
          offerIds,
          hostId,
          pricePerDay: args.pricePerDay ?? 79,
          collectionMethods: [...collectionMethods],
          collectionInPersonInstructions: "Meet near terminal B.",
          collectionLockboxCode: "0000",
          collectionLockboxInstructions: "Lockbox is behind the right mirror.",
          collectionDeliveryInstructions: "Host delivers to your pin.",
        });
      }
    }

    const seededBookingIds: Id<"bookings">[] = [];
    const seededPaymentIds: Id<"payments">[] = [];
    let chatsSeeded = 0;
    let messagesSeeded = 0;
    let reviewsSeeded = 0;
    let bookingReviewsSeeded = 0;
    let depositCasesSeeded = 0;

    const statusCycle: Array<
      "pending" | "payment_pending" | "paid" | "confirmed" | "in_progress" | "cancelled" | "completed"
    > = ["pending", "payment_pending", "paid", "confirmed", "in_progress", "cancelled", "completed"];

    for (let renterIndex = 0; renterIndex < renterUserIds.length; renterIndex += 1) {
      const globalRenterIndex = renterOffset + renterIndex;
      const renterId = renterUserIds[renterIndex];
      for (let i = 0; i < bookingsPerRenter; i += 1) {
        const bookingSeed = globalRenterIndex * Math.max(1, bookingsPerRenter) + i;
        const car = seededCars[bookingSeed % seededCars.length];
        const offerId = car.offerIds.length > 0 ? car.offerIds[bookingSeed % car.offerIds.length] : undefined;
        const offer = offerId ? await ctx.db.get(offerId) : null;
        const dayCount = 1 + (bookingSeed % 4);
        const startMs = now + (1 + (bookingSeed % 30)) * 24 * 60 * 60 * 1000;
        const endMs = startMs + dayCount * 24 * 60 * 60 * 1000;
        const status = statusCycle[bookingSeed % statusCycle.length];
        const method = pickCollectionMethod(car, bookingSeed);
        const totalPrice = Number(offer?.pricePerDay ?? car.pricePerDay) * dayCount;

        const collectionSnapshot = getCollectionSnapshot(car, method);

        const bookingId = (await ctx.db.insert("bookings", {
          carId: car._id,
          offerId,
          renterId,
          startDate: toIso(startMs),
          endDate: toIso(endMs),
          totalPrice,
          status,
          ...collectionSnapshot,
          hostCollectionConfirmedAt:
            status === "in_progress" || status === "completed" ? startMs - 30 * 60 * 1000 : undefined,
          renterCollectionConfirmedAt:
            status === "in_progress" || status === "completed" ? startMs - 20 * 60 * 1000 : undefined,
          tripStartedAt: status === "in_progress" || status === "completed" ? startMs : undefined,
          completedAt: status === "completed" ? endMs : undefined,
          createdAt: now + bookingSeed,
          updatedAt: now + bookingSeed,
        })) as Id<"bookings">;

        seededBookingIds.push(bookingId);

        const needsPayment = status !== "pending";
        let paymentId: Id<"payments"> | null = null;

        if (needsPayment) {
          const platformFeeAmount = Math.round(totalPrice * 0.15);
          const hostAmount = totalPrice - platformFeeAmount;
          const paymentStatus =
            status === "cancelled"
              ? "cancelled"
              : status === "payment_pending"
                ? "checkout_created"
                : "paid";

          paymentId = (await ctx.db.insert("payments", {
            bookingId,
            carId: car._id,
            renterId,
            hostId: car.hostId,
            stripeCheckoutSessionId: `cs_test_lt_${bookingSeed}`,
            stripePaymentIntentId: paymentStatus === "paid" ? `pi_test_lt_${bookingSeed}` : undefined,
            currency: "usd",
            rentalAmount: totalPrice,
            platformFeeAmount,
            hostAmount,
            status: paymentStatus,
            payoutStatus: paymentStatus === "paid" ? "eligible" : "blocked",
            releaseAt: endMs + 48 * 60 * 60 * 1000,
            paidAt: paymentStatus === "paid" ? startMs : undefined,
            createdAt: now + bookingSeed,
            updatedAt: now + bookingSeed,
          })) as Id<"payments">;
          seededPaymentIds.push(paymentId);

          await ctx.db.patch(bookingId, {
            paymentId,
            checkoutSessionId: `cs_test_lt_${bookingSeed}`,
            updatedAt: Date.now(),
          });
        }

        if (status !== "pending") {
          const hostUserId = hostUserByHostId.get(String(car.hostId));
          if (!hostUserId) {
            throw new Error("INTEGRITY_ERROR: Missing host user mapping during seed.");
          }

          await ctx.db.insert("booking_chats", {
            bookingId,
            hostUserId,
            renterUserId: renterId,
            hostUnreadCount: 0,
            renterUnreadCount: 0,
            hostLastReadAt: now,
            renterLastReadAt: now,
            lastMessageAt: now,
            lastMessageSenderId: renterId,
            lastMessagePreview: "[LT] Seeded conversation",
            createdAt: now,
            updatedAt: now,
          });
          chatsSeeded += 1;

          for (let m = 0; m < chatMessagesPerBooking; m += 1) {
            const senderUserId = m % 2 === 0 ? renterId : hostUserId;
            await ctx.db.insert("booking_messages", {
              bookingId,
              senderUserId,
              text: `[LT] Message ${m + 1}`,
              createdAt: now + m,
            });
            messagesSeeded += 1;
          }

          if (status === "completed" && includeReviews && hostUserId) {
            await ctx.db.insert("reviews", {
              carId: car._id,
              authorId: renterId,
              rating: 5,
              comment: "[LT] Completed trip review",
              createdAt: now,
            });
            reviewsSeeded += 1;

            await ctx.db.insert("booking_reviews", {
              bookingId,
              authorUserId: renterId,
              targetUserId: hostUserId,
              direction: "renter_to_host",
              rating: 5,
              comment: "[LT] Great host",
              createdAt: now,
              updatedAt: now,
            });
            bookingReviewsSeeded += 1;
          }

          if (status === "completed" && paymentId && bookingSeed % 25 === 0) {
            await ctx.db.insert("deposit_cases", {
              paymentId,
              bookingId,
              hostId: car.hostId,
              renterId,
              requestedAmount: Math.min(75, totalPrice),
              status: "resolved",
              resolutionAmount: Math.min(40, totalPrice),
              reason: "[LT] Minor interior cleanup",
              createdAt: now,
              updatedAt: now,
            });
            depositCasesSeeded += 1;
          }
        }
      }
    }

    return {
      ok: true,
      usersSeeded: userIds.length,
      hostsSeeded: hostIds.length,
      rentersSeeded: renterUserIds.length,
      carsSeeded: seededCars.length,
      offersSeeded,
      availabilityRangesSeeded,
      bookingsSeeded: seededBookingIds.length,
      paymentsSeeded: seededPaymentIds.length,
      chatsSeeded,
      messagesSeeded,
      reviewsSeeded,
      bookingReviewsSeeded,
      depositCasesSeeded,
      race: {
        carId: seededCars[0]?._id ?? null,
        offerId: seededCars[0]?.offerIds?.[0] ?? null,
        startDate: args.startDate,
        endDate: args.endDate,
      },
      renterOffset,
      renterLimit: renterUserIds.length,
      hasMoreRenterChunks: renterEnd < args.renterCount,
      hostOffset,
      hostLimit: hostUserIds.length,
      hasMoreHostChunks: hostEnd < args.hostCount,
    };
  },
});

export const resetLoadtestDatasetInternal = internalMutation({
  args: {},
  async handler(ctx) {
    assertLoadtestModeEnabled();

    const users = await ctx.db.query("users").collect();
    const loadtestUserIds = new Set<string>(
      users
        .filter((u: any) => String(u.name ?? "").startsWith("[LT]"))
        .map((u: any) => String(u._id)),
    );

    const hosts = await ctx.db.query("hosts").collect();
    const loadtestHostIds = new Set<string>(
      hosts
        .filter((h: any) => loadtestUserIds.has(String(h.userId)))
        .map((h: any) => String(h._id)),
    );

    const cars = await ctx.db.query("cars").collect();
    const loadtestCarIds = new Set<string>(
      cars
        .filter(
          (c: any) =>
            loadtestHostIds.has(String(c.hostId)) || String(c.title ?? "").startsWith("[LT]"),
        )
        .map((c: any) => String(c._id)),
    );

    const bookings = await ctx.db.query("bookings").collect();
    const loadtestBookingIds = new Set<string>(
      bookings
        .filter(
          (b: any) =>
            loadtestCarIds.has(String(b.carId)) || loadtestUserIds.has(String(b.renterId)),
        )
        .map((b: any) => String(b._id)),
    );

    const payments = await ctx.db.query("payments").collect();
    const loadtestPaymentIds = new Set<string>(
      payments
        .filter(
          (p: any) =>
            loadtestBookingIds.has(String(p.bookingId)) ||
            loadtestCarIds.has(String(p.carId)) ||
            loadtestHostIds.has(String(p.hostId)) ||
            loadtestUserIds.has(String(p.renterId)),
        )
        .map((p: any) => String(p._id)),
    );

    const offers = await ctx.db.query("car_offers").collect();
    const loadtestOfferIds = new Set<string>(
      offers
        .filter((o: any) => loadtestCarIds.has(String(o.carId)))
        .map((o: any) => String(o._id)),
    );

    const bookingMessages = await ctx.db.query("booking_messages").collect();
    for (const message of bookingMessages) {
      if (loadtestBookingIds.has(String(message.bookingId))) {
        await ctx.db.delete(message._id);
      }
    }

    const bookingChats = await ctx.db.query("booking_chats").collect();
    for (const chat of bookingChats) {
      if (loadtestBookingIds.has(String(chat.bookingId))) {
        await ctx.db.delete(chat._id);
      }
    }

    const bookingReviews = await ctx.db.query("booking_reviews").collect();
    for (const review of bookingReviews) {
      if (loadtestBookingIds.has(String(review.bookingId))) {
        await ctx.db.delete(review._id);
      }
    }

    const reviews = await ctx.db.query("reviews").collect();
    for (const review of reviews) {
      if (loadtestCarIds.has(String(review.carId)) || loadtestUserIds.has(String(review.authorId))) {
        await ctx.db.delete(review._id);
      }
    }

    const depositCases = await ctx.db.query("deposit_cases").collect();
    for (const depositCase of depositCases) {
      if (
        loadtestBookingIds.has(String(depositCase.bookingId)) ||
        loadtestPaymentIds.has(String(depositCase.paymentId))
      ) {
        await ctx.db.delete(depositCase._id);
      }
    }

    const ranges = await ctx.db.query("offer_availability_ranges").collect();
    for (const range of ranges) {
      if (loadtestOfferIds.has(String(range.offerId))) {
        await ctx.db.delete(range._id);
      }
    }

    for (const offer of offers) {
      if (loadtestOfferIds.has(String(offer._id))) {
        await ctx.db.delete(offer._id);
      }
    }

    for (const payment of payments) {
      if (loadtestPaymentIds.has(String(payment._id))) {
        await ctx.db.delete(payment._id);
      }
    }

    for (const booking of bookings) {
      if (loadtestBookingIds.has(String(booking._id))) {
        await ctx.db.delete(booking._id);
      }
    }

    for (const car of cars) {
      if (loadtestCarIds.has(String(car._id))) {
        await ctx.db.delete(car._id);
      }
    }

    for (const host of hosts) {
      if (loadtestHostIds.has(String(host._id))) {
        await ctx.db.delete(host._id);
      }
    }

    for (const user of users) {
      if (loadtestUserIds.has(String(user._id))) {
        await ctx.db.delete(user._id);
      }
    }

    return {
      ok: true,
      deleted: {
        users: loadtestUserIds.size,
        hosts: loadtestHostIds.size,
        cars: loadtestCarIds.size,
        bookings: loadtestBookingIds.size,
        payments: loadtestPaymentIds.size,
      },
    };
  },
});

export const snapshotLoadtestStateInternal = internalQuery({
  args: {},
  async handler(ctx) {
    assertLoadtestModeEnabled();

    const cars = await ctx.db.query("cars").collect();
    const offers = await ctx.db.query("car_offers").collect();
    const bookings = await ctx.db.query("bookings").collect();
    const payments = await ctx.db.query("payments").collect();

    const loadtestCars = cars.filter((c: any) => String(c.title ?? "").startsWith("[LT]"));
    const loadtestCarIds = new Set(loadtestCars.map((c: any) => String(c._id)));
    const loadtestBookings = bookings.filter((b: any) => loadtestCarIds.has(String(b.carId)));
    const loadtestBookingIds = new Set(loadtestBookings.map((b: any) => String(b._id)));
    const loadtestPayments = payments.filter((p: any) => loadtestBookingIds.has(String(p.bookingId)));

    const offerByCarId = new Map<string, string>();
    for (const offer of offers) {
      if (!offerByCarId.has(String(offer.carId))) {
        offerByCarId.set(String(offer.carId), String(offer._id));
      }
    }

    return {
      generatedAt: Date.now(),
      cars: loadtestCars.map((car: any) => ({
        id: String(car._id),
        offerId: offerByCarId.get(String(car._id)) ?? null,
        carId: String(car._id),
        hostId: String(car.hostId),
        title: car.title,
      })),
      bookings: loadtestBookings.map((booking: any) => ({
        id: String(booking._id),
        carId: String(booking.carId),
        offerId: booking.offerId ? String(booking.offerId) : null,
        renterId: String(booking.renterId),
        startDate: booking.startDate,
        endDate: booking.endDate,
        status: booking.status,
        paymentId: booking.paymentId ? String(booking.paymentId) : null,
        createdAt: booking.createdAt,
      })),
      payments: loadtestPayments.map((payment: any) => ({
        id: String(payment._id),
        bookingId: String(payment.bookingId),
        status: payment.status,
        payoutStatus: payment.payoutStatus,
      })),
    };
  },
});
