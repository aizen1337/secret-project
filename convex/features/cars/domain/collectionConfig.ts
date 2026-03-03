import { parseCollectionMethods, type CollectionMethod } from "./collectionMethods";

export type CollectionConfigInput = {
  collectionMethods?: ReadonlyArray<string> | null;
  collectionInPersonInstructions?: string | null;
  collectionLockboxCode?: string | null;
  collectionLockboxInstructions?: string | null;
  collectionDeliveryInstructions?: string | null;
};

export type CollectionConfig = {
  collectionMethods: CollectionMethod[];
  collectionInPersonInstructions?: string;
  collectionLockboxCode?: string;
  collectionLockboxInstructions?: string;
  collectionDeliveryInstructions?: string;
};

export function buildValidatedCollectionConfig(input: CollectionConfigInput): CollectionConfig {
  const collectionMethods = parseCollectionMethods(input.collectionMethods);
  const inPersonInstructions = input.collectionInPersonInstructions?.trim() || undefined;
  const lockboxCode = input.collectionLockboxCode?.trim() || undefined;
  const lockboxInstructions = input.collectionLockboxInstructions?.trim() || undefined;
  const deliveryInstructions = input.collectionDeliveryInstructions?.trim() || undefined;

  if (collectionMethods.includes("lockbox") && !lockboxCode) {
    throw new Error("INVALID_INPUT: Lockbox code is required when lockbox collection is enabled.");
  }
  if (collectionMethods.includes("host_delivery") && !deliveryInstructions) {
    throw new Error(
      "INVALID_INPUT: Delivery instructions are required when host delivery is enabled.",
    );
  }

  return {
    collectionMethods,
    collectionInPersonInstructions: collectionMethods.includes("in_person")
      ? inPersonInstructions
      : undefined,
    collectionLockboxCode: collectionMethods.includes("lockbox") ? lockboxCode : undefined,
    collectionLockboxInstructions: collectionMethods.includes("lockbox")
      ? lockboxInstructions
      : undefined,
    collectionDeliveryInstructions: collectionMethods.includes("host_delivery")
      ? deliveryInstructions
      : undefined,
  };
}

