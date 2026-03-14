import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { createAuditEvent, requireWorkspaceRole } from "./lib";

export const listForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin", "member", "viewer"]);
    return ctx.db
      .query("integrations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getById = query({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) throw new Error("Integration not found");
    const project = await ctx.db.get(integration.projectId);
    if (!project) throw new Error("Project not found");
    await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin", "member", "viewer"]);
    return integration;
  },
});

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    const { identity } = await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin"]);

    const integrationId = await ctx.db.insert("integrations", {
      projectId: args.projectId,
      provider: args.provider,
      label: args.label,
      config: args.config,
      environmentMappings: args.environmentMappings,
      createdAt: Date.now(),
      createdBy: identity.subject,
    });

    await createAuditEvent(ctx, {
      workspaceId: project.workspaceId,
      actorId: identity.subject,
      action: "integration.created",
      subjectId: integrationId,
      metadata: { provider: args.provider },
    });

    return integrationId;
  },
});

export const update = mutation({
  args: {
    integrationId: v.id("integrations"),
    label: v.optional(v.string()),
    config: v.optional(v.object({
      deploymentUrl: v.optional(v.string()),
      vercelProjectId: v.optional(v.string()),
      wrappedCredential: v.string(),
    })),
    environmentMappings: v.optional(v.array(v.object({
      providerTarget: v.string(),
      environmentId: v.id("environments"),
      filePath: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) throw new Error("Integration not found");
    const project = await ctx.db.get(integration.projectId);
    if (!project) throw new Error("Project not found");
    await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin"]);

    const patch: Record<string, unknown> = {};
    if (args.label !== undefined) patch.label = args.label;
    if (args.config !== undefined) patch.config = args.config;
    if (args.environmentMappings !== undefined) patch.environmentMappings = args.environmentMappings;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.integrationId, patch);
    }
  },
});

export const remove = mutation({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) throw new Error("Integration not found");
    const project = await ctx.db.get(integration.projectId);
    if (!project) throw new Error("Project not found");
    const { identity } = await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin"]);

    await ctx.db.delete(args.integrationId);

    await createAuditEvent(ctx, {
      workspaceId: project.workspaceId,
      actorId: identity.subject,
      action: "integration.deleted",
      subjectId: args.integrationId,
      metadata: { provider: integration.provider },
    });
  },
});

export const updateSyncStatus = mutation({
  args: {
    integrationId: v.id("integrations"),
    status: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) throw new Error("Integration not found");

    await ctx.db.patch(args.integrationId, {
      lastSyncAt: Date.now(),
      lastSyncStatus: args.status,
      lastSyncError: args.error,
    });
  },
});
