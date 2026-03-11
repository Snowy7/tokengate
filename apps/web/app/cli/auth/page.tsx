"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function CliAuthPage() {
  const params = useSearchParams();
  const [approved, setApproved] = useState(false);

  const callbackUrl = params.get("callback");
  const state = params.get("state");
  const deviceName = params.get("device_name");

  const approvalHref = useMemo(() => {
    if (!callbackUrl || !state) {
      return null;
    }

    const redirect = new URL(callbackUrl);
    redirect.searchParams.set("state", state);
    redirect.searchParams.set("token", `demo-token-${state}`);
    redirect.searchParams.set("device_id", `device_${state}`);
    return redirect.toString();
  }, [callbackUrl, state]);

  return (
    <main className="page-shell hero">
      <section className="panel" style={{ padding: 28, display: "grid", gap: 18, maxWidth: 760 }}>
        <div>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.18em", color: "#2f6f52", fontWeight: 800 }}>
            CLI authorization
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: 36 }}>Authorize {deviceName ?? "your device"}</h1>
        </div>

        <p className="muted" style={{ lineHeight: 1.6 }}>
          This page demonstrates the browser device flow shape for the Tokengate CLI. In production, the approval
          action would register the device, store the public key, and mint a device-scoped token.
        </p>

        {approvalHref ? (
          <a
            className="button"
            href={approvalHref}
            onClick={() => {
              setApproved(true);
            }}
          >
            Approve device
          </a>
        ) : (
          <p className="muted">Missing callback parameters.</p>
        )}

        {approved ? <p className="muted">Redirecting back to the CLI callback...</p> : null}
      </section>
    </main>
  );
}
