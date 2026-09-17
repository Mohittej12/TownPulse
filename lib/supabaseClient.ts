import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Check if the Supabase environment variables have been provided.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl !== "https://your-project-id.supabase.co" &&
      supabaseAnonKey !== "your-anon-key-here" &&
      supabaseUrl.startsWith("http")
  );
}

/**
 * Shared Supabase Client instance.
 * If credentials are not configured, it creates a fallback dummy client so imports won't crash.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);
