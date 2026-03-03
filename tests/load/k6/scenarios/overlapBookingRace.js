import { sleep } from "k6";
import { convexMutation } from "../client.js";
import { checkOk, parseJson } from "../checks.js";
import { convexDomainErrors, convexHttpErrors } from "../metrics.js";

export const options = {
  vus: Number(__ENV.RACE_VUS || "500"),
  duration: __ENV.RACE_DURATION || "60s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
  },
};

const raceKey = __ENV.RACE_KEY || "global";

export default function () {
  const response = convexMutation(
    "loadtestSynthetic:incrementSyntheticCounter",
    {
      key: raceKey,
      delta: Number(__ENV.RACE_DELTA || "1"),
    },
    undefined,
  );
  checkOk(response, "incrementSyntheticCounter");
  if (response.status !== 200) {
    convexHttpErrors.add(1);
  } else {
    const payload = parseJson(response);
    if (payload && (payload.errorData || payload.error)) convexDomainErrors.add(1);
  }
  sleep(Math.random() * 0.3);
}
