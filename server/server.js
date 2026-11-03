import { createApp } from "./app.js";
import { runtimeConfig } from "./config/runtime.js";
import { isAuthConfigured } from "./services/authService.js";

const app = createApp();

app.listen(runtimeConfig.port, runtimeConfig.host, () => {
  console.log(`Content server ${runtimeConfig.host}:${runtimeConfig.port} portunda calisiyor`);

  if (!isAuthConfigured()) {
    console.warn(
      "Admin auth is not configured: define ADMIN_USERNAME, ADMIN_PASSWORD and JWT_SECRET in .env."
    );
  }
});
