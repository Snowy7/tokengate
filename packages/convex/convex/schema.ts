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
    keySalt: v.string(),
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

  fileSchemas: defineTable({
    projectId: v.id("projects"),
    filePath: v.string(),
    fields: v.array(v.object({
      name: v.string(),
      type: v.string(),
      required: v.boolean(),
      sensitive: v.boolean(),
      defaultValue: v.optional(v.string()),
      description: v.optional(v.string()),
      enumValues: v.optional(v.array(v.string())),
    })),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_path", ["projectId", "filePath"]),

  integrations: defineTable({
    projectId: v.id("projects"),
    provider: v.string(),
    label: v.optional(v.string()),
    config: v.object({
      deploymentUrl: v.optional(v.string()),
      vercelProjectId: v.optional(v.string()),
      wrappedCredential: v.string(),
    }),
    environmentMappings: v.array(v.object({
      providerTarget: v.string(),
      environmentId: v.id("environments"),
      filePath: v.string(),
    })),
    lastSyncAt: v.optional(v.number()),
    lastSyncStatus: v.optional(v.string()),
    lastSyncError: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.string(),
  })
    .index("by_project", ["projectId"]),

  auditEvents: defineTable({
    workspaceId: v.id("workspaces"),
    actorId: v.string(),
    action: v.string(),
    subjectId: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number()
  }).index("by_workspace", ["workspaceId"])
});
