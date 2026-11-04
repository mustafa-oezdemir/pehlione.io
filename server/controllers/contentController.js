import {
  createCollectionEntry,
  deleteCollectionEntry,
  patchCollectionEntry,
  readCollection,
  readCollectionEntry,
  updateCollectionEntry,
} from "../services/dbService.js";
import { isContentResource, validateContentPayload } from "../validation/contentSchemas.js";

const validId = (id) => /^[1-9]\d*$/.test(id);
const failure = (res, error) => {
  console.error("Content storage error:", error);
  return res.status(500).json({ ok: false, error: "Content storage failed" });
};
const missing = (res) => res.status(404).json({ ok: false, error: "Content not found" });

export async function listContent(req, res) {
  try {
    const items = await readCollection(req.params.resource);
    return items ? res.json(items) : missing(res);
  } catch (error) { return failure(res, error); }
}

export async function getContent(req, res) {
  if (!isContentResource(req.params.resource) || !validId(req.params.id)) return missing(res);
  try {
    const item = await readCollectionEntry(req.params.resource, req.params.id);
    return item ? res.json(item) : missing(res);
  } catch (error) { return failure(res, error); }
}

export async function createContent(req, res) {
  const validation = validateContentPayload(req.params.resource, req.body);
  if (validation.error) return res.status(validation.status).json({ ok: false, error: validation.error });
  try {
    const result = await createCollectionEntry(req.params.resource, validation.value);
    return result ? res.status(201).json({ ok: true, item: result.item }) : missing(res);
  } catch (error) { return failure(res, error); }
}

export async function updateContent(req, res) {
  if (!isContentResource(req.params.resource) || !validId(req.params.id)) return missing(res);
  const partial = req.method === "PATCH";
  const validation = validateContentPayload(req.params.resource, req.body, { partial });
  if (validation.error) return res.status(validation.status).json({ ok: false, error: validation.error });
  try {
    const result = partial
      ? await patchCollectionEntry(req.params.resource, req.params.id, validation.value)
      : await updateCollectionEntry(req.params.resource, req.params.id, validation.value);
    if (result?.validation) return res.status(result.validation.status).json({ ok: false, error: result.validation.error });
    return result?.item ? res.json({ ok: true, item: result.item }) : missing(res);
  } catch (error) { return failure(res, error); }
}

export async function deleteContent(req, res) {
  if (!isContentResource(req.params.resource) || !validId(req.params.id)) return missing(res);
  try {
    const result = await deleteCollectionEntry(req.params.resource, req.params.id);
    return result?.item ? res.json({ ok: true, item: result.item }) : missing(res);
  } catch (error) { return failure(res, error); }
}
