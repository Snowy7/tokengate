import { defineConfig } from "vite";
import { tokengate } from "@tokengate/env-vite";

export default defineConfig({
  plugins: [
    tokengate({
      schema: {
        VITE_APP_NAME: { type: "string", default: "TestVite" },
        VITE_API_URL: { type: "url", required: true },
        VITE_DEBUG: { type: "boolean", default: false },
        DATABASE_URL: { type: "url", required: true, sensitive: true },
        API_KEY: { type: "string", required: true, sensitive: true },
        PORT: { type: "port", default: 3000 },
      },
    }),
  ],
});
