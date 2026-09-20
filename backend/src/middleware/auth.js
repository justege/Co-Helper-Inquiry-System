import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

if (!PROJECT_ID) {
  console.error("[auth] Missing FIREBASE_PROJECT_ID (or VITE_FIREBASE_PROJECT_ID)");
} else if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}

/**
 * Express middleware that verifies the Firebase Bearer token via firebase-admin
 * and attaches `req.uid` and `req.firebaseUser` (the decoded token) to the request.
 */
export async function requireAuth(req, res, next) {
  if (!PROJECT_ID) {
    return res.status(503).json({ error: "Auth is not configured" });
  }
  const header = req.headers.authorization ?? "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }
  const token = header.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.uid = decoded.uid;
    req.firebaseUser = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
