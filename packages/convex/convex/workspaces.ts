import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { createAuditEvent, requireAuth, requireWorkspaceRole } from "./lib";

export const listWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (query) => query.eq("userId", identity.subject))
      .collect();

    return Promise.all(
      memberships.map(async (membership) => ({
        membership,
        workspace: await ctx.db.get(membership.workspaceId)
      }))
    );
  }
});

export const createWorkspace = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    type: v.union(v.literal("personal"), v.literal("team")),
    ownerWrappedWorkspaceKey: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const createdAt = Date.now();

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      slug: args.slug,
      type: args.type,
      createdBy: identity.subject,
      createdAt
    });

    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId: identity.subject,
      role: "owner",
      joinedAt: createdAt
    });

    await ctx.db.insert("keyWrappers", {
      workspaceId,
      targetKind: "member",
      targetId: identity.subject,
      wrappedWorkspaceKey: args.ownerWrappedWorkspaceKey,
      createdAt,
      createdBy: identity.subject
    });

    await createAuditEvent(ctx, {
      workspaceId,
      actorId: identity.subject,
      action: "workspace.created",
      subjectId: workspaceId
    });

    return workspaceId;
  }
});

export const createProject = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    slug: v.string()
  },
  handler: async (ctx, args) => {
    const { identity } = await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin", "member"]);
    const projectId = await ctx.db.insert("projects", {
      workspaceId: args.workspaceId,
      name: args.name,
      slug: args.slug,
      createdAt: Date.now()
    });

    await createAuditEvent(ctx, {
      workspaceId: args.workspaceId,
      actorId: identity.subject,
      action: "project.created",
      subjectId: projectId
    });

    return projectId;
  }
});

export const listProjects = query({
  args: {
    workspaceId: v.id("workspaces")
  },
  handler: async (ctx, args) => {
    await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin", "member", "viewer"]);
    return ctx.db.query("projects").withIndex("by_workspace", (query) => query.eq("workspaceId", args.workspaceId)).collect();
  }
});

export const createEnvironment = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    slug: v.string()
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const { identity } = await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin", "member"]);
    const environmentId = await ctx.db.insert("environments", {
      projectId: args.projectId,
      name: args.name,
      slug: args.slug,
      createdAt: Date.now()
    });

    await ctx.db.insert("secretSets", {
      environmentId,
      createdAt: Date.now()
    });

    await createAuditEvent(ctx, {
      workspaceId: project.workspaceId,
      actorId: identity.subject,
      action: "environment.created",
      subjectId: environmentId
    });

    return environmentId;
  }
});

export const listEnvironments = query({
  args: {
    projectId: v.id("projects")
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin", "member", "viewer"]);
    return ctx.db.query("environments").withIndex("by_project", (query) => query.eq("projectId", args.projectId)).collect();
  }
});

export const getSecretSetForEnvironment = query({
  args: {
    environmentId: v.id("environments")
  },
  handler: async (ctx, args) => {
    const environment = await ctx.db.get(args.environmentId);
    if (!environment) {
      throw new Error("Environment not found");
    }

    const project = await ctx.db.get(environment.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin", "member", "viewer"]);
    return ctx.db.query("secretSets").withIndex("by_environment", (query) => query.eq("environmentId", args.environmentId)).unique();
  }
});
