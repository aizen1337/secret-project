import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const TAG = "synthetic_v1";

function assertLoadtestModeEnabled() {
  if (process.env.LOADTEST_MODE !== "true") {
    throw new Error("UNAUTHORIZED: LOADTEST_MODE is not enabled.");
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function makePayload(size: number, bucket: number) {
  const safe = clamp(Math.round(size), 16, 4096);
  const prefix = `${Date.now()}:${bucket}:`;
  if (prefix.length >= safe) return prefix.slice(0, safe);
  return `${prefix}${"x".repeat(safe - prefix.length)}`;
}

export const seedSyntheticDataset = mutation({
  args: {
    bucketCount: v.optional(v.number()),
    samplesPerBucket: v.optional(v.number()),
    counterKeys: v.optional(v.array(v.string())),
    payloadSize: v.optional(v.number()),
  },
  async handler(ctx, args) {
    assertLoadtestModeEnabled();
    const now = Date.now();
    const bucketCount = clamp(Math.round(args.bucketCount ?? 64), 1, 4096);
    const samplesPerBucket = clamp(Math.round(args.samplesPerBucket ?? 32), 1, 1024);
    const payloadSize = clamp(Math.round(args.payloadSize ?? 256), 16, 4096);
    const counterKeys = (args.counterKeys?.length ? args.counterKeys : ["global"]).slice(0, 64);

    let insertedSamples = 0;
    for (let bucket = 0; bucket < bucketCount; bucket += 1) {
      for (let i = 0; i < samplesPerBucket; i += 1) {
        await ctx.db.insert("loadtest_synthetic_samples", {
          tag: TAG,
          bucket,
          payload: makePayload(payloadSize, bucket),
          createdAt: now + insertedSamples,
        });
        insertedSamples += 1;
      }
    }

    let countersUpserted = 0;
    for (const key of counterKeys) {
      const existing = await ctx.db
        .query("loadtest_synthetic_counters")
        .withIndex("by_tag_key", (q) => q.eq("tag", TAG).eq("key", key))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { updatedAt: now });
      } else {
        await ctx.db.insert("loadtest_synthetic_counters", {
          tag: TAG,
          key,
          value: 0,
          updatedAt: now,
        });
      }
      countersUpserted += 1;
    }

    return {
      ok: true,
      tag: TAG,
      bucketCount,
      samplesPerBucket,
      payloadSize,
      insertedSamples,
      countersUpserted,
      raceKey: counterKeys[0] ?? "global",
    };
  },
});

export const resetSyntheticDataset = mutation({
  args: {
    numItems: v.optional(v.number()),
  },
  async handler(ctx, args) {
    assertLoadtestModeEnabled();
    const numItems = clamp(Math.round(args.numItems ?? 1000), 1, 5000);

    const samples = await ctx.db
      .query("loadtest_synthetic_samples")
      .withIndex("by_tag", (q) => q.eq("tag", TAG))
      .take(numItems);
    for (const row of samples) {
      await ctx.db.delete(row._id);
    }

    const counters = await ctx.db
      .query("loadtest_synthetic_counters")
      .withIndex("by_tag", (q) => q.eq("tag", TAG))
      .take(numItems);
    for (const row of counters) {
      await ctx.db.delete(row._id);
    }

    const hasMoreSamples =
      (await ctx.db
        .query("loadtest_synthetic_samples")
        .withIndex("by_tag", (q) => q.eq("tag", TAG))
        .first()) !== null;
    const hasMoreCounters =
      (await ctx.db
        .query("loadtest_synthetic_counters")
        .withIndex("by_tag", (q) => q.eq("tag", TAG))
        .first()) !== null;

    return {
      ok: true,
      deletedSamples: samples.length,
      deletedCounters: counters.length,
      hasMore: hasMoreSamples || hasMoreCounters,
    };
  },
});

export const readSyntheticBucket = query({
  args: {
    bucket: v.number(),
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    assertLoadtestModeEnabled();
    const limit = clamp(Math.round(args.limit ?? 20), 1, 200);
    const bucket = Math.max(0, Math.floor(args.bucket));
    const rows = await ctx.db
      .query("loadtest_synthetic_samples")
      .withIndex("by_tag_bucket", (q) => q.eq("tag", TAG).eq("bucket", bucket))
      .take(limit);

    let totalBytes = 0;
    for (const row of rows) totalBytes += row.payload.length;
    return {
      bucket,
      rows: rows.length,
      totalBytes,
      newestCreatedAt: rows.length ? rows[rows.length - 1].createdAt : null,
    };
  },
});

export const writeSyntheticSample = mutation({
  args: {
    bucket: v.number(),
    payloadSize: v.optional(v.number()),
  },
  async handler(ctx, args) {
    assertLoadtestModeEnabled();
    const bucket = Math.max(0, Math.floor(args.bucket));
    const payloadSize = clamp(Math.round(args.payloadSize ?? 256), 16, 4096);
    const id = await ctx.db.insert("loadtest_synthetic_samples", {
      tag: TAG,
      bucket,
      payload: makePayload(payloadSize, bucket),
      createdAt: Date.now(),
    });
    return { ok: true, id };
  },
});

export const incrementSyntheticCounter = mutation({
  args: {
    key: v.string(),
    delta: v.optional(v.number()),
  },
  async handler(ctx, args) {
    assertLoadtestModeEnabled();
    const delta = clamp(Math.round(args.delta ?? 1), 1, 100);
    const key = args.key.trim() || "global";
    const now = Date.now();
    const existing = await ctx.db
      .query("loadtest_synthetic_counters")
      .withIndex("by_tag_key", (q) => q.eq("tag", TAG).eq("key", key))
      .first();
    if (existing) {
      const next = (existing.value ?? 0) + delta;
      await ctx.db.patch(existing._id, { value: next, updatedAt: now });
      return { ok: true, key, value: next };
    }
    await ctx.db.insert("loadtest_synthetic_counters", {
      tag: TAG,
      key,
      value: delta,
      updatedAt: now,
    });
    return { ok: true, key, value: delta };
  },
});

export const getSyntheticStats = query({
  args: {},
  async handler(ctx) {
    assertLoadtestModeEnabled();
    const sampleRows = await ctx.db
      .query("loadtest_synthetic_samples")
      .withIndex("by_tag", (q) => q.eq("tag", TAG))
      .take(10000);
    const counters = await ctx.db
      .query("loadtest_synthetic_counters")
      .withIndex("by_tag", (q) => q.eq("tag", TAG))
      .collect();

    const buckets = new Set<number>();
    let bytes = 0;
    for (const row of sampleRows) {
      buckets.add(row.bucket);
      bytes += row.payload.length;
    }
    const counterMap: Record<string, number> = {};
    for (const row of counters) {
      counterMap[row.key] = row.value;
    }

    return {
      tag: TAG,
      generatedAt: Date.now(),
      samplesCountApprox: sampleRows.length,
      distinctBucketsApprox: buckets.size,
      payloadBytesApprox: bytes,
      counters: counterMap,
    };
  },
});
