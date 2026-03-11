import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { createAuditEvent, requireAuth } from "./lib";

export const listDevices = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
    return ctx.db.query("devices").withIndex("by_user", (query) => query.eq("userId", identity.subject)).collect();
  }
});

export const registerDevice = mutation({
  args: {
    label: v.string(),
    publicKey: v.any()
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const createdAt = Date.now();
    const deviceId = await ctx.db.insert("devices", {
      userId: identity.subject,
      label: args.label,
      publicKey: args.publicKey,
      lastSeenAt: createdAt
    });

    return {
      id: deviceId
    };
  }
});

export const revokeDevice = mutation({
  args: {
    deviceId: v.id("devices")
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const device = await ctx.db.get(args.deviceId);
    if (!device || device.userId !== identity.subject) {
      throw new Error("Device not found");
    }

    await ctx.db.patch(args.deviceId, {
      revokedAt: Date.now()
    });

    const memberships = await ctx.db.query("workspaceMembers").collect();
    const ownedMembership = memberships.find((membership) => membership.userId === identity.subject);

    if (ownedMembership) {
      await createAuditEvent(ctx, {
        workspaceId: ownedMembership.workspaceId,
        actorId: identity.subject,
        action: "device.revoked",
        subjectId: args.deviceId
      });
    }

    return { success: true };
  }
});
