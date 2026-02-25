// @ts-nocheck
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { mapClerkUser } from "./userMapper";

const MAX_RECENT_SEARCHES = 5;

function normalizePlaceId(value: string) {
  return value.trim().toUpperCase();
}

function normalizeText(value: string) {
  return value.trim();
}

function clampLimit(value: number | undefined) {
  const fallback = MAX_RECENT_SEARCHES;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(Math.round(value), 20));
}

export const upsertRecentLocationSearch = mutation({
  args: {
    placeId: v.string(),
    description: v.string(),
    city: v.string(),
    country: v.string(),
    lat: v.number(),
    lng: v.number(),
  },
  async handler(ctx, args) {
    const user = await mapClerkUser(ctx);
    const placeId = normalizePlaceId(args.placeId);
    const description = normalizeText(args.description);
    const city = normalizeText(args.city);
    const country = normalizeText(args.country);

    if (!placeId || !description) {
      throw new Error("INVALID_INPUT: placeId and description are required.");
    }
    if (!Number.isFinite(args.lat) || !Number.isFinite(args.lng)) {
      throw new Error("INVALID_INPUT: Invalid location coordinates.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("recent_location_searches")
      .withIndex("by_user_place", (q) => q.eq("userId", user._id).eq("placeId", placeId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        description,
        city,
        country,
        lat: args.lat,
        lng: args.lng,
        searchCount: Math.max(1, Number(existing.searchCount ?? 0) + 1),
        lastSearchedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("recent_location_searches", {
        userId: user._id,
        placeId,
        description,
        city,
        country,
        lat: args.lat,
        lng: args.lng,
        searchCount: 1,
        lastSearchedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    const rows = await ctx.db
      .query("recent_location_searches")
      .withIndex("by_user_lastSearched", (q) => q.eq("userId", user._id))
      .collect();
    const staleRows = rows
      .sort((a, b) => b.lastSearchedAt - a.lastSearchedAt)
      .slice(MAX_RECENT_SEARCHES);

    for (const stale of staleRows) {
      await ctx.db.delete(stale._id);
    }

    return { ok: true };
  },
});

export const listMyRecentLocationSearches = query({
  args: {
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    if (!user) return [];

    const limit = clampLimit(args.limit);
    const rows = await ctx.db
      .query("recent_location_searches")
      .withIndex("by_user_lastSearched", (q) => q.eq("userId", user._id))
      .collect();

    return rows
      .sort((a, b) => b.lastSearchedAt - a.lastSearchedAt)
      .slice(0, limit)
      .map((row) => ({
        placeId: row.placeId,
        description: row.description,
        city: row.city,
        country: row.country,
        lat: row.lat,
        lng: row.lng,
        searchCount: row.searchCount,
        lastSearchedAt: row.lastSearchedAt,
      }));
  },
});

