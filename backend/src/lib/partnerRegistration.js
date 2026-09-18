import { query, execute } from "../db.js";
import { ensureUserByFirebaseUid, isClientRole, fetchUserWithCategories } from "./userProfile.js";
import { ensureWorkspaceForOwner } from "./workspace.js";

export async function registerPartner({
  firebaseUid,
  email,
  username,
  companyName,
  bio,
  locationCity,
  categoryIds = [],
}) {
  if (!username || typeof username !== "string" || username.trim().length < 2) {
    return { error: "username must be at least 2 characters", status: 400 };
  }

  const uniqueCategoryIds = [...new Set(categoryIds.filter(Boolean))];

  if (uniqueCategoryIds.length > 0) {
    const categories = await query(
      `SELECT id FROM categories WHERE id = ANY($1::uuid[])`,
      [uniqueCategoryIds]
    );
    if (categories.length !== uniqueCategoryIds.length) {
      return { error: "One or more categories are invalid", status: 400 };
    }
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

  await execute("DELETE FROM user_categories WHERE user_id = $1", [profile.id]);
  for (const categoryId of uniqueCategoryIds) {
    await execute(
      "INSERT INTO user_categories (user_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [profile.id, categoryId]
    );
  }

  await execute(
    `INSERT INTO expert_profiles (user_id, bio, location_city, is_available, updated_at)
     VALUES ($1, $2, $3, TRUE, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       bio = EXCLUDED.bio,
       location_city = EXCLUDED.location_city,
       is_available = TRUE,
       updated_at = NOW()`,
    [profile.id, bio?.trim() || null, locationCity?.trim() || "Remote"]
  );

  await ensureWorkspaceForOwner(profile.id, companyName?.trim() || username.trim());

  const user = await fetchUserWithCategories("u.id = $1", [profile.id]);
  return { user };
}
