import { sleep } from "k6";
import { convexMutation, convexQuery } from "./client.js";
import { checkOk, parseJson } from "./checks.js";
import { convexDomainErrors, convexHttpErrors } from "./metrics.js";

const seed = JSON.parse(open(__ENV.LOADTEST_SEED_FILE || "artifacts/loadtest/seed-state.json"));
const bucketCount = Math.max(
  1,
  Number(
    (seed && seed.seedResult && seed.seedResult.bucketCount) || 64,
  ),
);

function randomBucket() {
  return Math.floor(Math.random() * bucketCount);
}

const rates = {
  reads: Number(__ENV.MIX_READ_PCT || "50"),
  writes: Number(__ENV.MIX_WRITE_PCT || "30"),
  support: Number(__ENV.MIX_SUPPORT_PCT || "20"),
};

export const options = {
  scenarios: {
    mixed_traffic: {
      executor: "ramping-arrival-rate",
      timeUnit: "1s",
      startRate: Number(__ENV.MIX_START_RATE || "200"),
      preAllocatedVUs: Number(__ENV.MIX_PREALLOCATED_VUS || "500"),
      maxVUs: Number(__ENV.MIX_MAX_VUS || "5000"),
      stages: [
        { target: Number(__ENV.MIX_TARGET_RATE || "1000"), duration: __ENV.MIX_RAMP || "2m" },
        { target: Number(__ENV.MIX_TARGET_RATE || "1000"), duration: __ENV.MIX_STEADY || "5m" },
        { target: 0, duration: __ENV.MIX_COOLDOWN || "1m" },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1200"],
  },
};

function runReadPath() {
  const response = convexQuery(
    "loadtestSynthetic:readSyntheticBucket",
    { bucket: randomBucket(), limit: Number(__ENV.MIX_READ_LIMIT || "30") },
    undefined,
  );
  checkOk(response, "readSyntheticBucket");
  if (response.status !== 200) convexHttpErrors.add(1);
}

function runWritePath() {
  const response = convexMutation(
    "loadtestSynthetic:writeSyntheticSample",
    {
      bucket: randomBucket(),
      payloadSize: Number(__ENV.MIX_WRITE_PAYLOAD_SIZE || "256"),
    },
    undefined,
  );
  checkOk(response, "writeSyntheticSample");
  if (response.status !== 200) {
    convexHttpErrors.add(1);
    return;
  }
  const payload = parseJson(response);
  if (payload && (payload.errorData || payload.error)) convexDomainErrors.add(1);
}

function runSupportPath() {
  const response = convexQuery("loadtestSynthetic:getSyntheticStats", {}, undefined);
  checkOk(response, "getSyntheticStats");
  if (response.status !== 200) convexHttpErrors.add(1);
}

export default function () {
  const roll = Math.random() * 100;
  if (roll < rates.reads) {
    runReadPath();
  } else if (roll < rates.reads + rates.writes) {
    runWritePath();
  } else {
    runSupportPath();
  }
  sleep(Math.random() * 0.2);
}
