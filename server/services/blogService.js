import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { rootDir } from "../config/runtime.js";

const blogDir = path.join(rootDir, "content", "blog");

function validText(value, max, multiline = false) {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= max &&
    !value.includes("\0") &&
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

  return {
    value: {
      title: payload.title.trim(),
      summary: payload.summary.trim(),
      body: payload.body.trim(),
    },
  };
}

function slugify(title) {
  return title.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 70).replace(/-$/g, "") || "beitrag";
}

export async function createBlogPost({ title, summary, body }) {
  await mkdir(blogDir, { recursive: true });
  const baseSlug = slugify(title);
  const date = new Date().toISOString();
  const markdown = `---\ntitle: ${JSON.stringify(title)}\nsummary: ${JSON.stringify(summary)}\ndate: ${JSON.stringify(date)}\n---\n\n${body}\n`;

  for (let index = 1; index <= 100; index += 1) {
    const slug = index === 1 ? baseSlug : `${baseSlug}-${index}`;
    try {
      await writeFile(path.join(blogDir, `${slug}.md`), markdown, { flag: "wx", encoding: "utf8" });
      return { slug, title, summary, date };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }

  throw new Error("Too many posts with the same title");
}
