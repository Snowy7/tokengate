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
    const secretSet = await client.query<SecretSet | null>(convexFunctions.getSecretSetForEnvironment, {
      environmentId
    });
    return NextResponse.json({ secretSet });
  } catch (error) {
    return jsonError(500, toErrorMessage(error));
  }
}

