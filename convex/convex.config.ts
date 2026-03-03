import { defineApp } from "convex/server";
import actionCache from "@convex-dev/action-cache/convex.config";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(actionCache);
app.use(betterAuth);

export default app;
