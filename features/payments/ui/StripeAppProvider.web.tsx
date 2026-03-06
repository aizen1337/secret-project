import type { ReactNode } from "react";

type StripeAppProviderProps = {
  children: ReactNode;
  publishableKey: string;
};

export function StripeAppProvider({ children }: StripeAppProviderProps) {
  return <>{children}</>;
}
