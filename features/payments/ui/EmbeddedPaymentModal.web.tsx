import { useMemo, useState, type CSSProperties } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

type EmbeddedPaymentModalProps = {
  open: boolean;
  clientSecret: string | null;
  onClose: () => void;
  onSuccess: (paymentIntentId?: string) => void;
  onError: (message: string) => void;
};

function EmbeddedPaymentModalInner({
  onClose,
  onSuccess,
  onError,
}: Omit<EmbeddedPaymentModalProps, "open" | "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (result.error) {
        onError(result.error.message || "Payment confirmation failed.");
      } else {
        onSuccess(result.paymentIntent?.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.headerRow}>
          <h3 style={styles.title}>Secure payment</h3>
          <button style={styles.closeButton} onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <PaymentElement />
        </div>
        <button
          type="button"
          style={isSubmitting ? styles.payButtonDisabled : styles.payButton}
          onClick={() => {
            void handleConfirm();
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processing..." : "Pay now"}
        </button>
      </div>
    </div>
  );
}

export function EmbeddedPaymentModal({
  open,
  clientSecret,
  onClose,
  onSuccess,
  onError,
}: EmbeddedPaymentModalProps) {
  const stripePromise = useMemo(() => {
    const key = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
    return key ? loadStripe(key) : null;
  }, []);

  if (!open || !clientSecret || !stripePromise) return null;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <EmbeddedPaymentModalInner onClose={onClose} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3000,
    padding: 16,
  },
  modal: {
    width: "100%",
    maxWidth: 560,
    borderRadius: 12,
    background: "#111827",
    border: "1px solid #374151",
    padding: 16,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    margin: 0,
    color: "white",
  },
  closeButton: {
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    background: "#1f2937",
    color: "#d1d5db",
    cursor: "pointer",
  },
  payButton: {
    marginTop: 16,
    width: "100%",
    border: "none",
    borderRadius: 10,
    padding: "12px 16px",
    background: "#22c55e",
    color: "#04210f",
    fontWeight: 700,
    cursor: "pointer",
  },
  payButtonDisabled: {
    marginTop: 16,
    width: "100%",
    border: "none",
    borderRadius: 10,
    padding: "12px 16px",
    background: "#22c55e99",
    color: "#04210f",
    fontWeight: 700,
    cursor: "not-allowed",
  },
};
