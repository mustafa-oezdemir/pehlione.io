import { Router } from "express";
import { requireAdminJwt } from "../middleware/requireAdminJwt.js";
import {
  createBlogPost, deleteBlogPost, listBlogPosts, readBlogPost,
  updateBlogPost, validateBlogPost,
} from "../services/blogService.js";

const router = Router();
const localOnly = (req, res, next) => {
  const address = req.socket.remoteAddress || "";
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address)) {
    return res.status(403).json({ ok: false, error: "Local access only" });
  }
  next();
};
const errorResponse = (res, error) => {
  console.error("Blog storage error:", error);
  return res.status(500).json({ ok: false, error: "Blog storage failed" });
};

router.get("/", async (_req, res) => {
  try { return res.json(await listBlogPosts()); }
  catch (error) { return errorResponse(res, error); }
});
router.get("/:slug", async (req, res) => {
  try {
    const post = await readBlogPost(req.params.slug);
    return post ? res.json(post) : res.status(404).json({ ok: false, error: "Blog post not found" });
  } catch (error) { return errorResponse(res, error); }
});

router.post("/", requireAdminJwt, localOnly, async (req, res) => {
  const validation = validateBlogPost(req.body);
  if (validation.error) return res.status(400).json({ ok: false, error: validation.error });
  try { return res.status(201).json({ ok: true, post: await createBlogPost(validation.value) }); }
  catch (error) { return errorResponse(res, error); }
});
router.put("/:slug", requireAdminJwt, localOnly, async (req, res) => {
  const validation = validateBlogPost(req.body);
  if (validation.error) return res.status(400).json({ ok: false, error: validation.error });
  try {
    const post = await updateBlogPost(req.params.slug, validation.value);
    return post ? res.json({ ok: true, post }) : res.status(404).json({ ok: false, error: "Blog post not found" });
  } catch (error) { return errorResponse(res, error); }
});
router.delete("/:slug", requireAdminJwt, localOnly, async (req, res) => {
  try {
    const deleted = await deleteBlogPost(req.params.slug);
    return deleted ? res.json({ ok: true }) : res.status(404).json({ ok: false, error: "Blog post not found" });
  } catch (error) { return errorResponse(res, error); }
});

export default router;
