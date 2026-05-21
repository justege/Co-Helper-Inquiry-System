import "dotenv/config";
import express from "express";
import cors from "cors";
import usersRouter from "./routes/users.js";
import categoriesRouter from "./routes/categories.js";

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

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
