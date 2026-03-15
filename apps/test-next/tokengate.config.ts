import { defineConfig } from "@tokengate/env";

export default defineConfig({
  schema: {
    DATABASE_URL: { type: "url", required: true, sensitive: true, description: "Database connection" },
    API_KEY: { type: "string", required: true, sensitive: true, description: "API key" },
    PORT: { type: "port", default: 3000 },
    DEBUG: { type: "boolean", default: false },
    APP_NAME: { type: "string", default: "TestNext" },
    LOG_LEVEL: { type: "enum", values: ["debug", "info", "warn", "error"], default: "info" },
  },
});
