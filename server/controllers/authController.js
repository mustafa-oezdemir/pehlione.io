import { runtimeConfig } from "../config/runtime.js";
import { clearLoginFailures, recordLoginFailure } from "../middleware/loginRateLimit.js";
import {
  authConfigErrorMessage,
  createJwtToken,
  isAuthConfigured,
  validateAdminCredentials,
} from "../services/authService.js";

export function login(req, res) {
  if (!isAuthConfigured()) {
    return res.status(500).json({
      ok: false,
      error: authConfigErrorMessage,
    });
  }

  const { username, password } = req.body ?? {};

  if (!validateAdminCredentials(username, password)) {
    recordLoginFailure(req);
    return res.status(401).json({
      ok: false,
      error: "Invalid credentials",
    });
  }

  res.set("Cache-Control", "no-store");
  clearLoginFailures(req);

  return res.json({
    ok: true,
    token: createJwtToken(),
    expiresIn: runtimeConfig.jwtTtlSeconds,
  });
}
