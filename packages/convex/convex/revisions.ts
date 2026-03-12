import { v, ConvexError } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { createAuditEvent, requireWorkspaceRole } from "./lib";
import type { Id } from "./_generated/dataModel";

async function getWorkspaceIdForSecretSet(ctx: QueryCtx | MutationCtx, secretSetId: Id<"secretSets">) {
  const secretSet = await ctx.db.get(secretSetId);
  if (!secretSet) {
    throw new ConvexError("Secret set not found");
  }

  const environment = await ctx.db.get(secretSet.environmentId);
  if (!environment) {
    throw new ConvexError("Environment not found");
  }

  const project = await ctx.db.get(environment.projectId);
  if (!project) {
    throw new ConvexError("Project not found");
  }

  return { workspaceId: project.workspaceId, secretSet };
}

export const listRevisionHistory = query({
  args: {
    secretSetId: v.id("secretSets")
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await getWorkspaceIdForSecretSet(ctx, args.secretSetId);
    await requireWorkspaceRole(ctx, workspaceId, ["owner", "admin", "member", "viewer"]);
    return ctx.db.query("secretRevisions").withIndex("by_secret_set", (query) => query.eq("secretSetId", args.secretSetId)).collect();
  }
});

export const getLatestRevision = query({
  args: {
    secretSetId: v.id("secretSets")
  },
  handler: async (ctx, args) => {
    const { workspaceId, secretSet } = await getWorkspaceIdForSecretSet(ctx, args.secretSetId);
    await requireWorkspaceRole(ctx, workspaceId, ["owner", "admin", "member", "viewer"]);

    if (!secretSet.latestRevision) {
      return null;
    }

    return ctx.db
      .query("secretRevisions")
      .withIndex("by_secret_set_and_revision", (query) =>
        query.eq("secretSetId", args.secretSetId).eq("revision", secretSet.latestRevision!)
      )
      .unique();
  }
});

export const restoreRevision = mutation({
  args: {
    secretSetId: v.id("secretSets"),
    targetRevision: v.number()
  },
  handler: async (ctx, args) => {
    const { workspaceId, secretSet } = await getWorkspaceIdForSecretSet(ctx, args.secretSetId);
    const { identity } = await requireWorkspaceRole(ctx, workspaceId, ["owner", "admin", "member"]);

    // Find the target revision
    const targetRev = await ctx.db
      .query("secretRevisions")
      .withIndex("by_secret_set_and_revision", (query) =>
        query.eq("secretSetId", args.secretSetId).eq("revision", args.targetRevision)
      )
      .unique();

    if (!targetRev) {
      throw new ConvexError("Target revision not found");
    }

    const latestRevision = secretSet.latestRevision ?? 0;
    const newRevision = latestRevision + 1;

    // Copy the old revision's encrypted payload into a new revision
    const revisionId = await ctx.db.insert("secretRevisions", {
      secretSetId: args.secretSetId,
      revision: newRevision,
      ciphertext: targetRev.ciphertext,
      wrappedDataKey: targetRev.wrappedDataKey,
      contentHash: targetRev.contentHash,
      baseRevision: latestRevision,
      createdAt: Date.now(),
      createdBy: identity.subject
    });

    await ctx.db.patch(args.secretSetId, {
      latestRevision: newRevision
    });

    await createAuditEvent(ctx, {
      workspaceId,
      actorId: identity.subject,
      action: "revision.restored",
      subjectId: revisionId,
      metadata: {
        restoredFromRevision: args.targetRevision,
        newRevision
      }
    });

    return {
      newRevision,
      revisionId
    };
  }
});

export const createRevision = mutation({
  args: {
    secretSetId: v.id("secretSets"),
    baseRevision: v.optional(v.number()),
    ciphertext: v.string(),
    wrappedDataKey: v.string(),
    contentHash: v.string()
  },
  handler: async (ctx, args) => {
    const { workspaceId, secretSet } = await getWorkspaceIdForSecretSet(ctx, args.secretSetId);
    const { identity } = await requireWorkspaceRole(ctx, workspaceId, ["owner", "admin", "member"]);

    const latestRevision = secretSet.latestRevision ?? 0;
    if ((args.baseRevision ?? 0) !== latestRevision) {
      return {
        conflict: true,
        latestRevision
      };
    }

    const revision = latestRevision + 1;
    const revisionId = await ctx.db.insert("secretRevisions", {
      secretSetId: args.secretSetId,
      revision,
      ciphertext: args.ciphertext,
      wrappedDataKey: args.wrappedDataKey,
      contentHash: args.contentHash,
      baseRevision: args.baseRevision,
      createdAt: Date.now(),
      createdBy: identity.subject
    });

    await ctx.db.patch(args.secretSetId, {
      latestRevision: revision
    });

    await createAuditEvent(ctx, {
      workspaceId,
      actorId: identity.subject,
      action: "revision.created",
      subjectId: revisionId,
      metadata: {
        revision
      }
    });

    return {
      conflict: false,
      acceptedRevision: revision
    };
  }
});
