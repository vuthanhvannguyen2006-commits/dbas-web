import { createClient } from "@supabase/supabase-js";

// The URL and anon key are public by design — they ship inside the browser
// bundle. All write protection lives in the database's Row Level Security
// policies, never here. See PLAN.md → "Row Level Security".
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Null rather than a half-built client when the environment is missing, so
// public pages can fall back to /public/data/*.json instead of crashing.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
