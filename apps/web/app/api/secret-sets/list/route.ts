import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type SecretSet } from "@tokengate/sdk";
import { jsonError, toErrorMessage } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function GET(request: NextRequest) {
  try {
    const environmentId = request.nextUrl.searchParams.get("environmentId");
    if (!environmentId) {
      return jsonError(400, "Missing environmentId");
    }

    const { client } = await getAuthenticatedConvexClient();
    const secretSets = await client.query<SecretSet[]>(convexFunctions.listSecretSetsForEnvironment, {
      environmentId
    });
    return NextResponse.json({ secretSets });
  } catch (error) {
    return jsonError(500, toErrorMessage(error));
  }
}
