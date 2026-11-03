const photoFields = {
  src: { type: "asset", max: 250 },
  name: { type: "text", max: 100 },
  title: { type: "text", max: 200 },
  description: { type: "text", max: 2000, optional: true },
  category: { type: "text", max: 20 },
  sub_category: { type: "text", max: 100 },
};

const schemas = {
  gardenPhotos: { ...photoFields },
  fotografiePhotos: { ...photoFields },
  certificates: {
    name: { type: "text", max: 200 },
    issuer: { type: "text", max: 200, optional: true },
    img: { type: "asset", max: 250 },
  },
  projects: {
    name: { type: "text", max: 200 },
    description: { type: "text", max: 2000, optional: true },
    demoUrl: { type: "url", max: 500, optional: true },
    repoUrl: { type: "url", max: 500, optional: true },
  },
  schwerpunkte: { text: { type: "text", max: 500 } },
};

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateContentPayload(resource, payload) {
  const schema = schemas[resource];
  if (!schema) return { status: 404, error: "Unknown resource" };
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { status: 400, error: "Invalid payload" };
  }
  if (Object.keys(payload).some((key) => !Object.hasOwn(schema, key))) {
    return { status: 400, error: "Unexpected field" };
  }
  const value = {};
  for (const [key, rule] of Object.entries(schema)) {
    const input = payload[key];
    if (input === undefined || input === "") {
      if (rule.optional) continue;
      return { status: 400, error: `Invalid ${key}` };
    }
    if (typeof input !== "string" || input.length > rule.max || input.includes("\0")) {
      return { status: 400, error: `Invalid ${key}` };
    }
    const normalized = input.trim();
    if (!normalized && !rule.optional) return { status: 400, error: `Invalid ${key}` };
    if (rule.type === "url" && !isValidUrl(normalized)) return { status: 400, error: `Invalid ${key}` };
    if (rule.type === "asset") {
      const prefix = resource === "certificates" ? "/certificates/" : resource === "gardenPhotos" ? "/garten/" : "/foto/";
      if (!normalized.startsWith(prefix) || !/^\/[a-z]+\/[a-zA-Z0-9_-]+(?:-[a-f0-9-]{36})?\.(?:jpe?g|png|webp)$/i.test(normalized)) {
        return { status: 400, error: `Invalid ${key}` };
      }
    }
    value[key] = normalized;
  }
  if (resource === "gardenPhotos" && value.category !== "garten") return { status: 400, error: "Invalid category" };
  if (resource === "fotografiePhotos" && value.category !== "foto") return { status: 400, error: "Invalid category" };
  return { value };
}
