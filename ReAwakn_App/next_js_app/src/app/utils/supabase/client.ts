import { createBrowserClient } from "@supabase/ssr";

const supabaseClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const supabase = supabaseClient;

export default function createClient() {
  return supabaseClient;
}
