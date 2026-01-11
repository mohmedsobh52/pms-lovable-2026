// Runtime-safe Supabase client (used via Vite alias override).
// NOTE: This project runs on Lovable Cloud; these values are *publishable* and safe to bundle.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const FALLBACK_PROJECT_ID = "brbgdvesterjvwduvsrf";
const FALLBACK_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyYmdkdmVzdGVyanZ3ZHV2c3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzI4MTgsImV4cCI6MjA4MTkwODgxOH0.mB1HiHRWUz-imswTy1w5vtSUt11eKWHzoYEiGQGqT3g";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  ((import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined)?.trim()
    ? `https://${(import.meta.env.VITE_SUPABASE_PROJECT_ID as string).trim()}.supabase.co`
    : `https://${FALLBACK_PROJECT_ID}.supabase.co`);

const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  FALLBACK_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
