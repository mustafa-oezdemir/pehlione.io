import { Router } from "express";
import {
  createContent,
  deleteContent,
  getContent,
  listContent,
  updateContent,
} from "../controllers/contentController.js";
import { requireAdminJwt } from "../middleware/requireAdminJwt.js";

const router = Router();

router.get("/:resource", listContent);
router.get("/:resource/:id", getContent);
router.post("/:resource", requireAdminJwt, createContent);
router.put("/:resource/:id", requireAdminJwt, updateContent);
router.patch("/:resource/:id", requireAdminJwt, updateContent);
router.delete("/:resource/:id", requireAdminJwt, deleteContent);

export default router;
