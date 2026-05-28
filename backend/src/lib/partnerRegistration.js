import supabase from "../db.js";
import { ensureUserByFirebaseUid, isClientRole } from "./userProfile.js";

const MAX_SERVICES = 20;

function normalizeService(raw) {
  const title = raw?.title?.trim();
  if (!title || title.length > 200) return null;

  return {
    categoryId: raw.categoryId ?? null,
    title,
    description: raw.description?.trim() || null,
    priceFrom: raw.priceFrom != null ? Number(raw.priceFrom) : null,
    priceTo: raw.priceTo != null ? Number(raw.priceTo) : null,
    priceUnit: raw.priceUnit ?? "project",
    currency: raw.currency ?? "EUR",
  };
}

export async function registerPartner({
  firebaseUid,
  email,
  username,
  companyName,
  bio,
  locationCity,
  categoryIds = [],
  services = [],
}) {
  if (!username || typeof username !== "string" || username.trim().length < 2) {
    return { error: "username must be at least 2 characters", status: 400 };
  }

  const uniqueCategoryIds = [...new Set(categoryIds.filter(Boolean))];
  if (uniqueCategoryIds.length === 0) {
    return { error: "Select at least one service category", status: 400 };
  }

  const normalizedServices = services
    .map(normalizeService)
    .filter(Boolean)
    .slice(0, MAX_SERVICES);

  for (const svc of normalizedServices) {
    if (svc.categoryId && !uniqueCategoryIds.includes(svc.categoryId)) {
      return { error: "Each service must belong to a selected category", status: 400 };
    }
  }

  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id")
    .in("id", uniqueCategoryIds);

  if (catErr) throw catErr;
  if ((categories ?? []).length !== uniqueCategoryIds.length) {
    return { error: "One or more categories are invalid", status: 400 };
  }

  const profile = await ensureUserByFirebaseUid({
    firebaseUid,
    email: email ?? "",
    username: username.trim(),
    role: "expert",
  });

  if (profile.role !== "expert" && !isClientRole(profile.role)) {
    return { error: "This account cannot be registered as a partner", status: 403 };
  }

  if (profile.role !== "expert") {
    const { error: roleErr } = await supabase
      .from("users")
      .update({ role: "expert" })
      .eq("id", profile.id);
    if (roleErr) throw roleErr;
  }

  const userUpdates = {};
  if (companyName !== undefined) userUpdates.company_name = companyName?.trim() || null;

  if (Object.keys(userUpdates).length > 0) {
    const { error: userErr } = await supabase
      .from("users")
      .update(userUpdates)
      .eq("id", profile.id);
    if (userErr) throw userErr;
  }

  await supabase.from("user_categories").delete().eq("user_id", profile.id);

  const { error: ucErr } = await supabase.from("user_categories").insert(
    uniqueCategoryIds.map((categoryId) => ({
      user_id: profile.id,
      category_id: categoryId,
    }))
  );
  if (ucErr) throw ucErr;

  const { error: epErr } = await supabase.from("expert_profiles").upsert(
    {
      user_id: profile.id,
      bio: bio?.trim() || null,
      location_city: locationCity?.trim() || "Remote",
      is_available: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (epErr) throw epErr;

  if (normalizedServices.length > 0) {
    const { error: svcErr } = await supabase.from("partner_services").insert(
      normalizedServices.map((svc, index) => ({
        partner_id: profile.id,
        category_id: svc.categoryId,
        title: svc.title,
        description: svc.description,
        price_from: svc.priceFrom,
        price_to: svc.priceTo,
        price_unit: svc.priceUnit,
        currency: svc.currency,
        sort_order: index,
      }))
    );
    if (svcErr) throw svcErr;
  }

  const { data: user, error: fetchErr } = await supabase
    .from("users")
    .select("*, user_categories(category_id, categories(*))")
    .eq("id", profile.id)
    .single();

  if (fetchErr) throw fetchErr;
  return { user };
}
