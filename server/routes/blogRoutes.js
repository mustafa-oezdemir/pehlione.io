import { Router } from "express";
import { requireAdminJwt } from "../middleware/requireAdminJwt.js";
import { createBlogPost, validateBlogPost } from "../services/blogService.js";

const router = Router();

router.post("/", requireAdminJwt, async (req, res) => {
  const address = req.socket.remoteAddress || "";
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address)) {
    return res.status(403).json({ ok: false, error: "Local access only" });
  }

  const validation = validateBlogPost(req.body);
  if (validation.error) {
    return res.status(400).json({ ok: false, error: validation.error });
  }

  try {
    const post = await createBlogPost(validation.value);
    return res.status(201).json({ ok: true, post });
  } catch (error) {
    console.error("Blog write error:", error);
    return res.status(500).json({ ok: false, error: "Failed to save blog post" });
  }
});

export default router;
