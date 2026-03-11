"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

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

    const search = new URLSearchParams();
    search.set("callback", callbackUrl);
    search.set("state", state);
    search.set("device_name", deviceName ?? "tokengate-cli");
    search.set("public_key", params.get("public_key") ?? "");
    return `/api/cli/device-flow/approve?${search.toString()}`;
  }, [callbackUrl, deviceName, params, state]);

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
          Approving this device registers its public key in Convex and returns a Clerk-issued Convex token back to the
          CLI callback.
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
