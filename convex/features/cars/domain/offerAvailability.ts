export type AvailabilityRangeInput = {
  startDate: string;
  endDate: string;
};

export type NormalizedAvailabilityRange = {
  startDate: string;
  endDate: string;
  startTs: number;
  endTs: number;
};

function toTimestamp(value: string, field: string) {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) {
    throw new Error(`INVALID_INPUT: Invalid ${field}.`);
  }
  return ts;
}

export function normalizeAvailabilityRanges(
  ranges: ReadonlyArray<AvailabilityRangeInput> | null | undefined,
): NormalizedAvailabilityRange[] {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    throw new Error("INVALID_INPUT: At least one availability range is required.");
  }
  const normalized = ranges.map((range, index) => {
    const startDate = String(range.startDate ?? "").trim();
    const endDate = String(range.endDate ?? "").trim();
    const startTs = toTimestamp(startDate, `ranges[${index}].startDate`);
    const endTs = toTimestamp(endDate, `ranges[${index}].endDate`);
    if (startTs > endTs) {
      throw new Error("INVALID_INPUT: Availability range start must be before end.");
    }
    return { startDate, endDate, startTs, endTs };
  });

  normalized.sort((a, b) => a.startTs - b.startTs);
  for (let i = 1; i < normalized.length; i += 1) {
    const prev = normalized[i - 1];
    const current = normalized[i];
    if (current.startTs <= prev.endTs) {
      throw new Error("INVALID_INPUT: Availability ranges cannot overlap.");
    }
  }
  return normalized;
}

export function deriveOfferBounds(
  ranges: ReadonlyArray<NormalizedAvailabilityRange>,
): { availableFrom: string; availableUntil: string } {
  if (ranges.length === 0) {
    throw new Error("INVALID_INPUT: At least one availability range is required.");
  }
  return {
    availableFrom: ranges[0].startDate,
    availableUntil: ranges[ranges.length - 1].endDate,
  };
}

export function isBookingWithinAnyAvailabilityRange(args: {
  startDate: string;
  endDate: string;
  ranges: ReadonlyArray<{ startDate: string; endDate: string }>;
}) {
  const startTs = toTimestamp(args.startDate, "startDate");
  const endTs = toTimestamp(args.endDate, "endDate");
  if (startTs > endTs) {
    return false;
  }
  return args.ranges.some((range) => {
    const rangeStart = toTimestamp(range.startDate, "rangeStart");
    const rangeEnd = toTimestamp(range.endDate, "rangeEnd");
    return startTs >= rangeStart && endTs <= rangeEnd;
  });
}
