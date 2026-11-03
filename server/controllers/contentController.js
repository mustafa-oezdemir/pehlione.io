import {
  createCollectionEntry,
  readCollection,
} from "../services/dbService.js";
import { validateContentPayload } from "../validation/contentSchemas.js";

export async function listContent(req, res) {
  try {
    const items = await readCollection(req.params.resource);

    if (!items) {
      return res.status(404).json({
        ok: false,
        error: "Unknown resource",
      });
    }

    return res.json(items);
  } catch (error) {
    console.error("DB read error:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to read data",
    });
  }
}

export async function createContent(req, res) {
  const validation = validateContentPayload(req.params.resource, req.body);
  if (validation.error) return res.status(validation.status).json({ ok: false, error: validation.error });

  try {
    const entry = await createCollectionEntry(req.params.resource, validation.value);

    if (!entry) {
      return res.status(404).json({
        ok: false,
        error: "Unknown resource",
      });
    }

    return res.status(201).json({
      ok: true,
      item: entry,
    });
  } catch (error) {
    console.error("DB write error:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to save data",
    });
  }
}
