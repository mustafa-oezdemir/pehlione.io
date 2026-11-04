import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dbPath } from "../config/runtime.js";
import { isContentResource, validateContentPayload } from "../validation/contentSchemas.js";

let writeQueue = Promise.resolve();

async function readDb() {
  return JSON.parse(await fsp.readFile(dbPath, "utf8"));
}

function getCollection(db, resource) {
  const collection = isContentResource(resource) ? db?.[resource] : null;
  return Array.isArray(collection) ? collection : null;
}

function nextId(items) {
  const ids = items.map((item) => Number(item?.id)).filter(Number.isSafeInteger);
  return String(ids.length ? Math.max(...ids) + 1 : 1);
}

async function writeDb(db) {
  const temporary = path.join(path.dirname(dbPath), `.db-${randomUUID()}.tmp`);
  try {
    await fsp.writeFile(temporary, `${JSON.stringify(db, null, 2)}\n`, "utf8");
    await fsp.rename(temporary, dbPath);
  } finally {
    await fsp.rm(temporary, { force: true });
  }
}

function mutate(action) {
  const operation = writeQueue.then(async () => {
    const db = await readDb();
    const result = action(db);
    if (result?.changed) await writeDb(db);
    return result;
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

export async function readCollection(resource) {
  if (!isContentResource(resource)) return null;
  return getCollection(await readDb(), resource);
}

export async function readCollectionEntry(resource, id) {
  const items = await readCollection(resource);
  if (!items) return null;
  return items.find((item) => String(item.id) === id) || undefined;
}

export function createCollectionEntry(resource, payload) {
  return mutate((db) => {
    const items = getCollection(db, resource);
    if (!items) return null;
    const item = { ...payload, id: nextId(items) };
    items.push(item);
    return { changed: true, item };
  });
}

export function updateCollectionEntry(resource, id, payload) {
  return mutate((db) => {
    const items = getCollection(db, resource);
    if (!items) return null;
    const index = items.findIndex((item) => String(item.id) === id);
    if (index < 0) return { missing: true };
    const item = { ...payload, id };
    items[index] = item;
    return { changed: true, item };
  });
}

export function patchCollectionEntry(resource, id, payload) {
  return mutate((db) => {
    const items = getCollection(db, resource);
    if (!items) return null;
    const index = items.findIndex((item) => String(item.id) === id);
    if (index < 0) return { missing: true };
    const fields = { ...items[index] };
    delete fields.id;
    const validation = validateContentPayload(resource, { ...fields, ...payload });
    if (validation.error) return { validation };
    const item = { ...validation.value, id };
    items[index] = item;
    return { changed: true, item };
  });
}

export function deleteCollectionEntry(resource, id) {
  return mutate((db) => {
    const items = getCollection(db, resource);
    if (!items) return null;
    const index = items.findIndex((item) => String(item.id) === id);
    if (index < 0) return { missing: true };
    const [item] = items.splice(index, 1);
    return { changed: true, item };
  });
}
