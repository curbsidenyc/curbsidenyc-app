import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hjtkodlbgaxueomrswgw.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqdGtvZGxiZ2F4dWVvbXNyd2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTMzNDgsImV4cCI6MjA5NjU4OTM0OH0.-xznbMeIwfmVbhFEUynFMkLnPVrnjmD84XXftNXb-yM";
  
  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}

export const supabase = getSupabase();