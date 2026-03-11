import { internalMutation } from "./_generated/server";

const TABLES = [
  "auditEvents",
  "keyWrappers",
  "devices",
  "secretRevisions",
  "secretSets",
  "environments",
  "projects",
  "workspaceMembers",
  "workspaces",
  "users",
] as const;

export default internalMutation(async (ctx) => {
  for (const table of TABLES) {
    const docs = await ctx.db.query(table).collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
  }
});
