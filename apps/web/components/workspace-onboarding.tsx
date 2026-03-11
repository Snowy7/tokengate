"use client";

import { useState, useTransition } from "react";
import { bootstrapWorkspace, generateDeviceKeyPair, wrapWorkspaceKeyForDevice } from "@tokengate/crypto";

interface PreviewState {
  recoveryPhrase: string;
  wrappedWorkspaceKey: string;
  publicKey: JsonWebKey;
}

export function WorkspaceOnboarding() {
  const [name, setName] = useState("Acme");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    startTransition(async () => {
      const workspace = await bootstrapWorkspace();
      const device = await generateDeviceKeyPair();
      const wrappedWorkspaceKey = await wrapWorkspaceKeyForDevice(workspace.workspaceKey, device.publicKey);

      setPreview({
        recoveryPhrase: workspace.recoveryPhrase,
        wrappedWorkspaceKey,
        publicKey: device.publicKey
      });
    });
  };

  return (
    <section className="panel" style={{ padding: 24, display: "grid", gap: 20 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 28 }}>Create a workspace</h2>
        <p className="muted" style={{ lineHeight: 1.6 }}>
          The browser generates a workspace key, derives a recovery phrase, and wraps that key for the first device.
        </p>
      </div>

      <label className="field">
        <span>Workspace name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Acme" />
      </label>

      <div style={{ display: "flex", gap: 12 }}>
        <button className="button" onClick={handleGenerate} disabled={isPending || !name.trim()}>
          {isPending ? "Generating..." : "Generate workspace bootstrap"}
        </button>
      </div>

      {preview ? (
        <div className="grid" style={{ gap: 16 }}>
          <div>
            <p style={{ marginBottom: 8, fontWeight: 700 }}>Recovery phrase</p>
            <div className="code-block">{preview.recoveryPhrase}</div>
          </div>
          <div>
            <p style={{ marginBottom: 8, fontWeight: 700 }}>Initial wrapped workspace key</p>
            <div className="code-block">{preview.wrappedWorkspaceKey}</div>
          </div>
          <div>
            <p style={{ marginBottom: 8, fontWeight: 700 }}>First device public key</p>
            <div className="code-block">{JSON.stringify(preview.publicKey, null, 2)}</div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

