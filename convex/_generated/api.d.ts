/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bookingChat from "../bookingChat.js";
import type * as bookingReviews from "../bookingReviews.js";
import type * as bookings from "../bookings.js";
import type * as bookingsLifecycle from "../bookingsLifecycle.js";
import type * as cars from "../cars.js";
import type * as depositCases from "../depositCases.js";
import type * as env from "../env.js";
import type * as features_bookings_application_chatEntrypoints from "../features/bookings/application/chatEntrypoints.js";
import type * as features_bookings_application_entrypoints from "../features/bookings/application/entrypoints.js";
import type * as features_bookings_application_reviewEntrypoints from "../features/bookings/application/reviewEntrypoints.js";
import type * as features_cars_application_entrypoints from "../features/cars/application/entrypoints.js";
import type * as features_payments_application_depositCaseEntrypoints from "../features/payments/application/depositCaseEntrypoints.js";
import type * as features_payments_application_stripeConnectEntrypoints from "../features/payments/application/stripeConnectEntrypoints.js";
import type * as features_payments_application_stripeEntrypoints from "../features/payments/application/stripeEntrypoints.js";
import type * as features_payments_application_stripePayoutEntrypoints from "../features/payments/application/stripePayoutEntrypoints.js";
import type * as features_payments_application_stripeWebhookEntrypoints from "../features/payments/application/stripeWebhookEntrypoints.js";
import type * as features_search_application_entrypoints from "../features/search/application/entrypoints.js";
import type * as features_users_application_entrypoints from "../features/users/application/entrypoints.js";
import type * as features_users_application_identityEntrypoints from "../features/users/application/identityEntrypoints.js";
import type * as features_users_application_verificationEntrypoints from "../features/users/application/verificationEntrypoints.js";
import type * as guards_adminGuard from "../guards/adminGuard.js";
import type * as guards_bookingGuard from "../guards/bookingGuard.js";
import type * as guards_redirectUrlGuard from "../guards/redirectUrlGuard.js";
import type * as guards_renterVerificationGuard from "../guards/renterVerificationGuard.js";
import type * as hostMapper from "../hostMapper.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as paymentsOrchestrator from "../paymentsOrchestrator.js";
import type * as recentSearches from "../recentSearches.js";
import type * as seeders_absurdListings from "../seeders/absurdListings.js";
import type * as seeders_bookings from "../seeders/bookings.js";
import type * as seeders_cars from "../seeders/cars.js";
import type * as seeders_helpers from "../seeders/helpers.js";
import type * as seeders_index from "../seeders/index.js";
import type * as seeders_reviews from "../seeders/reviews.js";
import type * as stripe from "../stripe.js";
import type * as stripeConnect from "../stripeConnect.js";
import type * as stripePayouts from "../stripePayouts.js";
import type * as stripeWebhook from "../stripeWebhook.js";
import type * as stripeWebhookEvents from "../stripeWebhookEvents.js";
import type * as userMapper from "../userMapper.js";
import type * as users from "../users.js";
import type * as verification from "../verification.js";
import type * as verificationPolicy from "../verificationPolicy.js";
import type * as verificationProvider from "../verificationProvider.js";
import type * as verificationProviderStripe from "../verificationProviderStripe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bookingChat: typeof bookingChat;
  bookingReviews: typeof bookingReviews;
  bookings: typeof bookings;
  bookingsLifecycle: typeof bookingsLifecycle;
  cars: typeof cars;
  depositCases: typeof depositCases;
  env: typeof env;
  "features/bookings/application/chatEntrypoints": typeof features_bookings_application_chatEntrypoints;
  "features/bookings/application/entrypoints": typeof features_bookings_application_entrypoints;
  "features/bookings/application/reviewEntrypoints": typeof features_bookings_application_reviewEntrypoints;
  "features/cars/application/entrypoints": typeof features_cars_application_entrypoints;
  "features/payments/application/depositCaseEntrypoints": typeof features_payments_application_depositCaseEntrypoints;
  "features/payments/application/stripeConnectEntrypoints": typeof features_payments_application_stripeConnectEntrypoints;
  "features/payments/application/stripeEntrypoints": typeof features_payments_application_stripeEntrypoints;
  "features/payments/application/stripePayoutEntrypoints": typeof features_payments_application_stripePayoutEntrypoints;
  "features/payments/application/stripeWebhookEntrypoints": typeof features_payments_application_stripeWebhookEntrypoints;
  "features/search/application/entrypoints": typeof features_search_application_entrypoints;
  "features/users/application/entrypoints": typeof features_users_application_entrypoints;
  "features/users/application/identityEntrypoints": typeof features_users_application_identityEntrypoints;
  "features/users/application/verificationEntrypoints": typeof features_users_application_verificationEntrypoints;
  "guards/adminGuard": typeof guards_adminGuard;
  "guards/bookingGuard": typeof guards_bookingGuard;
  "guards/redirectUrlGuard": typeof guards_redirectUrlGuard;
  "guards/renterVerificationGuard": typeof guards_renterVerificationGuard;
  hostMapper: typeof hostMapper;
  http: typeof http;
  identity: typeof identity;
  paymentsOrchestrator: typeof paymentsOrchestrator;
  recentSearches: typeof recentSearches;
  "seeders/absurdListings": typeof seeders_absurdListings;
  "seeders/bookings": typeof seeders_bookings;
  "seeders/cars": typeof seeders_cars;
  "seeders/helpers": typeof seeders_helpers;
  "seeders/index": typeof seeders_index;
  "seeders/reviews": typeof seeders_reviews;
  stripe: typeof stripe;
  stripeConnect: typeof stripeConnect;
  stripePayouts: typeof stripePayouts;
  stripeWebhook: typeof stripeWebhook;
  stripeWebhookEvents: typeof stripeWebhookEvents;
  userMapper: typeof userMapper;
  users: typeof users;
  verification: typeof verification;
  verificationPolicy: typeof verificationPolicy;
  verificationProvider: typeof verificationProvider;
  verificationProviderStripe: typeof verificationProviderStripe;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  actionCache: {
    crons: {
      purge: FunctionReference<
        "mutation",
        "internal",
        { expiresAt?: number },
        null
      >;
    };
    lib: {
      get: FunctionReference<
        "query",
        "internal",
        { args: any; name: string; ttl: number | null },
        { kind: "hit"; value: any } | { expiredEntry?: string; kind: "miss" }
      >;
      put: FunctionReference<
        "mutation",
        "internal",
        {
          args: any;
          expiredEntry?: string;
          name: string;
          ttl: number | null;
          value: any;
        },
        { cacheHit: boolean; deletedExpiredEntry: boolean }
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { args: any; name: string },
        null
      >;
      removeAll: FunctionReference<
        "mutation",
        "internal",
        { batchSize?: number; before?: number; name?: string },
        null
      >;
    };
  };
};
