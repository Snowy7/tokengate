import { defineConfig } from "@tokengate/env";

export default defineConfig({
  schema: {
    DATABASE_URL: { type: "url", required: true, sensitive: true, description: "PostgreSQL connection string" },
    API_KEY: { type: "string", required: true, sensitive: true, description: "API authentication key" },
    PORT: { type: "port", default: 3000, description: "Server port" },
    DEBUG: { type: "boolean", default: false, description: "Enable debug mode" },
    APP_NAME: { type: "string", required: true, description: "Application name" },
    ALLOWED_ORIGINS: { type: "string[]", separator: ",", description: "CORS allowed origins" },
    LOG_LEVEL: { type: "enum", values: ["debug", "info", "warn", "error"], default: "info", description: "Logging level" },
  },
});
