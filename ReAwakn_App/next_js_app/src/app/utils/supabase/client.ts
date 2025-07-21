import { createBrowserClient } from "@supabase/ssr";

// Create a single instance of the Supabase client
const supabaseClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Export the singleton client directly
export const supabase = supabaseClient;

// Keep the createClient function for backward compatibility
export default function createClient() {
  return supabaseClient;
}
