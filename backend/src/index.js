import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import usersRouter from "./routes/users.js";
import publicRouter from "./routes/public.js";
import workspaceRouter from "./routes/workspace.js";
import workRouter from "./routes/work.js";
import expensesRouter from "./routes/expenses.js";
import storageRouter from "./routes/storage.js";
import notificationsRouter from "./routes/notifications.js";
import billingRouter, { stripeWebhook } from "./routes/billing.js";
import { ensureStorageBuckets } from "./storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";

const app = express();
const PORT = Number(process.env.PORT) || 8000;

const PRODUCTION_APP_ORIGIN = "https://co-helper-inquiry-system-production.up.railway.app";

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
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), stripeWebhook);
app.use(express.json({ limit: "2mb" }));

app.use("/api/users", usersRouter);
app.use("/api/workspace", workspaceRouter);
app.use("/api/workspace", workRouter);
app.use("/api/workspace", expensesRouter);
app.use("/api/storage", storageRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/billing", billingRouter);
app.use("/api/public", publicRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

if (isProduction) {
  const distPath = path.join(__dirname, "../../frontend/dist");
  app.use(express.static(distPath, { index: false }));
  app.get(/^(?!\/api\/|\/health).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

ensureStorageBuckets().catch((err) => {
  console.error("[storage]", err);
});

export { app };

const startedAsMain = (process.argv[1] || "").endsWith("index.js");
if (startedAsMain) {
  const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
  server.on("error", (err) => {
    console.error("[listen]", err);
    process.exit(1);
  });
}
