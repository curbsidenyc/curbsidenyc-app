import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hjtkodlbgaxueomrswgw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqdGtvZGxiZ2F4dWVvbXNyd2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTMzNDgsImV4cCI6MjA5NjU4OTM0OH0.-xznbMeIwfmVbhFEUynFMkLnPVrnjmD84XXftNXb-yM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);