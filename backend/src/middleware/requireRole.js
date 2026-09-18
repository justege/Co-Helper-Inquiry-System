import { queryOne } from "../db.js";

/**
 * Fetches the current user's role from the DB and attaches it to `req.userRole`.
 * Must be used after `requireAuth`.
 */
export async function attachRole(req, res, next) {
  const data = await queryOne(
    `SELECT id, role, company_name, username, email, first_name, last_name
     FROM users WHERE firebase_uid = $1`,
    [req.uid]
  );

  if (!data) {
    return res.status(403).json({ error: "User profile not found" });
  }

  req.dbUser = data;
  req.userRole = data.role;
  next();
}

export function requireRole(...allowedRoles) {
  return [
    attachRole,
    (req, res, next) => {
      if (allowedRoles.includes(req.userRole)) return next();
      return res.status(403).json({ error: "Insufficient permissions" });
    },
  ];
}

export const isSuperadmin = requireRole("superadmin");
export const isAdminOrAbove = requireRole("superadmin", "admin");
