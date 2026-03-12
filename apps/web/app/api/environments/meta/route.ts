import { NextRequest, NextResponse } from "next/server";
import { convexFunctions } from "@tokengate/sdk";
import { jsonError, toErrorMessage } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      return jsonError(400, "Missing projectId");
    }

    const { client } = await getAuthenticatedConvexClient();
    const environments = await client.query(convexFunctions.listEnvironmentsWithMeta, {
      projectId
    });
    return NextResponse.json({ environments });
  } catch (error) {
    return jsonError(500, toErrorMessage(error));
  }
}
