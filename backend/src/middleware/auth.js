import { createRemoteJWKSet, jwtVerify } from "jose";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

if (!PROJECT_ID) {
  throw new Error("Missing FIREBASE_PROJECT_ID in backend/.env");
}

// Firebase's public signing keys — jose caches and auto-rotates these
const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

/**
 * Express middleware that verifies the Firebase Bearer token and attaches
 * `req.uid` and `req.firebaseUser` (the decoded JWT payload) to the request.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }
  const token = header.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    req.uid = payload.sub;
    req.firebaseUser = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
