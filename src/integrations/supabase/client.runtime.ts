// Runtime-safe Supabase client (used via Vite alias override).
// These are *publishable* keys and safe to bundle.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  `https://${((import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined)?.trim()) || "zsfwdkpbhcyxotsjpqab"}.supabase.co`;

const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZndka3BiaGN5eG90c2pwcWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzODI5ODcsImV4cCI6MjA4Njk1ODk4N30.KQTmmxSP5TCpdEeP_pPi_WDV0GqtssTmF8YgSTYoHf0";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
