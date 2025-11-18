import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Export a Supabase client only when the env vars are present
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Optional bucket override for GPX files. Defaults to 'race-tracks'
export const GPX_BUCKET = import.meta.env.VITE_SUPABASE_GPX_BUCKET || 'race-tracks';
