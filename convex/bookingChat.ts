import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { mapClerkUser } from "./userMapper";
import type { Id } from "./_generated/dataModel";

const MAX_TEXT_LENGTH = 1200;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;
const MAX_IMAGES_PER_MESSAGE = 3;
const CHAT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CHAT_SENDABLE_STATUSES = new Set(["paid", "confirmed", "completed"]);

export type BookingChatSendDisabledReason = "not_confirmed" | "expired" | "cancelled" | null;

export function getBookingChatWindowEndsAt(booking: { endDate?: string }) {
  const endTs = new Date(booking.endDate ?? "").getTime();
  if (!Number.isFinite(endTs)) {
    return 0;
  }
  return endTs + CHAT_WINDOW_MS;
}

export function getBookingChatSendState(booking: { status?: string; endDate?: string }) {
  const status = String(booking.status ?? "");
  const windowEndsAt = getBookingChatWindowEndsAt(booking);

  if (status === "cancelled") {
    return {
      canSend: false,
      sendDisabledReason: "cancelled" as const,
      windowEndsAt,
    };
  }

  if (!CHAT_SENDABLE_STATUSES.has(status)) {
    return {
      canSend: false,
      sendDisabledReason: "not_confirmed" as const,
      windowEndsAt,
    };
  }

  if (!Number.isFinite(windowEndsAt) || windowEndsAt <= 0 || Date.now() > windowEndsAt) {
    return {
      canSend: false,
      sendDisabledReason: "expired" as const,
      windowEndsAt,
    };
  }

  return {
    canSend: true,
    sendDisabledReason: null,
    windowEndsAt,
  };
}

function clampLimit(limit?: number) {
  return Math.max(1, Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT));
}

function buildMessagePreview(text: string, imageCount: number) {
  if (text) {
    return text.length > 140 ? `${text.slice(0, 137)}...` : text;
  }
  if (imageCount > 0) {
    return imageCount === 1 ? "[Image]" : `[${imageCount} images]`;
  }
  return "";
}

function clampThreadLimit(limit?: number) {
  return Math.max(1, Math.min(limit ?? 50, 200));
}

async function getCurrentSignedInUserOrNull(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", identity.subject))
    .first();
}

async function resolveBookingParticipantAccess(ctx: any, bookingId: any, viewerUserId: any) {
  const booking = await ctx.db.get(bookingId);
  if (!booking) return null;

  const car = await ctx.db.get(booking.carId);
  if (!car) return null;

  const host = await ctx.db.get(car.hostId);
  if (!host) return null;

  const isHost = String(host.userId) === String(viewerUserId);
  const isRenter = String(booking.renterId) === String(viewerUserId);
  if (!isHost && !isRenter) return null;

  const hostUser = await ctx.db.get(host.userId);
  const renterUser = await ctx.db.get(booking.renterId);

  return {
    booking,
    host,
    hostUser,
    renterUser,
    viewerRole: isHost ? ("host" as const) : ("renter" as const),
  };
}

async function getBookingChatDoc(ctx: any, bookingId: any) {
  return await ctx.db
    .query("booking_chats")
    .withIndex("by_booking", (q: any) => q.eq("bookingId", bookingId))
    .first();
}

