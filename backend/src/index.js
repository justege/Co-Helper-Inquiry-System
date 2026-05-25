import "dotenv/config";
import express from "express";
import cors from "cors";
import usersRouter from "./routes/users.js";
import categoriesRouter from "./routes/categories.js";
import inquiriesRouter from "./routes/inquiries.js";
import projectOffersRouter from "./routes/project-offers.js";
import adminRouter from "./routes/admin.js";
import teamRouter from "./routes/team.js";
import partnerServicesRouter from "./routes/partner-services.js";
import expertProfileRouter from "./routes/expert-profile.js";
import { ensureStorageBuckets } from "./storage.js";

const app = express();
const PORT = process.env.PORT ?? 8000;

// ── Middleware ─────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api/users", usersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/inquiries", inquiriesRouter);
app.use("/api/project-offers", projectOffersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/team", teamRouter);
app.use("/api/partner-services", partnerServicesRouter);
app.use("/api/expert-profile", expertProfileRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Start ──────────────────────────────────────────────────────────────────────
ensureStorageBuckets().finally(() => {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
});
