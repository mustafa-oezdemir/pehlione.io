import path from "node:path";
import { saveUploadedImage, UploadValidationError } from "../services/uploadService.js";

export async function uploadImage(req, res) {
  if (!req.file) return res.status(400).json({ ok: false, error: "No file received" });
  try {
    const saved = await saveUploadedImage(req.file, req.body.category, req.body.name);
    return res.json({
      ok: true,
      file: { filename: saved.filename, size: saved.size },
      src: saved.src,
      category: saved.category,
      nameNormalized: path.parse(saved.filename).name,
    });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    console.error("Upload failed:", error);
    return res.status(500).json({ ok: false, error: "Upload failed" });
  }
}
