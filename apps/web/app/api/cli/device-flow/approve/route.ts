import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type Device } from "@tokengate/sdk";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function GET(request: NextRequest) {
  const callback = request.nextUrl.searchParams.get("callback");
  const state = request.nextUrl.searchParams.get("state");
  const deviceName = request.nextUrl.searchParams.get("device_name");
  const publicKey = request.nextUrl.searchParams.get("public_key");

  if (!callback || !state || !deviceName || !publicKey) {
    return NextResponse.json({ error: "Missing device flow parameters" }, { status: 400 });
  }

  try {
    const { client, token } = await getAuthenticatedConvexClient();
    const { id: deviceId } = await client.mutation<Pick<Device, "id">>(convexFunctions.registerDevice, {
      label: deviceName,
      publicKey: JSON.parse(publicKey)
    });

    const redirectUrl = new URL(callback);
    redirectUrl.searchParams.set("state", state);
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("device_id", deviceId);
    redirectUrl.searchParams.set("convex_url", process.env.NEXT_PUBLIC_CONVEX_URL ?? "");

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const redirectUrl = new URL(callback);
    redirectUrl.searchParams.set("state", state);
    redirectUrl.searchParams.set("error", error instanceof Error ? error.message : "Device authorization failed");
    return NextResponse.redirect(redirectUrl);
  }
}
