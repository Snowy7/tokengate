import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { createAuditEvent, requireWorkspaceRole } from "./lib";

export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    const { identity } = await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin"]);

    // Delete all environments, secretSets, revisions, schemas, integrations
    const environments = await ctx.db.query("environments").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    for (const env of environments) {
      const secretSets = await ctx.db.query("secretSets").withIndex("by_environment", (q) => q.eq("environmentId", env._id)).collect();
      for (const ss of secretSets) {
        const revisions = await ctx.db.query("secretRevisions").withIndex("by_secret_set", (q) => q.eq("secretSetId", ss._id)).collect();
        for (const rev of revisions) await ctx.db.delete(rev._id);
        await ctx.db.delete(ss._id);
      }
      await ctx.db.delete(env._id);
    }

    // Delete file schemas
    const schemas = await ctx.db.query("fileSchemas").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    for (const s of schemas) await ctx.db.delete(s._id);

    // Delete integrations
    const integrations = await ctx.db.query("integrations").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    for (const i of integrations) await ctx.db.delete(i._id);

    await ctx.db.delete(args.projectId);

    await createAuditEvent(ctx, {
      workspaceId: project.workspaceId,
      actorId: identity.subject,
      action: "project.deleted",
      subjectId: args.projectId,
      metadata: { name: project.name },
    });
  },
});

export const deleteEnvironment = mutation({
  args: { environmentId: v.id("environments") },
  handler: async (ctx, args) => {
    const env = await ctx.db.get(args.environmentId);
    if (!env) throw new Error("Environment not found");
    const project = await ctx.db.get(env.projectId);
    if (!project) throw new Error("Project not found");
    const { identity } = await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin"]);

    // Delete all secretSets and revisions
    const secretSets = await ctx.db.query("secretSets").withIndex("by_environment", (q) => q.eq("environmentId", args.environmentId)).collect();
    for (const ss of secretSets) {
      const revisions = await ctx.db.query("secretRevisions").withIndex("by_secret_set", (q) => q.eq("secretSetId", ss._id)).collect();
      for (const rev of revisions) await ctx.db.delete(rev._id);
      await ctx.db.delete(ss._id);
    }

    await ctx.db.delete(args.environmentId);

    await createAuditEvent(ctx, {
      workspaceId: project.workspaceId,
      actorId: identity.subject,
      action: "environment.deleted",
      subjectId: args.environmentId,
      metadata: { name: env.name },
    });
  },
});

export const deleteSecretSet = mutation({
  args: { secretSetId: v.id("secretSets") },
  handler: async (ctx, args) => {
    const ss = await ctx.db.get(args.secretSetId);
    if (!ss) throw new Error("Secret set not found");
    const env = await ctx.db.get(ss.environmentId);
    if (!env) throw new Error("Environment not found");
    const project = await ctx.db.get(env.projectId);
    if (!project) throw new Error("Project not found");
    const { identity } = await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin"]);

    // Delete all revisions
    const revisions = await ctx.db.query("secretRevisions").withIndex("by_secret_set", (q) => q.eq("secretSetId", args.secretSetId)).collect();
    for (const rev of revisions) await ctx.db.delete(rev._id);

    await ctx.db.delete(args.secretSetId);

    await createAuditEvent(ctx, {
      workspaceId: project.workspaceId,
      actorId: identity.subject,
      action: "file.deleted",
      subjectId: args.secretSetId,
      metadata: { filePath: ss.filePath ?? ".env" },
    });
  },
});
