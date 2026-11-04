import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { rootDir } from "../config/runtime.js";

const blogDir = path.join(rootDir, "content", "blog");
const safeSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
let writeQueue = Promise.resolve();

function validText(value, max, multiline = false) {
  return typeof value === "string" && value.trim().length > 0 &&
    value.length <= max && !value.includes("\0") &&
    (multiline || !/[\r\n]/.test(value));
}

export function validateBlogPost(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      Object.keys(payload).some((key) => !["title", "summary", "body"].includes(key))) {
    return { error: "Invalid blog post" };
  }
  if (!validText(payload.title, 120)) return { error: "Invalid title" };
  if (!validText(payload.summary, 300)) return { error: "Invalid summary" };
  if (!validText(payload.body, 50_000, true)) return { error: "Invalid body" };
  return { value: { title: payload.title.trim(), summary: payload.summary.trim(), body: payload.body.trim() } };
}

function slugify(title) {
  return title.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 70).replace(/-$/g, "") || "beitrag";
}

function markdownFor({ title, summary, body, date }) {
  return `---\ntitle: ${JSON.stringify(title)}\nsummary: ${JSON.stringify(summary)}\ndate: ${JSON.stringify(date)}\n---\n\n${body}\n`;
}

function parsePost(slug, source) {
  const match = /^---\r?\ntitle: (".*")\r?\nsummary: (".*")\r?\ndate: (".*")\r?\n---\r?\n([\s\S]*)$/.exec(source);
  if (!match) return null;
  try {
    const [title, summary, date] = match.slice(1, 4).map(JSON.parse);
    if (!validText(title, 120) || !validText(summary, 300) ||
        typeof date !== "string" || Number.isNaN(Date.parse(date))) return null;
    return { slug, title, summary, date, body: match[4].trim() };
  } catch { return null; }
}

export async function readBlogPost(slug) {
  if (!safeSlug.test(slug)) return null;
  try {
    return parsePost(slug, await readFile(path.join(blogDir, `${slug}.md`), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function listBlogPosts() {
  let files;
  try { files = await readdir(blogDir); }
  catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const posts = await Promise.all(files.filter((file) => file.endsWith(".md"))
    .map((file) => readBlogPost(file.slice(0, -3))));
  return posts.filter(Boolean).sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug));
}

export async function createBlogPost({ title, summary, body }) {
  await mkdir(blogDir, { recursive: true });
  const baseSlug = slugify(title);
  const date = new Date().toISOString();
  for (let index = 1; index <= 100; index += 1) {
    const slug = index === 1 ? baseSlug : `${baseSlug}-${index}`;
    try {
      await writeFile(path.join(blogDir, `${slug}.md`), markdownFor({ title, summary, body, date }),
        { flag: "wx", encoding: "utf8" });
      return { slug, title, summary, body, date };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }
  throw new Error("Too many posts with the same title");
}

function mutate(action) {
  const operation = writeQueue.then(action);
  writeQueue = operation.catch(() => {});
  return operation;
}

export function updateBlogPost(slug, payload) {
  if (!safeSlug.test(slug)) return Promise.resolve(null);
  return mutate(async () => {
    const current = await readBlogPost(slug);
    if (!current) return null;
    const post = { ...payload, slug, date: current.date };
    const temporary = path.join(blogDir, `.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, markdownFor(post), { flag: "wx", encoding: "utf8" });
      await rename(temporary, path.join(blogDir, `${slug}.md`));
    } finally { await rm(temporary, { force: true }); }
    return post;
  });
}

export function deleteBlogPost(slug) {
  if (!safeSlug.test(slug)) return Promise.resolve(false);
  return mutate(async () => {
    try {
      await rm(path.join(blogDir, `${slug}.md`));
      return true;
    } catch (error) {
      if (error?.code === "ENOENT") return false;
      throw error;
    }
  });
}
