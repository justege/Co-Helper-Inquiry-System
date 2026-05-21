import supabase from "../db.js";

const ROLE_HIERARCHY = { superadmin: 3, admin: 2, member: 1 };

/**
 * Fetches the current user's role from the DB and attaches it to `req.userRole`.
 * Must be used after `requireAuth`.
 */
export async function attachRole(req, res, next) {
  const { data, error } = await supabase
    .from("users")
    .select("id, role")
    .eq("firebase_uid", req.uid)
    .maybeSingle();

  if (error || !data) {
    return res.status(403).json({ error: "User profile not found" });
  }

  req.dbUser = data;
  req.userRole = data.role;
  next();
}

/**
 * Returns middleware that allows access only if the user's role meets
 * the minimum required level.
 *
 * Usage:  router.delete("/:id", requireAuth, requireRole("superadmin"), handler)
 */
export function requireRole(...allowedRoles) {
  return [
    attachRole,
    (req, res, next) => {
      if (allowedRoles.includes(req.userRole)) return next();
      return res.status(403).json({ error: "Insufficient permissions" });
    },
  ];
}

/**
 * Convenience helpers
 */
export const isSuperadmin = requireRole("superadmin");
export const isAdminOrAbove = requireRole("superadmin", "admin");
