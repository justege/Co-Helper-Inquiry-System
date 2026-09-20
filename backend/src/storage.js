import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_UPLOAD_DIR = path.join(__dirname, "../uploads");

const BUCKETS = ["inquiry-documents", "partner-documents", "todo-attachments", "project-attachments"];

function spacesConfigured() {
  return Boolean(
    process.env.DO_SPACES_KEY &&
    process.env.DO_SPACES_SECRET &&
    process.env.DO_SPACES_ENDPOINT &&
    process.env.DO_SPACES_BUCKET
  );
}

function spacesClient() {
  return new S3Client({
    region: process.env.DO_SPACES_REGION || "fra1",
    endpoint: process.env.DO_SPACES_ENDPOINT,
    forcePathStyle: false,
    credentials: {
      accessKeyId: process.env.DO_SPACES_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET,
    },
  });
}

function spacesKey(bucket, filePath) {
  return `${bucket}/${filePath}`.replace(/\/+/g, "/");
}

function publicApiBase() {
  return (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 8000}`).replace(/\/$/, "");
}

function storageSecret() {
  return process.env.STORAGE_SECRET || process.env.DATABASE_URL || "dev-storage-secret";
}

function signLocal(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", storageSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyLocalToken(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", storageSecret()).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function ensureStorageBuckets() {
  if (spacesConfigured()) {
    console.log("[storage] DigitalOcean Spaces configured");
    return;
  }
  for (const bucket of BUCKETS) {
    fs.mkdirSync(path.join(LOCAL_UPLOAD_DIR, bucket), { recursive: true });
  }
  console.log("[storage] Using local disk uploads at", LOCAL_UPLOAD_DIR);
}

export async function createSignedUploadUrl(bucket, filePath, { contentType } = {}) {
  if (spacesConfigured()) {
    const client = spacesClient();
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: spacesKey(bucket, filePath),
        ...(contentType ? { ContentType: contentType } : {}),
      }),
      { expiresIn: 600 }
    );
    return { data: { signedUrl: url }, error: null };
  }

  const token = signLocal({ op: "put", bucket, filePath, exp: Date.now() + 10 * 60 * 1000 });
  return {
    data: { signedUrl: `${publicApiBase()}/api/storage/upload?token=${encodeURIComponent(token)}` },
    error: null,
  };
}

export async function createSignedDownloadUrl(bucket, filePath, expiresIn = 3600) {
  if (spacesConfigured()) {
    const client = spacesClient();
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: spacesKey(bucket, filePath),
      }),
      { expiresIn }
    );
    return { data: { signedUrl: url }, error: null };
  }

  const token = signLocal({ op: "get", bucket, filePath, exp: Date.now() + expiresIn * 1000 });
  return {
    data: { signedUrl: `${publicApiBase()}/api/storage/download?token=${encodeURIComponent(token)}` },
    error: null,
  };
}

export async function removeObject(bucket, filePath) {
  if (spacesConfigured()) {
    const client = spacesClient();
    await client.send(new DeleteObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: spacesKey(bucket, filePath),
    }));
    return;
  }
  const dest = path.join(LOCAL_UPLOAD_DIR, bucket, filePath);
  await fs.promises.unlink(dest).catch(() => null);
}

export function localFilePath(bucket, filePath) {
  return path.join(LOCAL_UPLOAD_DIR, bucket, filePath);
}

export { BUCKETS };
