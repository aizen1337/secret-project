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

export function resolveSelectedCollectionMethod(args: {
  requested?: string | null;
  available?: ReadonlyArray<string> | null;
}): CollectionMethod {
  const available = normalizeCollectionMethods(args.available);
  if (args.requested && isCollectionMethod(args.requested) && available.includes(args.requested)) {
    return args.requested;
  }
  return available[0] ?? "in_person";
}
