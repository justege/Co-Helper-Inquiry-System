import supabase from "../db.js";

export function isClientRole(role) {
  return role === "client" || role === "member";
}

/**
 * Find or create the Postgres user row for a Firebase account.
 * Handles concurrent inserts (GET /users/me vs landing inquiry submission).
 */
export async function ensureUserByFirebaseUid({
  firebaseUid,
  email = "",
  username,
  role = "client",
}) {
  const { data: existing, error: findErr } = await supabase
    .from("users")
    .select("id, role")
    .eq("firebase_uid", firebaseUid)
    .maybeSingle();

  if (findErr) throw findErr;

  const patch = { email: email ?? "" };
  if (username !== undefined) patch.username = username.trim();

  if (existing) {
    const { data: updated, error: updateErr } = await supabase
      .from("users")
      .update(patch)
      .eq("id", existing.id)
      .select("id, role")
      .single();
    if (updateErr) throw updateErr;
    return updated;
  }

  const { data: created, error: createErr } = await supabase
    .from("users")
    .insert({
      firebase_uid: firebaseUid,
      email: email ?? "",
      ...(username !== undefined ? { username: username.trim() } : {}),
      role,
    })
    .select("id, role")
    .single();

  if (!createErr) return created;

  if (createErr.code === "23505") {
    const { data: raced, error: raceErr } = await supabase
      .from("users")
      .select("id, role")
      .eq("firebase_uid", firebaseUid)
      .maybeSingle();
    if (raceErr) throw raceErr;
    if (!raced) throw createErr;

    if (Object.keys(patch).length > 0) {
      const { data: updated, error: updateErr } = await supabase
        .from("users")
        .update(patch)
        .eq("id", raced.id)
        .select("id, role")
        .single();
      if (updateErr) throw updateErr;
      return updated;
    }

    return raced;
  }

  throw createErr;
}
