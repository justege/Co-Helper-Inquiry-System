import { execute } from "../db.js";
import { ensureUserByFirebaseUid, isClientRole, fetchUser } from "./userProfile.js";
import { ensureWorkspaceForOwner } from "./workspace.js";

export async function registerPartner({
  firebaseUid,
  email,
  username,
  companyName,
}) {
  if (!username || typeof username !== "string" || username.trim().length < 2) {
    return { error: "username must be at least 2 characters", status: 400 };
  }

  const profile = await ensureUserByFirebaseUid({
    firebaseUid,
    email: email ?? "",
    username: username.trim(),
    role: "expert",
  });

  if (profile.role !== "expert" && !isClientRole(profile.role)) {
    return { error: "This account cannot start a workspace", status: 403 };
  }

  if (profile.role !== "expert") {
    await execute("UPDATE users SET role = 'expert' WHERE id = $1", [profile.id]);
  }

  if (companyName !== undefined) {
    await execute("UPDATE users SET company_name = $1 WHERE id = $2", [
      companyName?.trim() || null,
      profile.id,
    ]);
  }

  await ensureWorkspaceForOwner(profile.id, companyName?.trim() || username.trim());

  const user = await fetchUser("u.id = $1", [profile.id]);
  return { user };
}
