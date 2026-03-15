import { NextRequest, NextResponse } from "next/server";
import { convexFunctions } from "@tokengate/sdk";
import { handleApiError } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { client } = await getAuthenticatedConvexClient();
    await client.mutation(convexFunctions.deleteEnvironment, { environmentId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
