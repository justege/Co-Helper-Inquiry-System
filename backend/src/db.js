import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env"
  );
}

// Service role key bypasses RLS — this client is for trusted server-side use only.
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export default supabase;
