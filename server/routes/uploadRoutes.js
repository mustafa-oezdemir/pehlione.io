import { Router } from "express";
import { uploadImage } from "../controllers/uploadController.js";
import { requireAdminJwt } from "../middleware/requireAdminJwt.js";
import { upload } from "../services/uploadService.js";

const router = Router();

router.post("/", requireAdminJwt, (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error) return res.status(400).json({ ok: false, error: "Invalid upload" });
    next();
  });
}, uploadImage);

export default router;
