import { betterAuth } from "better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import authConfig from "./auth.config";
import { components } from "./_generated/api";

const authComponent = createClient((components as any).betterAuth);

function splitCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getTrustedOrigins() {
  const fromEnv = splitCsv(process.env.BETTER_AUTH_TRUSTED_ORIGIN);
  const defaults = [
    "myapp://",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:19006",
    "http://127.0.0.1:19006",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  return Array.from(new Set([...defaults, ...fromEnv]));
}

function getCorsAllowedOrigins() {
  return getTrustedOrigins().filter((origin) => origin.startsWith("http://") || origin.startsWith("https://"));
}

function getAppSiteUrl() {
  return (
    process.env.BETTER_AUTH_SITE_URL ??
    process.env.EXPO_PUBLIC_APP_URL ??
    "http://localhost:8081"
  );
}

function getSocialProviderConfig() {
  const googleClientId = process.env.BETTER_AUTH_GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET;
  const appleClientId = process.env.BETTER_AUTH_APPLE_CLIENT_ID;
  const appleClientSecret = process.env.BETTER_AUTH_APPLE_CLIENT_SECRET;
  const facebookClientId = process.env.BETTER_AUTH_FACEBOOK_CLIENT_ID;
  const facebookClientSecret = process.env.BETTER_AUTH_FACEBOOK_CLIENT_SECRET;

  return {
    ...(googleClientId && googleClientSecret
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {}),
    ...(appleClientId && appleClientSecret
      ? { apple: { clientId: appleClientId, clientSecret: appleClientSecret } }
      : {}),
    ...(facebookClientId && facebookClientSecret
      ? { facebook: { clientId: facebookClientId, clientSecret: facebookClientSecret } }
      : {}),
  };
}

export const createAuth = (ctx: any) => {
  const socialProviders = getSocialProviderConfig();
  return betterAuth({
    database: authComponent.adapter(ctx),
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.CONVEX_SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: getTrustedOrigins(),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders,
    plugins: [
      crossDomain({
        siteUrl: getAppSiteUrl(),
      }),
      convex({
        authConfig,
        jwks: process.env.BETTER_AUTH_JWKS,
      }),
    ],
  });
};

export const { getAuthUser } = authComponent.clientApi();

export async function linkBetterAuthUserId(
  ctx: any,
  authUserId: string,
  appUserId: string,
) {
  await authComponent.setUserId(ctx, authUserId, appUserId);
}

export function registerAuthRoutes(http: any) {
  authComponent.registerRoutes(http, createAuth, {
    cors: {
      allowedOrigins: getCorsAllowedOrigins(),
      exposedHeaders: ["set-cookie", "set-better-auth-cookie"],
    },
  });
}
