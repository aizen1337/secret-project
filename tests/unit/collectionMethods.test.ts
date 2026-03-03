import { describe, expect, it } from "vitest";

import {
  normalizeCollectionMethods,
  parseCollectionMethods,
  resolveSelectedCollectionMethod,
} from "../../convex/features/cars/domain/collectionMethods";

describe("collectionMethods", () => {
  it("normalizes values and falls back to in_person", () => {
    expect(normalizeCollectionMethods(undefined)).toEqual(["in_person"]);
    expect(normalizeCollectionMethods(["lockbox", "lockbox", "invalid"])).toEqual(["lockbox"]);
  });

  it("parses strict listing methods and rejects unsupported methods", () => {
    expect(parseCollectionMethods(undefined)).toEqual(["in_person"]);
    expect(parseCollectionMethods(["in_person", "host_delivery", "host_delivery"])).toEqual([
      "in_person",
      "host_delivery",
    ]);
    expect(() => parseCollectionMethods(["teleport"])).toThrow(
      'INVALID_INPUT: Unsupported collection method "teleport".',
    );
  });

  it("resolves selected method with backward-compatible fallback when missing", () => {
    expect(
      resolveSelectedCollectionMethod({
        requested: undefined,
        available: ["host_delivery", "in_person"],
      }),
    ).toBe("host_delivery");
    expect(
      resolveSelectedCollectionMethod({
        requested: undefined,
        available: undefined,
      }),
    ).toBe("in_person");
  });

  it("rejects unavailable selection when requested explicitly", () => {
    expect(
      resolveSelectedCollectionMethod({
        requested: "host_delivery",
        available: ["in_person", "host_delivery"],
      }),
    ).toBe("host_delivery");

    expect(() =>
      resolveSelectedCollectionMethod({
        requested: "lockbox",
        available: ["in_person"],
      }),
    ).toThrow("INVALID_INPUT: Selected collection method is unavailable for this listing.");
  });
});

