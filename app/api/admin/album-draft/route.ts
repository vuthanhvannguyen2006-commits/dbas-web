import { createClient } from "@supabase/supabase-js";
import {
  createGate,
  createRateLimiter,
  handleAlbumDraft,
} from "@/lib/album-ai";

// Provider credentials (OPENAI_API_KEY, OPENAI_MODEL) are read here, on the
// server, per request. They are never exposed to the browser or written to code.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter(Date.now);
const gate = createGate();

async function verify(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase is not configured.");
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  // Asks the auth service to validate the token; the payload alone is not trusted.
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  // Read under the caller's own token, so row level security answers as it does
  // in the admin dashboard. The role comes from the database, never the client.
  const profile = await client
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile.error) throw new Error("Role lookup failed.");
  return { id: data.user.id, role: (profile.data?.role as string) ?? null };
}

export async function POST(request: Request) {
  return handleAlbumDraft(request, {
    verify,
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
    },
    fetch: (url, init) => fetch(url, init),
    limiter,
    gate,
  });
}
