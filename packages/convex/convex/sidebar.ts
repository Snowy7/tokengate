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

    // 4. All environments across all projects, with metadata
    const environments = await Promise.all(
      projects.map(async (project) => {
        const envs = await ctx.db
          .query("environments")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

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
              files.push({
                secretSetId: ss._id,
                filePath: ss.filePath ?? null,
                latestRevision: ss.latestRevision ?? null,
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
