import fsp from "node:fs/promises";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { publicDir, runtimeConfig } from "../config/runtime.js";

const formats = {
  jpeg: { extensions: [".jpg", ".jpeg"], mime: "image/jpeg", ext: ".jpg" },
  png: { extensions: [".png"], mime: "image/png", ext: ".png" },
  webp: { extensions: [".webp"], mime: "image/webp", ext: ".webp" },
};
const categories = new Set(["foto", "garten", "certificates"]);

export class UploadValidationError extends Error {}

export function resolveCategoryDir(category) {
  if (!categories.has(category)) throw new UploadValidationError("Invalid category");
  return { cat: category, dir: path.join(publicDir, category) };
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1, fields: 5, fieldSize: 1024 },
});

function hasSignature(buffer, format) {
  if (format === "jpeg") return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (format === "png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (format === "webp") return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
}

export async function saveUploadedImage(file, category, name) {
  const { cat, dir } = resolveCategoryDir(category);
  if (!file?.buffer?.length || typeof name !== "string" || name.length > 100) {
    throw new UploadValidationError("Invalid upload");
  }
  const originalExt = path.extname(file.originalname).toLowerCase();
  const format = Object.keys(formats).find((key) =>
    formats[key].extensions.includes(originalExt) && formats[key].mime === file.mimetype
  );
  if (!format || !hasSignature(file.buffer, format)) {
    throw new UploadValidationError("Only valid JPEG, PNG and WebP images are allowed");
  }
  let metadata;
  try {
    metadata = await sharp(file.buffer, { failOn: "error", limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new UploadValidationError("Invalid image data");
  }
  if (metadata.format !== format || !metadata.width || !metadata.height || metadata.pages > 1) {
    throw new UploadValidationError("Invalid image data");
  }
  const safeName = name.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "image";
  const filename = `${safeName}-${randomUUID()}${formats[format].ext}`;
  const filePath = path.join(dir, filename);
  const thumbPath = path.join(dir, "thumbs", `${path.parse(filename).name}.webp`);
  const isPhoto = cat === "foto" || cat === "garten";
  let savedSize;
  let savedOriginal = false;
  let savedThumb = false;
  try {
    const image = sharp(file.buffer, { failOn: "error", limitInputPixels: 40_000_000 })
      .rotate().resize({ width: runtimeConfig.imageMaxWidth, withoutEnlargement: true });
    const output = format === "jpeg"
      ? await image.jpeg({ quality: runtimeConfig.imageJpegQuality }).toBuffer()
      : format === "png"
        ? await image.png({ compressionLevel: 9 }).toBuffer()
        : await image.webp({ quality: runtimeConfig.thumbQuality }).toBuffer();
    savedSize = output.length;
    await fsp.mkdir(dir, { recursive: true });
    if (isPhoto) {
      await fsp.mkdir(path.dirname(thumbPath), { recursive: true });
      const thumbnail = await sharp(output).resize({ width: runtimeConfig.thumbWidth, withoutEnlargement: true })
        .webp({ quality: runtimeConfig.thumbQuality }).toBuffer();
      const thumbHandle = await fsp.open(thumbPath, "wx");
      savedThumb = true;
      try { await thumbHandle.writeFile(thumbnail); } finally { await thumbHandle.close(); }
    }
    const originalHandle = await fsp.open(filePath, "wx");
    savedOriginal = true;
    try { await originalHandle.writeFile(output); } finally { await originalHandle.close(); }
  } catch (error) {
    await Promise.allSettled([
      savedOriginal ? fsp.rm(filePath, { force: true }) : Promise.resolve(),
      savedThumb ? fsp.rm(thumbPath, { force: true }) : Promise.resolve(),
    ]);
    throw error;
  }
  return { filename, src: `/${cat}/${filename}`, category: cat, size: savedSize };
}
