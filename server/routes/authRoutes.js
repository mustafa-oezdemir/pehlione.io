import { Router } from "express";
import { login } from "../controllers/authController.js";
import { checkLoginRateLimit } from "../middleware/loginRateLimit.js";

const router = Router();

router.post("/login", checkLoginRateLimit, login);

export default router;
