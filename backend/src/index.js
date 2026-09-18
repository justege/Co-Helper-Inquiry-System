import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import usersRouter from "./routes/users.js";
import categoriesRouter from "./routes/categories.js";
import inquiriesRouter from "./routes/inquiries.js";
import projectOffersRouter from "./routes/project-offers.js";
import adminRouter from "./routes/admin.js";
import teamRouter from "./routes/team.js";
import partnerServicesRouter from "./routes/partner-services.js";
import publicRouter from "./routes/public.js";
import expertProfileRouter from "./routes/expert-profile.js";
import workspaceRouter from "./routes/workspace.js";
import jobRouter from "./routes/job.js";
import aiRouter from "./routes/ai.js";
import trelloRouter from "./routes/trello.js";
import storageRouter from "./routes/storage.js";
import { ensureStorageBuckets } from "./storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";

const app = express();
const PORT = process.env.PORT ?? 8000;

const PRODUCTION_APP_ORIGIN = "https://co-helper-inquiry-system-production.up.railway.app";

// ── Middleware ─────────────────────────────────────────────────────────────────
const allowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:5173,http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
);

allowedOrigins.add(PRODUCTION_APP_ORIGIN);

if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  allowedOrigins.add(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.put(
  "/api/storage/upload",
  express.raw({ type: "*/*", limit: "50mb" }),
  (req, res, next) => {
    req.url = "/upload";
    storageRouter(req, res, next);
  }
);
app.use(express.json({ limit: "2mb" }));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api/users", usersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/inquiries", jobRouter);
app.use("/api/inquiries", inquiriesRouter);
app.use("/api/project-offers", projectOffersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/team", teamRouter);
app.use("/api/partner-services", partnerServicesRouter);
app.use("/api/expert-profile", expertProfileRouter);
app.use("/api/workspace", workspaceRouter);
app.use("/api/ai", aiRouter);
app.use("/api/trello", trelloRouter);
app.use("/api/storage", storageRouter);
app.use("/api/public", publicRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Frontend (production) ───────────────────────────────────────────────────────
if (isProduction) {
  const distPath = path.join(__dirname, "../../frontend/dist");
  app.use(express.static(distPath, { index: false }));
  app.get(/^(?!\/api\/|\/health).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ── Start ──────────────────────────────────────────────────────────────────────
ensureStorageBuckets().finally(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
