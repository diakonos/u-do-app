import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflight();
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({
        error: "No authorization header",
      }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const body = await req.json();
    console.log("[search-users] Request body:", JSON.stringify(body));
    const { query } = body;
    if (!query || typeof query !== "string") {
      console.log("[search-users] Invalid query:", query);
      return new Response(
        JSON.stringify({
          error: "Search query is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create client using the shared function
    console.log("[search-users] Creating Supabase client via shared function");
    const supabaseClient = createSupabaseClient(authHeader);

    // Verify the JWT token (using the client created with auth header)
    const { data: { user }, error: authError } = await supabaseClient.auth
      .getUser(); // getUser() now uses the client's auth header

    if (authError || !user) {
      console.error("[search-users] Authentication failed:", authError);
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    console.log("[search-users] Executing search query:", query);
    const { data: users, error } = await supabaseClient
      .from("user_profiles")
      .select("id, email, username, user_id") // Include user_id
      .or(`email.ilike.%${query}%,username.ilike.%${query}%`)
      .neq("user_id", user.id) // Exclude the current user
      .limit(10);
    if (error) {
      console.error("[search-users] Database error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to search users",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    console.log("[search-users] Found users:", users?.length ?? 0);
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      user_id: user.user_id, // Add user_id to the response object
    }));
    return new Response(
      JSON.stringify({
        users: formattedUsers,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    console.error("[search-users] Unexpected error:", err);
    // Check if the error is due to missing env vars from the shared function
    if (
      err instanceof Error &&
      err.message.includes("Missing required Supabase environment variables")
    ) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
