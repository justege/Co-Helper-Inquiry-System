import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

if (!PROJECT_ID) {
  throw new Error("Missing FIREBASE_PROJECT_ID in backend/.env");
}

// Initialize firebase-admin once — only the projectId is needed to verify tokens.
// No service account JSON required; the SDK fetches Firebase's public keys itself.
if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}

/**
 * Express middleware that verifies the Firebase Bearer token via firebase-admin
 * and attaches `req.uid` and `req.firebaseUser` (the decoded token) to the request.
 */
export async function requireAuth(req, res, next) {
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
