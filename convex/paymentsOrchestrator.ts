import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { isEnvTrue } from "./env";

export type PaymentStrategy = "destination_manual_capture" | "platform_transfer_fallback";

function getCaptureMaxDays() {
  const raw = process.env.PAYMENT_CAPTURE_MAX_DAYS;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return 6;
}

export function selectPaymentStrategy(days: number): {
  strategy: PaymentStrategy;
  captureMaxDays: number;
  destinationManualCaptureEnabled: boolean;
} {
  const destinationManualCaptureEnabled = isEnvTrue("ENABLE_DESTINATION_MANUAL_CAPTURE", true);
  const captureMaxDays = getCaptureMaxDays();

  if (!destinationManualCaptureEnabled) {
    return {
      strategy: "platform_transfer_fallback",
      captureMaxDays,
      destinationManualCaptureEnabled,
    };
  }

  if (days <= captureMaxDays) {
    return {
      strategy: "destination_manual_capture",
      captureMaxDays,
      destinationManualCaptureEnabled,
    };
  }

  return {
    strategy: "platform_transfer_fallback",
    captureMaxDays,
    destinationManualCaptureEnabled,
  };
}

export const selectStrategyInternal = internalQuery({
  args: {
    days: v.number(),
  },
  async handler(_ctx, args) {
    return selectPaymentStrategy(args.days);
  },
});
