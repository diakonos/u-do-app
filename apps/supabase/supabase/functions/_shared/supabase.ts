import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * Creates a Supabase client configured with the provided Authorization header.
 *
 * @param authHeader The Authorization header string (e.g., "Bearer YOUR_JWT_TOKEN").
 * @returns An initialized Supabase client or throws an error if env vars are missing.
 */
export function createSupabaseClient(authHeader: string): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "[_shared/supabase] Critical: Missing Supabase URL or Anon Key environment variables.",
    );
    throw new Error("Missing required Supabase environment variables");
  }

  // Create client with auth context
  const supabaseClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false, // Important for edge functions
    },
  });

  return supabaseClient;
}

/**
 * Creates a Supabase client using the service role key for elevated privileges.
 * Use with caution, typically for admin tasks or operations requiring bypassing RLS.
 *
 * @returns An initialized Supabase client with service role privileges.
 * @throws Error if Supabase URL or Service Role Key environment variables are missing.
 */
export function createSupabaseServiceRoleClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "[_shared/supabase] Critical: Missing Supabase URL or Service Role Key environment variables.",
    );
    throw new Error(
      "Missing required Supabase environment variables for service role",
    );
  }

  const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}
