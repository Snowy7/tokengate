import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type Integration } from "@tokengate/sdk";
import { jsonError, handleApiError } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId) return jsonError(400, "Missing projectId");

    const { client } = await getAuthenticatedConvexClient();
    const integrations = await client.query<Integration[]>(convexFunctions.listIntegrations, { projectId });
    return NextResponse.json({ integrations });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.projectId || !body.provider || !body.config) {
      return jsonError(400, "Missing projectId, provider, or config");
    }

    const payload = {
      ...body,
      environmentMappings: Array.isArray(body.environmentMappings) ? body.environmentMappings : [],
    };

    const { client } = await getAuthenticatedConvexClient();
    const integrationId = await client.mutation<string>(convexFunctions.createIntegration, payload);
    return NextResponse.json({ integrationId });
  } catch (error) {
    return handleApiError(error);
  }
}
