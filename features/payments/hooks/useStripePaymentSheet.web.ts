type StripeSheetResult = { error?: { message?: string } };

export function useStripePaymentSheet() {
  const initPaymentSheet = async (_args: {
    merchantDisplayName: string;
    paymentIntentClientSecret: string;
  }): Promise<StripeSheetResult> => ({ error: { message: "Native payment sheet is unavailable on web." } });

  const presentPaymentSheet = async (): Promise<StripeSheetResult> => ({
    error: { message: "Native payment sheet is unavailable on web." },
  });

  return { initPaymentSheet, presentPaymentSheet };
}
