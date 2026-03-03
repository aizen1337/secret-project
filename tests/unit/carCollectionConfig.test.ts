import { describe, expect, it } from "vitest";

import { buildValidatedCollectionConfig } from "../../convex/features/cars/domain/collectionConfig";

describe("car collection config", () => {
  it("requires lockbox code when lockbox method is enabled", () => {
    expect(() =>
      buildValidatedCollectionConfig({
        collectionMethods: ["lockbox"],
        collectionLockboxCode: "",
      }),
    ).toThrow("INVALID_INPUT: Lockbox code is required when lockbox collection is enabled.");
  });

  it("requires delivery instructions when host delivery is enabled", () => {
    expect(() =>
      buildValidatedCollectionConfig({
        collectionMethods: ["host_delivery"],
        collectionDeliveryInstructions: "   ",
      }),
    ).toThrow(
      "INVALID_INPUT: Delivery instructions are required when host delivery is enabled.",
    );
  });

  it("keeps only method-relevant instructions in normalized payload", () => {
    expect(
      buildValidatedCollectionConfig({
        collectionMethods: ["in_person"],
        collectionInPersonInstructions: "  Meet at gate A ",
        collectionLockboxCode: "1234",
        collectionDeliveryInstructions: "ignored",
      }),
    ).toEqual({
      collectionMethods: ["in_person"],
      collectionInPersonInstructions: "Meet at gate A",
      collectionLockboxCode: undefined,
      collectionLockboxInstructions: undefined,
      collectionDeliveryInstructions: undefined,
    });
  });
});

