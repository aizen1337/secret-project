import path from "node:path";
import {
  artifactsDir,
  ensureDir,
  parseEnvFile,
  readJson,
  runConvexCapture,
  writeJson,
} from "../loadtest/_utils.mjs";

const root = process.cwd();

const envLocal = parseEnvFile(path.join(root, ".env.local"));
const convexEnv = { ...process.env };
if (envLocal.CONVEX_SELF_HOSTED_URL) convexEnv.CONVEX_SELF_HOSTED_URL = envLocal.CONVEX_SELF_HOSTED_URL;
if (envLocal.CONVEX_SELF_HOSTED_ADMIN_KEY) convexEnv.CONVEX_SELF_HOSTED_ADMIN_KEY = envLocal.CONVEX_SELF_HOSTED_ADMIN_KEY;

const hostCount = Number(process.env.SEED_HOST_COUNT || process.env.LOADTEST_HOST_COUNT || "100");
const renterCount = Number(process.env.SEED_RENTER_COUNT || process.env.LOADTEST_RENTER_COUNT || "4900");
const carsPerHost = Number(process.env.SEED_CARS_PER_HOST || process.env.LOADTEST_CARS_PER_HOST || "2");
const bookingsPerRenter = Number(process.env.SEED_BOOKINGS_PER_RENTER || "2");
const chatMessagesPerBooking = Number(process.env.SEED_CHAT_MESSAGES_PER_BOOKING || "2");
const includeReviews = String(process.env.SEED_INCLUDE_REVIEWS || "true") !== "false";
const pricePerDay = Number(process.env.SEED_PRICE_PER_DAY || process.env.LOADTEST_PRICE_PER_DAY || "79");
const offersPerCar = Number(process.env.SEED_OFFERS_PER_CAR || "5");
const availabilityRangesPerOffer = Number(process.env.SEED_AVAILABILITY_RANGES_PER_OFFER || "3");
const polandOnly = String(process.env.SEED_POLAND_ONLY || "true") !== "false";
const startDate = process.env.SEED_START_DATE || process.env.LOADTEST_START_DATE || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const endDate = process.env.SEED_END_DATE || process.env.LOADTEST_END_DATE || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
const totalUsersRequired = hostCount + renterCount;

const usersFile = path.join(artifactsDir, "users.json");
const usersDoc = readJson(usersFile, null);
const fileUsers = usersDoc?.users && Array.isArray(usersDoc.users) ? usersDoc.users : [];
const generatedUsers = Array.from({ length: totalUsersRequired }, (_, idx) => ({
  clerkUserId: `lt.script.user.${idx + 1}`,
  email: `lt.script.user.${idx + 1}@example.test`,
}));
const selectedUsers = (fileUsers.length >= totalUsersRequired ? fileUsers : generatedUsers).slice(
  0,
  totalUsersRequired,
);
const usersPayload = selectedUsers.map((u) => ({
  clerkUserId: u.clerkUserId,
  name: `[LT] ${u.email}`,
}));

const batchSize = Number(process.env.SEED_USER_UPSERT_BATCH_SIZE || "100");
for (let i = 0; i < usersPayload.length; i += batchSize) {
  const batch = usersPayload.slice(i, i + batchSize);
  runConvexCapture(["run", "loadtest:upsertLoadtestUsersBatchInternal", JSON.stringify({ users: batch })], {
    env: convexEnv,
  });
}

const payload = {
  hostCount,
  renterCount,
  carsPerHost,
  pricePerDay,
  startDate,
  endDate,
  bookingsPerRenter,
  chatMessagesPerBooking,
  includeReviews,
  offersPerCar,
  availabilityRangesPerOffer,
  polandOnly,
};

const renterChunkSize = Number(process.env.SEED_RENTER_CHUNK_SIZE || "400");
const result = {
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
  race: null,
  chunks: 0,
};

for (let renterOffset = 0; renterOffset < renterCount; renterOffset += renterChunkSize) {
  const chunkPayload = {
    ...payload,
    renterOffset,
    renterLimit: renterChunkSize,
  };
  const stdout = runConvexCapture(
    ["run", "loadtest:seedLoadtestDatasetInternal", JSON.stringify(chunkPayload)],
    { env: convexEnv },
  );
  const chunkResult = JSON.parse(stdout);
  result.usersSeeded = Math.max(result.usersSeeded, chunkResult.usersSeeded ?? 0);
  result.hostsSeeded = Math.max(result.hostsSeeded, chunkResult.hostsSeeded ?? 0);
  result.carsSeeded = Math.max(result.carsSeeded, chunkResult.carsSeeded ?? 0);
  result.offersSeeded += chunkResult.offersSeeded ?? 0;
  result.availabilityRangesSeeded += chunkResult.availabilityRangesSeeded ?? 0;
  result.rentersSeeded += chunkResult.rentersSeeded ?? 0;
  result.bookingsSeeded += chunkResult.bookingsSeeded ?? 0;
  result.paymentsSeeded += chunkResult.paymentsSeeded ?? 0;
  result.chatsSeeded += chunkResult.chatsSeeded ?? 0;
  result.messagesSeeded += chunkResult.messagesSeeded ?? 0;
  result.reviewsSeeded += chunkResult.reviewsSeeded ?? 0;
  result.bookingReviewsSeeded += chunkResult.bookingReviewsSeeded ?? 0;
  result.depositCasesSeeded += chunkResult.depositCasesSeeded ?? 0;
  if (!result.race && chunkResult.race) result.race = chunkResult.race;
  result.chunks += 1;
}

const output = {
  generatedAt: Date.now(),
  type: "marketplace",
  input: { ...payload, usersUpserted: usersPayload.length, renterChunkSize },
  result,
};
ensureDir(artifactsDir);
writeJson(path.join(artifactsDir, "seed-marketplace-state.json"), output);
console.log("Marketplace seed completed.");
