export function toExpertProfile(row) {
  if (!row) return null;
  return {
    bio: row.bio ?? null,
    locationCity: row.location_city ?? "Istanbul",
    capacityNotes: row.capacity_notes ?? null,
    isAvailable: row.is_available ?? true,
    score: row.score != null ? Number(row.score) : null,
    scoreNotes: row.score_notes ?? null,
    updatedAt: row.updated_at ?? null,
  };
}
