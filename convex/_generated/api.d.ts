/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bookings from "../bookings.js";
import type * as bookingsLifecycle from "../bookingsLifecycle.js";
import type * as cars from "../cars.js";
import type * as guards_bookingGuard from "../guards/bookingGuard.js";
import type * as hostMapper from "../hostMapper.js";
import type * as http from "../http.js";
import type * as seeders_bookings from "../seeders/bookings.js";
import type * as seeders_cars from "../seeders/cars.js";
import type * as seeders_helpers from "../seeders/helpers.js";
import type * as seeders_index from "../seeders/index.js";
import type * as seeders_reviews from "../seeders/reviews.js";
import type * as stripe from "../stripe.js";
import type * as stripeConnect from "../stripeConnect.js";
import type * as stripePayouts from "../stripePayouts.js";
import type * as stripeWebhook from "../stripeWebhook.js";
import type * as userMapper from "../userMapper.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bookings: typeof bookings;
  bookingsLifecycle: typeof bookingsLifecycle;
  cars: typeof cars;
  "guards/bookingGuard": typeof guards_bookingGuard;
  hostMapper: typeof hostMapper;
  http: typeof http;
  "seeders/bookings": typeof seeders_bookings;
  "seeders/cars": typeof seeders_cars;
  "seeders/helpers": typeof seeders_helpers;
  "seeders/index": typeof seeders_index;
  "seeders/reviews": typeof seeders_reviews;
  stripe: typeof stripe;
  stripeConnect: typeof stripeConnect;
  stripePayouts: typeof stripePayouts;
  stripeWebhook: typeof stripeWebhook;
  userMapper: typeof userMapper;
  users: typeof users;
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

export declare const components: {};
