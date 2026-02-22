export const stripeWebhookEvents = [
  "checkout.session.completed",
  "checkout.session.expired",
  "payment_intent.payment_failed",
  "payment_intent.succeeded",
  "payment_intent.amount_capturable_updated",
  "payment_intent.canceled",
  "charge.succeeded",
  "charge.refunded",
  "charge.refund.updated",
  "charge.dispute.created",
  "account.updated",
  "identity.verification_session.processing",
  "identity.verification_session.verified",
  "identity.verification_session.requires_input",
  "identity.verification_session.canceled",
] as const;

export type StripeWebhookEventType = (typeof stripeWebhookEvents)[number];
