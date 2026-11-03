const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const attempts = new Map();

function keyFor(req) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function checkLoginRateLimit(req, res, next) {
  const key = keyFor(req);
  const now = Date.now();
  const entry = attempts.get(key);
  if (entry && now - entry.startedAt >= WINDOW_MS) attempts.delete(key);
  const current = attempts.get(key);
  if (current?.count >= MAX_FAILURES) {
    const retrySeconds = Math.ceil((WINDOW_MS - (now - current.startedAt)) / 1000);
    res.set("Retry-After", String(retrySeconds));
    return res.status(429).json({ ok: false, error: "Too many login attempts" });
  }
  next();
}

export function recordLoginFailure(req) {
  const key = keyFor(req);
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    attempts.set(key, { count: 1, startedAt: now });
  } else {
    entry.count += 1;
  }
  if (attempts.size > 10_000) {
    for (const [ip, value] of attempts) {
      if (now - value.startedAt >= WINDOW_MS) attempts.delete(ip);
    }
    if (attempts.size > 10_000) attempts.delete(attempts.keys().next().value);
  }
  console.warn(`Failed admin login from ${key}`);
}

export function clearLoginFailures(req) {
  attempts.delete(keyFor(req));
}