async function ensureBookingChatDoc(
  ctx: any,
  booking: any,
  hostUserId: any,
  renterUserId: any,
) {
  const existing = await getBookingChatDoc(ctx, booking._id);
  if (existing) {
    const patch: Record<string, unknown> = {};
    if (String(existing.hostUserId) !== String(hostUserId)) {
      patch.hostUserId = hostUserId;
    }
    if (String(existing.renterUserId) !== String(renterUserId)) {
      patch.renterUserId = renterUserId;
    }
    if (Object.keys(patch).length > 0) {
      patch.updatedAt = Date.now();
      await ctx.db.patch(existing._id, patch);
      return await ctx.db.get(existing._id);
    }
    return existing;
  }

  const now = Date.now();
  const chatId = await ctx.db.insert("booking_chats", {
    bookingId: booking._id,
    hostUserId,
    renterUserId,
    hostUnreadCount: 0,
    renterUnreadCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  return await ctx.db.get(chatId);
}

export const getBookingChat = query({
  args: {
    bookingId: v.id("bookings"),
    limit: v.optional(v.number()),
    beforeTs: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const viewer = await getCurrentSignedInUserOrNull(ctx);
    if (!viewer) return null;

    const access = await resolveBookingParticipantAccess(ctx, args.bookingId, viewer._id);
    if (!access) return null;

    const { booking, hostUser, renterUser, viewerRole } = access;
    const sendState = getBookingChatSendState(booking);
    const chatDoc = await getBookingChatDoc(ctx, booking._id);
    const unreadCount =
      viewerRole === "host" ? Number(chatDoc?.hostUnreadCount ?? 0) : Number(chatDoc?.renterUnreadCount ?? 0);

    const counterpartUser = viewerRole === "host" ? renterUser : hostUser;
    const counterpartId = viewerRole === "host" ? booking.renterId : access.host.userId;

    const limit = clampLimit(args.limit);
    const beforeTs = Number.isFinite(Number(args.beforeTs)) ? Number(args.beforeTs) : null;

    const pagedDesc =
      beforeTs === null
        ? await ctx.db
            .query("booking_messages")
            .withIndex("by_booking_createdAt", (q) => q.eq("bookingId", booking._id))
            .order("desc")
            .take(limit)
        : await ctx.db
            .query("booking_messages")
            .withIndex("by_booking_createdAt", (q) =>
              q.eq("bookingId", booking._id).lt("createdAt", beforeTs),
            )
            .order("desc")
            .take(limit);

    const paged = [...pagedDesc].reverse();
    const senderIds = Array.from(
      new Set(paged.map((message) => message.senderUserId as Id<"users">)),
    );
    const senderMap = new Map<string, any>();
    await Promise.all(
      senderIds.map(async (senderId) => {
        const senderUser = await ctx.db.get(senderId);
        senderMap.set(String(senderId), senderUser);
      }),
    );

    const messages = await Promise.all(
      paged.map(async (message) => {
        const sender = senderMap.get(String(message.senderUserId));
        const imageStorageIds: Id<"_storage">[] = Array.isArray(message.imageStorageIds)
          ? (message.imageStorageIds as Id<"_storage">[])
          : [];
        const imageUrls = (
          await Promise.all(imageStorageIds.map((storageId) => ctx.storage.getUrl(storageId)))
        ).filter((url: string | null) => Boolean(url)) as string[];

        return {
          id: String(message._id),
          senderUserId: String(message.senderUserId),
          sender: sender
            ? {
                name: sender.name,
                imageUrl: sender.imageUrl ?? null,
              }
            : null,
          text: message.text ?? null,
          imageUrls,
          createdAt: message.createdAt,
        };
      }),
    );

    return {
      booking: {
        id: String(booking._id),
        status: booking.status,
        startDate: booking.startDate,
        endDate: booking.endDate,
      },
      viewerRole,
      counterpart: {
        id: String(counterpartId),
        name: counterpartUser?.name ?? "Unknown",
        imageUrl: counterpartUser?.imageUrl ?? null,
      },
      chat: {
        unreadCount,
        canSend: sendState.canSend,
        sendDisabledReason: sendState.sendDisabledReason,
        windowEndsAt: sendState.windowEndsAt,
      },
      messages,
    };
  },
});

export const sendBookingMessage = mutation({
  args: {
    bookingId: v.id("bookings"),
    text: v.optional(v.string()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  async handler(ctx, args) {
    const user = await mapClerkUser(ctx);
    const access = await resolveBookingParticipantAccess(ctx, args.bookingId, user._id);
    if (!access) {
      throw new Error("UNAUTHORIZED: You cannot access this booking chat.");
    }

    const { booking, host, viewerRole } = access;
    const sendState = getBookingChatSendState(booking);
    if (!sendState.canSend) {
      if (sendState.sendDisabledReason === "cancelled") {
        throw new Error("INVALID_INPUT: chatCancelled");
      }
      if (sendState.sendDisabledReason === "expired") {
        throw new Error("INVALID_INPUT: chatExpired");
      }
      throw new Error("INVALID_INPUT: chatNotConfirmed");
    }

    const text = (args.text ?? "").trim();
    const imageStorageIds = Array.isArray(args.imageStorageIds) ? args.imageStorageIds : [];

    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error("INVALID_INPUT: chatMessageTooLong");
    }
    if (imageStorageIds.length > MAX_IMAGES_PER_MESSAGE) {
      throw new Error("INVALID_INPUT: chatTooManyImages");
    }
    if (!text && imageStorageIds.length === 0) {
      throw new Error("INVALID_INPUT: chatMessageEmpty");
    }

    const chat = await ensureBookingChatDoc(ctx, booking, host.userId, booking.renterId);
    if (!chat) {
      throw new Error("UNAVAILABLE: Failed to initialize booking chat.");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("booking_messages", {
      bookingId: booking._id,
      senderUserId: user._id,
      text: text || undefined,
      imageStorageIds: imageStorageIds.length > 0 ? imageStorageIds : undefined,
      createdAt: now,
    });

    const hostUnreadCount = viewerRole === "host" ? 0 : Number(chat.hostUnreadCount ?? 0) + 1;
    const renterUnreadCount = viewerRole === "renter" ? 0 : Number(chat.renterUnreadCount ?? 0) + 1;

    await ctx.db.patch(chat._id, {
      hostUserId: host.userId,
      renterUserId: booking.renterId,
      hostUnreadCount,
      renterUnreadCount,
      lastMessageAt: now,
      lastMessageSenderId: user._id,
      lastMessagePreview: buildMessagePreview(text, imageStorageIds.length),
      updatedAt: now,
    });

    return { messageId: String(messageId), createdAt: now };
  },
});

export const markBookingChatRead = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  async handler(ctx, args) {
    const user = await mapClerkUser(ctx);
    const access = await resolveBookingParticipantAccess(ctx, args.bookingId, user._id);
    if (!access) {
      throw new Error("UNAUTHORIZED: You cannot access this booking chat.");
    }

    const { booking, host, viewerRole } = access;
    const chat = await ensureBookingChatDoc(ctx, booking, host.userId, booking.renterId);
    if (!chat) {
      throw new Error("UNAVAILABLE: Failed to initialize booking chat.");
    }

    const now = Date.now();
    if (viewerRole === "host") {
      await ctx.db.patch(chat._id, {
        hostUnreadCount: 0,
        hostLastReadAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(chat._id, {
        renterUnreadCount: 0,
        renterLastReadAt: now,
        updatedAt: now,
      });
    }

    return { ok: true, unreadCount: 0 };
  },
});

export const generateBookingChatImageUploadUrl = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  async handler(ctx, args) {
    const user = await mapClerkUser(ctx);
    const access = await resolveBookingParticipantAccess(ctx, args.bookingId, user._id);
    if (!access) {
      throw new Error("UNAUTHORIZED: You cannot access this booking chat.");
    }

    const sendState = getBookingChatSendState(access.booking);
    if (!sendState.canSend) {
      throw new Error("INVALID_INPUT: chatReadOnly");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const getMyBookingChatUnreadTotal = query({
  args: {},
  async handler(ctx) {
    const viewer = await getCurrentSignedInUserOrNull(ctx);
    if (!viewer) return 0;

    const [asHost, asRenter] = await Promise.all([
      ctx.db
        .query("booking_chats")
        .withIndex("by_host_updated", (q) => q.eq("hostUserId", viewer._id))
        .collect(),
      ctx.db
        .query("booking_chats")
        .withIndex("by_renter_updated", (q) => q.eq("renterUserId", viewer._id))
        .collect(),
    ]);

    const totalHost = asHost.reduce((sum: number, row: any) => sum + Number(row.hostUnreadCount ?? 0), 0);
    const totalRenter = asRenter.reduce((sum: number, row: any) => sum + Number(row.renterUnreadCount ?? 0), 0);
    return totalHost + totalRenter;
  },
});

export const listMyBookingChats = query({
  args: {
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const viewer = await getCurrentSignedInUserOrNull(ctx);
    if (!viewer) return [];

    const limit = clampThreadLimit(args.limit);
    const scanLimit = Math.max(limit * 2, 60);
    const [asHost, asRenter] = await Promise.all([
      ctx.db
        .query("booking_chats")
        .withIndex("by_host_updated", (q) => q.eq("hostUserId", viewer._id))
        .order("desc")
        .take(scanLimit),
      ctx.db
        .query("booking_chats")
        .withIndex("by_renter_updated", (q) => q.eq("renterUserId", viewer._id))
        .order("desc")
        .take(scanLimit),
    ]);

    const mergedMap = new Map<string, any>();
    for (const row of [...asHost, ...asRenter]) {
      mergedMap.set(String(row._id), row);
    }

    const merged = Array.from(mergedMap.values())
      .sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0))
      .slice(0, limit);

    const bookingIds = Array.from(
      new Set(merged.map((chat) => chat.bookingId as Id<"bookings">)),
    );
    const bookings: any[] = await Promise.all(bookingIds.map((bookingId) => ctx.db.get(bookingId)));
    const bookingById = new Map<string, any>();
    for (let index = 0; index < bookingIds.length; index += 1) {
      bookingById.set(String(bookingIds[index]), bookings[index]);
    }

    const carIds = Array.from(
      new Set(
        bookings
          .filter((booking) => Boolean(booking?.carId))
          .map((booking) => booking.carId as Id<"cars">),
      ),
    );
    const cars: any[] = await Promise.all(carIds.map((carId) => ctx.db.get(carId)));
    const carById = new Map<string, any>();
    for (let index = 0; index < carIds.length; index += 1) {
      carById.set(String(carIds[index]), cars[index]);
    }

    const hostIds = Array.from(
      new Set(
        cars
          .filter((car) => Boolean(car?.hostId))
          .map((car) => car.hostId as Id<"hosts">),
      ),
    );
    const hosts: any[] = await Promise.all(hostIds.map((hostId) => ctx.db.get(hostId)));
    const hostById = new Map<string, any>();
    for (let index = 0; index < hostIds.length; index += 1) {
      hostById.set(String(hostIds[index]), hosts[index]);
    }

    const userIds = Array.from(
      new Set(
        [
          ...hosts
            .filter((host) => Boolean(host?.userId))
            .map((host) => host.userId as Id<"users">),
          ...bookings
            .filter((booking) => Boolean(booking?.renterId))
            .map((booking) => booking.renterId as Id<"users">),
        ].filter(Boolean),
      ),
    );
    const users = await Promise.all(userIds.map((userId) => ctx.db.get(userId)));
    const userById = new Map<string, any>();
    for (let index = 0; index < userIds.length; index += 1) {
      userById.set(String(userIds[index]), users[index]);
    }

    const rows = merged.map((chat) => {
      const booking = bookingById.get(String(chat.bookingId));
      if (!booking) return null;
      const car = carById.get(String(booking.carId));
      if (!car) return null;
      const host = hostById.get(String(car.hostId));
      if (!host) return null;

      const hostUser = userById.get(String(host.userId));
      const renterUser = userById.get(String(booking.renterId));

      const viewerRole =
        String(chat.hostUserId) === String(viewer._id)
          ? ("host" as const)
          : ("renter" as const);
      const counterpartUser = viewerRole === "host" ? renterUser : hostUser;
      const counterpartId = viewerRole === "host" ? booking.renterId : host.userId;
      const unreadCount =
        viewerRole === "host"
          ? Number(chat.hostUnreadCount ?? 0)
          : Number(chat.renterUnreadCount ?? 0);
      const sendState = getBookingChatSendState(booking);

      return {
        id: String(chat._id),
        booking: {
          id: String(booking._id),
          status: booking.status,
          startDate: booking.startDate,
          endDate: booking.endDate,
        },
        car: {
          id: String(car._id),
          title: car.title,
          make: car.make,
          model: car.model,
          imageUrl: car.images?.[0] ?? null,
        },
        counterpart: {
          id: String(counterpartId),
          name: counterpartUser?.name ?? "Unknown",
          imageUrl: counterpartUser?.imageUrl ?? null,
        },
        unreadCount,
        lastMessagePreview: chat.lastMessagePreview ?? "",
        lastMessageAt: chat.lastMessageAt ?? chat.updatedAt ?? chat.createdAt,
        canSend: sendState.canSend,
        sendDisabledReason: sendState.sendDisabledReason,
      };
    });

    return rows.filter(Boolean);
  },
});
