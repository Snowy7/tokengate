import { describe, expect, test } from "bun:test";
import {
  bootstrapWorkspace,
  decryptRevisionPayload,
  encryptRevisionPayload,
  generateDeviceKeyPair,
  restoreWorkspaceKeyFromRecoveryPhrase,
  unwrapWorkspaceKeyForDevice,
  wrapWorkspaceKeyForDevice
} from "./index";

describe("crypto", () => {
  test("encrypts and decrypts revision payloads", async () => {
    const workspace = await bootstrapWorkspace();
    const encrypted = await encryptRevisionPayload("TOKEN=abc123\n", workspace.workspaceKey);
    const decrypted = await decryptRevisionPayload(encrypted, workspace.workspaceKey);

    expect(decrypted).toBe("TOKEN=abc123\n");
  });

  test("recovery phrase restores the workspace key", async () => {
    const workspace = await bootstrapWorkspace();
    expect(restoreWorkspaceKeyFromRecoveryPhrase(workspace.recoveryPhrase)).toBe(workspace.workspaceKey);
  });

  test("wraps workspace keys for devices", async () => {
    const workspace = await bootstrapWorkspace();
    const device = await generateDeviceKeyPair();
    const wrapped = await wrapWorkspaceKeyForDevice(workspace.workspaceKey, device.publicKey);
    const unwrapped = await unwrapWorkspaceKeyForDevice(wrapped, device.privateKey);

    expect(unwrapped).toBe(workspace.workspaceKey);
  });
});

