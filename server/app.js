import cors from "cors";
import express from "express";
import { runtimeConfig } from "./config/runtime.js";
import authRoutes from "./routes/authRoutes.js";
import contentRoutes from "./routes/contentRoutes.js";
import githubRoutes from "./routes/githubRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", runtimeConfig.trustProxyHops);

  app.use(
    cors({
      origin: runtimeConfig.clientOrigin,
      methods: ["GET", "POST"],
      allowedHeaders: ["Authorization", "Content-Type"],
      exposedHeaders: ["X-Repo-Cache", "X-Repo-Source", "X-Repo-Warning"],
    })
  );

  app.use(express.json({ limit: "1mb" }));

  app.use("/auth", authRoutes);
  app.use("/api/github", githubRoutes);
  app.use("/api", contentRoutes);
  app.use("/upload", uploadRoutes);

  return app;
}
