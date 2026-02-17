import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("stripe-signature");
    if (!signatureHeader) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    const result = await ctx.runAction(internal.stripeWebhook.handleStripeWebhookInternal, {
      rawBody,
      signatureHeader,
    });

    return new Response(result.message, { status: result.status });
  }),
});

export default http;
