import fsp from "fs/promises";
import { dbPath } from "../config/runtime.js";

async function readDb() {
  const raw = await fsp.readFile(dbPath, "utf8");
  return JSON.parse(raw);
}

function getCollection(db, resource) {
  const collection = db?.[resource];
  return Array.isArray(collection) ? collection : null;
}

function nextId(items) {
  const ids = items
    .map((item) => Number(item?.id))
    .filter((value) => Number.isFinite(value));

  return String(ids.length > 0 ? Math.max(...ids) + 1 : 1);
}

async function writeDb(db) {
  await fsp.writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

export async function readCollection(resource) {
  const db = await readDb();
  return getCollection(db, resource);
}

export async function createCollectionEntry(resource, payload) {
  const db = await readDb();
  const items = getCollection(db, resource);

  if (!items) {
    return null;
  }

  const entry = {
    ...payload,
    id: nextId(items),
  };

  items.push(entry);
  await writeDb(db);

  return entry;
}
