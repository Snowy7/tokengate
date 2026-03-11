import type { AuthConfig } from "convex/server";

const issuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;
const applicationID = process.env.CLERK_JWT_AUDIENCE ?? "convex";

if (!issuerDomain) {
  console.warn("CLERK_JWT_ISSUER_DOMAIN is not configured. Convex auth will fail until it is set.");
}

export default {
  providers: issuerDomain
    ? [
        {
          domain: issuerDomain,
          applicationID
        }
      ]
    : []
} satisfies AuthConfig;

