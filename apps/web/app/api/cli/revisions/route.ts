import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "CLI revision sync is not wired to Convex yet.",
      nextStep: "Replace this route with a ConvexHttpClient-backed mutation or let the CLI talk to Convex directly."
    },
    { status: 501 }
  );
}

