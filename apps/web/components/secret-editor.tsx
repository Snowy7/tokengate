"use client";

import { useState, useTransition } from "react";
import { decryptRevisionPayload, encryptRevisionPayload } from "@tokengate/crypto";
import { normalizeEnvDocument } from "@tokengate/env-format";

export function SecretEditor() {
  const [workspaceKey, setWorkspaceKey] = useState("");
  const [content, setContent] = useState("API_URL=https://api.tokengate.dev\nTOKEN=replace-me\n");
  const [encrypted, setEncrypted] = useState("");
  const [decrypted, setDecrypted] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleEncrypt = () => {
    startTransition(async () => {
      const normalized = normalizeEnvDocument(content);
      const payload = await encryptRevisionPayload(normalized, workspaceKey);
      setEncrypted(JSON.stringify(payload, null, 2));
      setDecrypted("");
    });
  };

  const handleDecrypt = () => {
    startTransition(async () => {
      const payload = JSON.parse(encrypted) as {
        ciphertext: string;
        wrappedDataKey: string;
        contentHash: string;
      };
      const normalized = await decryptRevisionPayload(payload, workspaceKey);
      setDecrypted(normalized);
    });
  };

  return (
    <section className="panel" style={{ padding: 24, display: "grid", gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 28 }}>Encrypt a revision locally</h2>
        <p className="muted" style={{ lineHeight: 1.6 }}>
          This uses the same shared package as the CLI. Convex stores only the payload and wrapped data key.
        </p>
      </div>

      <label className="field">
        <span>Workspace key</span>
        <input
          value={workspaceKey}
          onChange={(event) => setWorkspaceKey(event.target.value)}
          placeholder="Paste a generated workspace key"
        />
      </label>

      <label className="field">
        <span>Env document</span>
        <textarea
          rows={9}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          spellCheck={false}
        />
      </label>

      <div style={{ display: "flex", gap: 12 }}>
        <button className="button" onClick={handleEncrypt} disabled={!workspaceKey || isPending}>
          Encrypt
        </button>
        <button className="button secondary" onClick={handleDecrypt} disabled={!workspaceKey || !encrypted || isPending}>
          Decrypt preview
        </button>
      </div>

      {encrypted ? (
        <div>
          <p style={{ marginBottom: 8, fontWeight: 700 }}>Encrypted revision payload</p>
          <div className="code-block">{encrypted}</div>
        </div>
      ) : null}

      {decrypted ? (
        <div>
          <p style={{ marginBottom: 8, fontWeight: 700 }}>Decrypted env</p>
          <div className="code-block">{decrypted}</div>
        </div>
      ) : null}
    </section>
  );
}

