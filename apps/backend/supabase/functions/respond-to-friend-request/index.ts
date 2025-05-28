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
    return new Response(JSON.stringify({ error: "No authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { request_id, status } = await req.json();
    if (
      !request_id || !status ||
      (status !== "confirmed" && status !== "rejected")
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Request ID and a valid status ('confirmed' or 'rejected') are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create client using shared function
    const supabaseClient = createSupabaseClient(authHeader);

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabaseClient.auth
      .getUser();

    if (authError || !user) {
      console.error("[respond-to-friend-request] Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the friend request status
    const { data, error } = await supabaseClient
      .from("friend_requests")
      .update({ status: status, updated_at: new Date().toISOString() })
      .eq("id", request_id)
      .eq("recipient_id", user.id) // Ensure only the receiver can update
      .eq("status", "pending") // Ensure it can only be updated if pending
      .select()
      .single(); // Expecting a single record to be updated

    if (error) {
      console.error("[respond-to-friend-request] DB error:", error);
      // Check if the error is because no matching row was found
      if (error.code === "PGRST116") { // PostgREST error code for "Matching row not found"
        return new Response(
          JSON.stringify({
            error:
              "Friend request not found, already responded, or you are not the receiver",
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to update friend request" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[respond-to-friend-request] Unexpected error:", err);
    // Handle potential errors from createSupabaseClient
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
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
