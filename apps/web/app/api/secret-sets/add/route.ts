import { NextRequest, NextResponse } from "next/server";
import { convexFunctions } from "@tokengate/sdk";
import { jsonError, toErrorMessage } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      environmentId?: string;
      filePath?: string;
      keySalt?: string;
    };

    if (!body.environmentId || !body.filePath) {
      return jsonError(400, "Missing environmentId or filePath");
    }

    const { client } = await getAuthenticatedConvexClient();
    const secretSetId = await client.mutation<string>(convexFunctions.addSecretSet, {
      environmentId: body.environmentId,
      filePath: body.filePath,
      keySalt: body.keySalt
    });
    return NextResponse.json({ secretSetId });
  } catch (error) {
    return jsonError(500, toErrorMessage(error));
  }
}
