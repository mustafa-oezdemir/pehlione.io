import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const rootDir = path.resolve(__dirname, "..", "..");
export const serverDir = path.join(rootDir, "server");
export const publicDir = path.join(rootDir, "public");
export const dbPath = path.join(serverDir, "db.json");

const envPath = path.join(rootDir, ".env");

try {
  process.loadEnvFile(envPath);
} catch (error) {
  if (error?.code !== "ENOENT") {
    console.warn(".env could not be loaded:", error?.message || error);
  }
}

export const runtimeConfig = {
  port: Number(process.env.PORT || 3001),
  host: process.env.API_HOST || "127.0.0.1",
  trustProxyHops: Math.min(5, Math.max(0, Number.parseInt(process.env.TRUST_PROXY_HOPS || "0", 10) || 0)),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  githubToken: process.env.IO_TOKEN || "",
  githubUsername:
    process.env.IO_USERNAME ||
    process.env.VITE_IO_USERNAME ||
    process.env.GITHUB_USER ||
    process.env.VITE_GITHUB_USER ||
    "1DeliDolu",
  adminUsername: process.env.ADMIN_USERNAME || "",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtTtlSeconds: Number(process.env.JWT_TTL_SECONDS || 900),
  imageMaxWidth: Number(process.env.UPLOAD_IMAGE_MAX_WIDTH || 1920),
  imageJpegQuality: Number(process.env.UPLOAD_IMAGE_JPEG_QUALITY || 82),
  imagePngQuality: Number(process.env.UPLOAD_IMAGE_PNG_QUALITY || 80),
  thumbWidth: Number(process.env.UPLOAD_THUMB_WIDTH || 480),
  thumbQuality: Number(process.env.UPLOAD_THUMB_QUALITY || 65),
};
