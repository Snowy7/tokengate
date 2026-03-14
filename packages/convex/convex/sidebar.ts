import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth, requireWorkspaceRole } from "./lib";

/**
 * Single query that returns all sidebar data for the dashboard.
 * Fetches workspaces, then for the selected workspace: all projects
 * and all environments with metadata — in one round trip.
 */
export const load = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    // 1. All workspaces the user belongs to
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const workspaces = await Promise.all(
      memberships.map(async (membership) => ({
        membership,
        workspace: await ctx.db.get(membership.workspaceId),
      }))
    );

    // If no workspace selected, return just workspaces
    if (!args.workspaceId) {
      return { workspaces, projects: [], environments: [] };
    }

    // 2. Verify membership in the selected workspace
    await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner", "admin", "member", "viewer",
    ]);

    // 3. All projects for this workspace
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
      .collect();

    // 4. Load file schemas and integrations for this workspace's projects
    const allSchemas = await Promise.all(
      projects.map((p) =>
        ctx.db.query("fileSchemas").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect()
      )
    );
    const schemasByProject = new Map(projects.map((p, i) => [p._id, allSchemas[i]]));

    const allIntegrations = await Promise.all(
      projects.map((p) =>
        ctx.db.query("integrations").withIndex("by_project", (q) => q.eq("projectId", p._id)).collect()
      )
    );
    const integrationsByProject = new Map(projects.map((p, i) => [p._id, allIntegrations[i]]));

    // 5. All environments across all projects, with metadata
    const environments = await Promise.all(
      projects.map(async (project) => {
        const envs = await ctx.db
          .query("environments")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const projectSchemas = schemasByProject.get(project._id) ?? [];
        const projectIntegrations = integrationsByProject.get(project._id) ?? [];

        // Build a map of filePath → source from integrations
        const sourceByFilePath = new Map<string, string>();
        for (const integ of projectIntegrations) {
          for (const mapping of integ.environmentMappings) {
            sourceByFilePath.set(`${mapping.environmentId}:${mapping.filePath}`, integ.provider);
          }
        }

        // Build a set of filePaths that have schemas
        const schemaFilePaths = new Set(projectSchemas.map((s) => s.filePath));

        const envsWithMeta = await Promise.all(
          envs.map(async (env) => {
            const secretSets = await ctx.db
              .query("secretSets")
              .withIndex("by_environment", (q) => q.eq("environmentId", env._id))
              .collect();

            let latestRevisionTimestamp: number | null = null;
            const files: Array<{
              secretSetId: string;
              filePath: string | null;
              latestRevision: number | null;
              hasSchema: boolean;
              source: string;
            }> = [];

            for (const ss of secretSets) {
              if (ss.latestRevision) {
                const rev = await ctx.db
                  .query("secretRevisions")
                  .withIndex("by_secret_set_and_revision", (q) =>
                    q.eq("secretSetId", ss._id).eq("revision", ss.latestRevision!)
                  )
                  .unique();
                if (rev) {
                  if (!latestRevisionTimestamp || rev.createdAt > latestRevisionTimestamp) {
                    latestRevisionTimestamp = rev.createdAt;
                  }
                }
              }

              const fp = ss.filePath ?? ".env";
              files.push({
                secretSetId: ss._id,
                filePath: ss.filePath ?? null,
                latestRevision: ss.latestRevision ?? null,
                hasSchema: schemaFilePaths.has(fp),
                source: sourceByFilePath.get(`${env._id}:${fp}`) ?? "tokengate",
              });
            }

            return {
              environment: env,
              fileCount: secretSets.length,
              files,
              latestRevisionTimestamp,
            };
          })
        );

        return { projectId: project._id, environments: envsWithMeta };
      })
    );

    // Flatten into a single array
    const allEnvironments = environments.flatMap((pe) => pe.environments);

    return { workspaces, projects, environments: allEnvironments };
  },
});
