import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
    imageUrl: v.optional(v.string())
  }).index("by_clerk_id", ["clerkId"]),

  workspaces: defineTable({
    name: v.string(),
    slug: v.string(),
    type: v.union(v.literal("personal"), v.literal("team")),
    createdBy: v.string(),
    createdAt: v.number()
  }).index("by_slug", ["slug"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member"), v.literal("viewer")),
    invitedBy: v.optional(v.string()),
    joinedAt: v.number()
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"])
    .index("by_user", ["userId"]),

  projects: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    slug: v.string(),
    createdAt: v.number()
  }).index("by_workspace", ["workspaceId"]),

  environments: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    slug: v.string(),
    createdAt: v.number()
  }).index("by_project", ["projectId"]),

  secretSets: defineTable({
    environmentId: v.id("environments"),
    filePath: v.optional(v.string()),
    keySalt: v.string(),
    latestRevision: v.optional(v.number()),
    createdAt: v.number()
  }).index("by_environment", ["environmentId"]),

  secretRevisions: defineTable({
    secretSetId: v.id("secretSets"),
    revision: v.number(),
    ciphertext: v.string(),
    wrappedDataKey: v.string(),
    contentHash: v.string(),
    baseRevision: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.string()
  })
    .index("by_secret_set", ["secretSetId"])
    .index("by_secret_set_and_revision", ["secretSetId", "revision"]),

  devices: defineTable({
    userId: v.string(),
    label: v.string(),
    publicKey: v.any(),
    lastSeenAt: v.number(),
    revokedAt: v.optional(v.number())
  }).index("by_user", ["userId"]),

  keyWrappers: defineTable({
    workspaceId: v.id("workspaces"),
    targetKind: v.union(v.literal("member"), v.literal("device")),
    targetId: v.string(),
    wrappedWorkspaceKey: v.string(),
    createdAt: v.number(),
    createdBy: v.string()
  }).index("by_workspace_and_target", ["workspaceId", "targetId"]),

  invites: defineTable({
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
    token: v.string(),
    invitedBy: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")),
    createdAt: v.number(),
    expiresAt: v.number()
  })
    .index("by_token", ["token"])
    .index("by_workspace", ["workspaceId"])
    .index("by_email", ["email"])
    .index("by_workspace_and_email", ["workspaceId", "email"]),

  auditEvents: defineTable({
    workspaceId: v.id("workspaces"),
    actorId: v.string(),
    action: v.string(),
    subjectId: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number()
  }).index("by_workspace", ["workspaceId"])
});
