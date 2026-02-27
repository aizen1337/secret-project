export function normalizeParam<T extends string | string[] | undefined>(
  value: T,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
