import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type Integration, type SecretRevision } from "@tokengate/sdk";
import { createAdapter } from "@tokengate/sdk/providers";
import { jsonError, handleApiError } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { direction?: "pull" | "push"; mappingIndex?: number };
    const direction = body.direction ?? "pull";

    const { client } = await getAuthenticatedConvexClient();
    const integration = await client.query<Integration>(convexFunctions.getIntegration, { integrationId: id });
    if (!integration) {
      return jsonError(404, "Integration not found");
    }

    // TODO: Decrypt wrappedCredential with workspace key
    const credential = integration.config.wrappedCredential;

    const adapter = createAdapter(integration.provider);
    const providerConfig = {
      credential,
      deploymentUrl: integration.config.deploymentUrl,
      vercelProjectId: integration.config.vercelProjectId,
    };

    if (direction === "pull") {
      // Pull from provider
      const vars = await adapter.pull({
        ...providerConfig,
        target: integration.environmentMappings[body.mappingIndex ?? 0]?.providerTarget,
      });

      // Update sync status
      await client.mutation(convexFunctions.updateIntegrationSyncStatus, {
        integrationId: id,
        status: "success",
      });

      return NextResponse.json({
        success: true,
        direction: "pull",
        count: vars.length,
        vars: vars.map((v) => ({ key: v.key, sensitive: v.sensitive })),
      });
    }

    if (direction === "push") {
      // Push to provider — caller must provide the vars
      const pushBody = body as { direction: "push"; vars?: Array<{ key: string; value: string; sensitive?: boolean }> };
      if (!pushBody.vars) {
        return jsonError(400, "Missing vars for push");
      }

      await adapter.push(
        {
          ...providerConfig,
          target: integration.environmentMappings[body.mappingIndex ?? 0]?.providerTarget,
        },
        pushBody.vars,
      );

      await client.mutation(convexFunctions.updateIntegrationSyncStatus, {
        integrationId: id,
        status: "success",
      });

      return NextResponse.json({ success: true, direction: "push", count: pushBody.vars.length });
    }

    return jsonError(400, "Invalid direction");
  } catch (error) {
    // Try to update sync status on failure
    try {
      const { id } = await params;
      const { client } = await getAuthenticatedConvexClient();
      await client.mutation(convexFunctions.updateIntegrationSyncStatus, {
        integrationId: id,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } catch {
      // Ignore status update failures
    }
    return handleApiError(error);
  }
}
