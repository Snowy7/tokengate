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
      .query("fileSchemas")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getForFilePath = query({
  args: {
    projectId: v.id("projects"),
    filePath: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin", "member", "viewer"]);
    return ctx.db
      .query("fileSchemas")
      .withIndex("by_project_and_path", (q) =>
        q.eq("projectId", args.projectId).eq("filePath", args.filePath)
      )
      .unique();
  },
});

export const upsert = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    const { identity } = await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin"]);

    // Validate field names are unique
    const names = new Set<string>();
    for (const field of args.fields) {
      if (names.has(field.name)) {
        throw new Error(`Duplicate field name: ${field.name}`);
      }
      if (!/^[A-Z_][A-Z0-9_]*$/i.test(field.name)) {
        throw new Error(`Invalid field name: ${field.name}. Use letters, numbers, underscores.`);
      }
      names.add(field.name);
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("fileSchemas")
      .withIndex("by_project_and_path", (q) =>
        q.eq("projectId", args.projectId).eq("filePath", args.filePath)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        fields: args.fields,
        version: existing.version + 1,
        updatedAt: now,
      });

      await createAuditEvent(ctx, {
        workspaceId: project.workspaceId,
        actorId: identity.subject,
        action: "schema.updated",
        subjectId: existing._id,
        metadata: { filePath: args.filePath, version: existing.version + 1, fieldCount: args.fields.length },
      });

      return existing._id;
    }

    const schemaId = await ctx.db.insert("fileSchemas", {
      projectId: args.projectId,
      filePath: args.filePath,
      fields: args.fields,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    await createAuditEvent(ctx, {
      workspaceId: project.workspaceId,
      actorId: identity.subject,
      action: "schema.created",
      subjectId: schemaId,
      metadata: { filePath: args.filePath, fieldCount: args.fields.length },
    });

    return schemaId;
  },
});

export const remove = mutation({
  args: { fileSchemaId: v.id("fileSchemas") },
  handler: async (ctx, args) => {
    const schema = await ctx.db.get(args.fileSchemaId);
    if (!schema) throw new Error("Schema not found");

    const project = await ctx.db.get(schema.projectId);
    if (!project) throw new Error("Project not found");
    const { identity } = await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin"]);

    await ctx.db.delete(args.fileSchemaId);

    await createAuditEvent(ctx, {
      workspaceId: project.workspaceId,
      actorId: identity.subject,
      action: "schema.deleted",
      subjectId: args.fileSchemaId,
      metadata: { filePath: schema.filePath },
    });
  },
});

/** Add a single field to an existing schema */
export const addField = mutation({
  args: {
    fileSchemaId: v.id("fileSchemas"),
    field: v.object({
      name: v.string(),
      type: v.string(),
      required: v.boolean(),
      sensitive: v.boolean(),
      defaultValue: v.optional(v.string()),
      description: v.optional(v.string()),
      enumValues: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const schema = await ctx.db.get(args.fileSchemaId);
    if (!schema) throw new Error("Schema not found");

    const project = await ctx.db.get(schema.projectId);
    if (!project) throw new Error("Project not found");
    await requireWorkspaceRole(ctx, project.workspaceId, ["owner", "admin"]);

    // Check for duplicate
    if (schema.fields.some((f) => f.name === args.field.name)) {
      throw new Error(`Field "${args.field.name}" already exists in schema`);
    }

    await ctx.db.patch(args.fileSchemaId, {
      fields: [...schema.fields, args.field],
      version: schema.version + 1,
      updatedAt: Date.now(),
    });
  },
});
