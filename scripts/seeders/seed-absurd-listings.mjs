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

const totalCount = Number(process.env.SEED_ABSURD_TOTAL_COUNT || "4000");
const hostCount = Number(process.env.SEED_ABSURD_HOST_COUNT || "200");
const carsPerHost = Math.max(1, Math.floor(totalCount / Math.max(1, hostCount)));
const renterCount = Number(process.env.SEED_ABSURD_RENTER_COUNT || "1");
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
  pricePerDay: Number(process.env.SEED_ABSURD_PRICE_PER_DAY || "99"),
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  bookingsPerRenter: 0,
  chatMessagesPerBooking: 0,
  includeReviews: false,
  offersPerCar: Number(process.env.SEED_ABSURD_OFFERS_PER_CAR || "5"),
  availabilityRangesPerOffer: Number(process.env.SEED_ABSURD_RANGES_PER_OFFER || "4"),
  polandOnly: true,
};
const hostChunkSize = Number(process.env.SEED_ABSURD_HOST_CHUNK_SIZE || "25");
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

for (let hostOffset = 0; hostOffset < hostCount; hostOffset += hostChunkSize) {
  const chunkPayload = {
    ...payload,
    hostOffset,
    hostLimit: hostChunkSize,
    renterOffset: 0,
    renterLimit: 1,
  };
  const stdout = runConvexCapture(
    ["run", "loadtest:seedLoadtestDatasetInternal", JSON.stringify(chunkPayload)],
    { env: convexEnv },
  );
  const chunkResult = JSON.parse(stdout);
  result.usersSeeded = Math.max(result.usersSeeded, chunkResult.usersSeeded ?? 0);
  result.hostsSeeded += chunkResult.hostsSeeded ?? 0;
  result.rentersSeeded = Math.max(result.rentersSeeded, chunkResult.rentersSeeded ?? 0);
  result.carsSeeded += chunkResult.carsSeeded ?? 0;
  result.offersSeeded += chunkResult.offersSeeded ?? 0;
  result.availabilityRangesSeeded += chunkResult.availabilityRangesSeeded ?? 0;
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
  type: "absurd_listings",
  targetTotalCount: totalCount,
  input: { ...payload, usersUpserted: usersPayload.length, hostChunkSize },
  result,
};
ensureDir(artifactsDir);
writeJson(path.join(artifactsDir, "seed-absurd-listings-state.json"), output);
console.log("Absurd listings seed completed.");
