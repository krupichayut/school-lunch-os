import { createClient } from "@supabase/supabase-js";

// Cloud Supabase configuration with production fallback
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://bbemuslqtynbdmazpzhz.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_EKm3TSva16hDGTyjmIFZDQ_rCLdS63L";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "https://your-project.supabase.co" &&
    supabaseAnonKey !== "your-anon-key"
);

// Client-side Supabase client singleton
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
