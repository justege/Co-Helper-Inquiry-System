import supabase from "./db.js";

const BUCKETS = [
  { id: "inquiry-documents", public: false, fileSizeLimit: 52_428_800 },
  { id: "partner-documents", public: false, fileSizeLimit: 52_428_800 },
];

/**
 * Ensures required Supabase Storage buckets exist.
 * Uses the service-role client — safe to call on server startup.
 */
export async function ensureStorageBuckets() {
  const { data: existing, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.warn("[storage] Could not list buckets:", listErr.message);
    return;
  }

  const existingIds = new Set((existing ?? []).map((b) => b.id));

  for (const bucket of BUCKETS) {
    if (existingIds.has(bucket.id)) continue;

    const { error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
    });

    if (error) {
      console.warn(`[storage] Failed to create bucket "${bucket.id}":`, error.message);
    } else {
      console.log(`[storage] Created bucket "${bucket.id}"`);
    }
  }
}

function isMissingBucketError(message = "") {
  return /does not exist|not found|Bucket not found/i.test(message);
}

/** Create a signed upload URL, auto-creating the bucket if missing. */
export async function createSignedUploadUrl(bucket, filePath) {
  let result = await supabase.storage.from(bucket).createSignedUploadUrl(filePath);

  if (result.error && isMissingBucketError(result.error.message)) {
    await ensureStorageBuckets();
    result = await supabase.storage.from(bucket).createSignedUploadUrl(filePath);
  }

  return result;
}
