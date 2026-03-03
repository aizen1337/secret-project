import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

function resolveAuthBaseUrl() {
  const explicit = process.env.EXPO_PUBLIC_BETTER_AUTH_URL;
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

  // Explicit auth URL wins to support cloud-vs-local profile switching.
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  if (convexUrl) {
    return `${convexUrl.replace(/\/$/, "")}/api/auth`;
  }

  throw new Error("EXPO_PUBLIC_CONVEX_URL is not set.");
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    ...(Platform.OS === "web"
      ? [
          // Required when web app origin differs from Better Auth API origin.
          // It persists set-better-auth-cookie and replays it on subsequent calls.
          crossDomainClient({
            storagePrefix: "secret-project",
          }),
        ]
      : [
          expoClient({
            scheme: "myapp",
            storagePrefix: "secret-project",
            storage: SecureStore,
          }),
        ]),
    convexClient(),
  ],
});
