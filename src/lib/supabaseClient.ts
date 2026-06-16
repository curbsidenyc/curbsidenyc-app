import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hjtkodlbgaxueomrswgw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iOgNUp2iwbPy9XcgT2P_cQ_EdeNV49i";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);