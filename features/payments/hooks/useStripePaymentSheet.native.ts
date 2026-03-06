import { useStripe } from "@stripe/stripe-react-native";

export function useStripePaymentSheet() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  return { initPaymentSheet, presentPaymentSheet };
}
