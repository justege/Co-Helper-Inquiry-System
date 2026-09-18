import { Router } from "express";
import fs from "fs";
import path from "path";
import { verifyLocalToken, localFilePath, BUCKETS } from "../storage.js";

const router = Router();
const ALLOWED = new Set(BUCKETS);

router.put("/upload", async (req, res) => {
  const payload = verifyLocalToken(req.query.token);
  if (!payload || payload.op !== "put") return res.status(403).json({ error: "Invalid upload token" });
  if (!ALLOWED.has(payload.bucket)) return res.status(400).json({ error: "Unknown bucket" });

  const dest = localFilePath(payload.bucket, payload.filePath);
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  let buffer;
  if (Buffer.isBuffer(req.body)) {
    buffer = req.body;
  } else if (req.body) {
    buffer = Buffer.from(req.body);
  } else {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    buffer = Buffer.concat(chunks);
  }
  await fs.promises.writeFile(dest, buffer);
  res.status(200).json({ ok: true });
});

router.get("/download", async (req, res) => {
  const payload = verifyLocalToken(req.query.token);
  if (!payload || payload.op !== "get") return res.status(403).json({ error: "Invalid download token" });
  if (!ALLOWED.has(payload.bucket)) return res.status(400).json({ error: "Unknown bucket" });
  const dest = localFilePath(payload.bucket, payload.filePath);
  if (!fs.existsSync(dest)) return res.status(404).json({ error: "File not found" });
  res.sendFile(dest);
});

export default router;
