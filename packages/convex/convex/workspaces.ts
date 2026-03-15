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
    slug: v.string(),
    keySalt: v.optional(v.string()),
    filePath: v.optional(v.string())
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

    // Store keySalt on the environment level for later use when adding files
    // Do NOT auto-create a secretSet — files are added explicitly via addSecretSet

    await createAuditEvent(ctx, {
      workspaceId: project.workspaceId,
      actorId: identity.subject,
      action: "environment.created",
      subjectId: environmentId
    });

    return environmentId;
  }
});

export const updateEnvironment = mutation({
  args: {
    environmentId: v.id("environments"),
    name: v.optional(v.string()),
    slug: v.optional(v.string())
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

    await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin", "member"]);

    const patch: Record<string, string> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.slug !== undefined) patch.slug = args.slug;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.environmentId, patch);
    }
  }
});

export const addSecretSet = mutation({
  args: {
    environmentId: v.id("environments"),
    filePath: v.string(),
    keySalt: v.optional(v.string())
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

    await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin", "member"]);

    // Prevent duplicate file paths within the same environment
    const normalizedPath = args.filePath.replace(/\\/g, "/");
    const existingSets = await ctx.db.query("secretSets")
      .withIndex("by_environment", (q) => q.eq("environmentId", args.environmentId))
      .collect();

    const duplicate = existingSets.find(
      (ss) => (ss.filePath ?? "").replace(/\\/g, "/") === normalizedPath
    );
    if (duplicate) {
      throw new Error(`A file with path "${normalizedPath}" already exists in this environment.`);
    }

    // If no keySalt provided, copy from an existing secretSet in this environment
    let keySalt = args.keySalt;
    if (!keySalt) {
      const existing = existingSets[0];
      if (!existing) {
        throw new Error("No existing secret set found to inherit keySalt from. Provide keySalt explicitly.");
      }
      keySalt = existing.keySalt;
    }

    const secretSetId = await ctx.db.insert("secretSets", {
      environmentId: args.environmentId,
      filePath: normalizedPath,
      keySalt,
      createdAt: Date.now()
    });

    return secretSetId;
  }
});

export const listSecretSetsForEnvironment = query({
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
    return ctx.db.query("secretSets")
      .withIndex("by_environment", (q) => q.eq("environmentId", args.environmentId))
      .collect();
  }
});

export const listEnvironmentsWithMeta = query({
  args: {
    projectId: v.id("projects")
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin", "member", "viewer"]);
    const environments = await ctx.db.query("environments").withIndex("by_project", (query) => query.eq("projectId", args.projectId)).collect();

    return Promise.all(
      environments.map(async (env) => {
        const secretSets = await ctx.db.query("secretSets").withIndex("by_environment", (query) => query.eq("environmentId", env._id)).collect();

        let latestRevisionTimestamp: number | null = null;
        const files: Array<{ secretSetId: string; filePath: string | null; latestRevision: number | null }> = [];

        for (const ss of secretSets) {
          let revTimestamp: number | null = null;
          if (ss.latestRevision) {
            const rev = await ctx.db
              .query("secretRevisions")
              .withIndex("by_secret_set_and_revision", (query) =>
                query.eq("secretSetId", ss._id).eq("revision", ss.latestRevision!)
              )
              .unique();
            if (rev) {
              revTimestamp = rev.createdAt;
              if (!latestRevisionTimestamp || rev.createdAt > latestRevisionTimestamp) {
                latestRevisionTimestamp = rev.createdAt;
              }
            }
          }
          files.push({
            secretSetId: ss._id,
            filePath: ss.filePath ?? null,
            latestRevision: ss.latestRevision ?? null
          });
        }

        return {
          environment: env,
          fileCount: secretSets.length,
          files,
          latestRevisionTimestamp
        };
      })
    );
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

export const getSecretSetById = query({
  args: {
    secretSetId: v.id("secretSets")
  },
  handler: async (ctx, args) => {
    const secretSet = await ctx.db.get(args.secretSetId);
    if (!secretSet) return null;

    const environment = await ctx.db.get(secretSet.environmentId);
    if (!environment) return null;

    const project = await ctx.db.get(environment.projectId);
    if (!project) return null;

    await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin", "member", "viewer"]);
    return secretSet;
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
