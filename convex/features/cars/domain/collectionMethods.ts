export const COLLECTION_METHODS = ["in_person", "lockbox", "host_delivery"] as const;

export type CollectionMethod = (typeof COLLECTION_METHODS)[number];

const COLLECTION_METHOD_SET = new Set<string>(COLLECTION_METHODS);

export function isCollectionMethod(value: unknown): value is CollectionMethod {
  return typeof value === "string" && COLLECTION_METHOD_SET.has(value);
}

export function normalizeCollectionMethods(
  methods: ReadonlyArray<string> | null | undefined,
): CollectionMethod[] {
  const normalized = Array.isArray(methods) ? methods.filter(isCollectionMethod) : [];
  const deduped = Array.from(new Set(normalized));
  return deduped.length > 0 ? deduped : ["in_person"];
}

export function parseCollectionMethods(
  methods: ReadonlyArray<string> | null | undefined,
): CollectionMethod[] {
  if (!Array.isArray(methods) || methods.length === 0) {
    return ["in_person"];
  }

  const invalidMethod = methods.find((method) => !isCollectionMethod(method));
  if (invalidMethod) {
    throw new Error(`INVALID_INPUT: Unsupported collection method "${invalidMethod}".`);
  }

  return Array.from(new Set(methods));
}

export function resolveSelectedCollectionMethod(args: {
  requested?: string | null;
  available?: ReadonlyArray<string> | null;
}): CollectionMethod {
  const available = normalizeCollectionMethods(args.available);
  if (!args.requested) {
    return available[0] ?? "in_person";
  }
  if (!isCollectionMethod(args.requested)) {
    throw new Error(`INVALID_INPUT: Unsupported collection method "${String(args.requested)}".`);
  }
  if (!available.includes(args.requested)) {
    throw new Error("INVALID_INPUT: Selected collection method is unavailable for this listing.");
  }
  return args.requested;
}
