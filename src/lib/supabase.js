import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const TABLE_PREFIX = import.meta.env.VITE_TABLE_PREFIX;

if (!url || !anonKey || !TABLE_PREFIX) {
  console.error(
    'Iron Front: missing required env vars. Copy .env.example to .env and fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_TABLE_PREFIX.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const T = {
  players: `${TABLE_PREFIX}_players`,
  frontLine: `${TABLE_PREFIX}_front_line`,
  kills: `${TABLE_PREFIX}_kills`,
};
