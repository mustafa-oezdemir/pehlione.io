import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import path from "node:path";
import { after, before, test } from "node:test";
import sharp from "sharp";

process.env.ADMIN_USERNAME = "security-test-admin";
process.env.ADMIN_PASSWORD = "security-test-password";
process.env.JWT_SECRET = "security-test-secret-with-sufficient-length";

const { createApp } = await import("../app.js");
const { validateContentPayload } = await import("../validation/contentSchemas.js");
const { publicDir } = await import("../config/runtime.js");
let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

async function login(password) {
  return fetch(`${base}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "security-test-admin", password }),
  });
}

test("login, authorization and failed-attempt throttling", async () => {
  const valid = await login("security-test-password");
  assert.equal(valid.status, 200);
  const { token } = await valid.json();
  assert.equal(typeof token, "string");

  const unauthorized = await fetch(`${base}/api/projects`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  assert.equal(unauthorized.status, 401);
  const malformed = await fetch(`${base}/api/projects`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: "Test", demoUrl: "javascript:alert(1)" }),
  });
  assert.equal(malformed.status, 400);

  for (let i = 0; i < 5; i++) assert.equal((await login("wrong-password")).status, 401);
  const limited = await login("security-test-password");
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
});

test("upload rejects spoofed image bytes and extension", async () => {
  const { createJwtToken } = await import("../services/authService.js");
  const auth = createJwtToken();
  const fake = new FormData();
  fake.set("name", "unsafe");
  fake.set("category", "foto");
  fake.set("image", new Blob(["<script>alert(1)</script>"], { type: "image/png" }), "fake.png");
  const invalid = await fetch(`${base}/upload`, { method: "POST", headers: { Authorization: `Bearer ${auth}` }, body: fake });
  assert.equal(invalid.status, 400);

  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer();
  const badExtension = new FormData();
  badExtension.set("name", "unsafe");
  badExtension.set("category", "foto");
  badExtension.set("image", new Blob([png], { type: "image/png" }), "fake.php");
  const extension = await fetch(`${base}/upload`, { method: "POST", headers: { Authorization: `Bearer ${auth}` }, body: badExtension });
  assert.equal(extension.status, 400);
});

test("valid image is re-encoded and thumbnailed", async () => {
  const { createJwtToken } = await import("../services/authService.js");
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer();
  const form = new FormData();
  form.set("name", "security-test");
  form.set("category", "foto");
  form.set("image", new Blob([png], { type: "image/png" }), "test.png");
  const response = await fetch(`${base}/upload`, {
    method: "POST", headers: { Authorization: `Bearer ${createJwtToken()}` }, body: form,
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  const original = path.join(publicDir, "foto", body.file.filename);
  const thumb = path.join(publicDir, "foto", "thumbs", `${path.parse(body.file.filename).name}.webp`);
  try {
    assert.equal((await sharp(await fsp.readFile(original)).metadata()).format, "png");
    assert.equal((await sharp(await fsp.readFile(thumb)).metadata()).format, "webp");
  } finally {
    await Promise.all([fsp.rm(original, { force: true }), fsp.rm(thumb, { force: true })]);
  }
});

test("content schemas reject extra fields and unsafe URLs", () => {
  assert.equal(validateContentPayload("projects", { name: "A", id: "99" }).status, 400);
  assert.equal(validateContentPayload("projects", { name: "A", demoUrl: "javascript:alert(1)" }).status, 400);
  assert.deepEqual(validateContentPayload("projects", { name: " A ", demoUrl: "https://example.com" }).value,
    { name: "A", demoUrl: "https://example.com" });
});
