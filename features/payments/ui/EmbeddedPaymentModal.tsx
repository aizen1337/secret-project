type EmbeddedPaymentModalProps = {
  open: boolean;
  clientSecret: string | null;
  onClose: () => void;
  onSuccess: (paymentIntentId?: string) => void;
  onError: (message: string) => void;
};

export function EmbeddedPaymentModal(_: EmbeddedPaymentModalProps) {
  return null;
}
