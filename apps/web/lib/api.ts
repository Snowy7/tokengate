import { NextResponse } from "next/server";
import { PermissionError } from "@tokengate/sdk";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export function handleApiError(error: unknown) {
  if (error instanceof PermissionError) {
    return jsonError(403, toErrorMessage(error));
  }
  return jsonError(500, toErrorMessage(error));
}

