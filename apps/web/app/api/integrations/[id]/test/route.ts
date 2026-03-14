import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type Integration } from "@tokengate/sdk";
import { createAdapter } from "@tokengate/sdk/providers";
import { handleApiError } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { client } = await getAuthenticatedConvexClient();

    const integration = await client.query<Integration>(convexFunctions.getIntegration, { integrationId: id });
    if (!integration) {
      return NextResponse.json({ ok: false, error: "Integration not found" }, { status: 404 });
    }

    // TODO: Decrypt wrappedCredential with workspace key
    // For now, use it directly (it should be pre-decrypted by the client before storing)
    const credential = integration.config.wrappedCredential;

    const adapter = createAdapter(integration.provider);
    const result = await adapter.testConnection({
      credential,
      deploymentUrl: integration.config.deploymentUrl,
      vercelProjectId: integration.config.vercelProjectId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
