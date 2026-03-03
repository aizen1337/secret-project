import { Counter } from "k6/metrics";

export const convexConsistencyViolations = new Counter("convex_consistency_violations");
export const convexDomainErrors = new Counter("convex_domain_errors");
export const convexHttpErrors = new Counter("convex_http_errors");
