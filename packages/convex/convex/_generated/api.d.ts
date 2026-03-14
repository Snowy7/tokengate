/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as devices from "../devices.js";
import type * as fileSchemas from "../fileSchemas.js";
import type * as integrations from "../integrations.js";
import type * as invites from "../invites.js";
import type * as lib from "../lib.js";
import type * as members from "../members.js";
import type * as revisions from "../revisions.js";
import type * as sidebar from "../sidebar.js";
import type * as wipe from "../wipe.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  devices: typeof devices;
  fileSchemas: typeof fileSchemas;
  integrations: typeof integrations;
  invites: typeof invites;
  lib: typeof lib;
  members: typeof members;
  revisions: typeof revisions;
  sidebar: typeof sidebar;
  wipe: typeof wipe;
  workspaces: typeof workspaces;
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
