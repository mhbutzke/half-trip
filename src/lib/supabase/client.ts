import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Returns a singleton Supabase browser client.
 *
 * Re-using a single instance avoids creating multiple WebSocket connections
 * for Realtime subscriptions and prevents the "Max payload size exceeded"
 * error that can occur when many parallel clients negotiate at once.
 */
export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env file.'
    );
  }

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
