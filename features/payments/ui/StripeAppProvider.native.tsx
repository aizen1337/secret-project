import type { ReactElement } from "react";
import { StripeProvider } from "@stripe/stripe-react-native";

type StripeAppProviderProps = {
  children: ReactElement;
  publishableKey: string;
};

export function StripeAppProvider({ children, publishableKey }: StripeAppProviderProps) {
  return <StripeProvider publishableKey={publishableKey}>{children}</StripeProvider>;
}
