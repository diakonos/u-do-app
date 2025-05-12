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
    const { receiver_id } = await req.json();
    if (!receiver_id) {
      return new Response(
        JSON.stringify({ error: "Receiver ID is required" }),
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
      console.error("[send-friend-request] Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sender_id = user.id;

    // Prevent sending request to self
    if (sender_id === receiver_id) {
      return new Response(
        JSON.stringify({ error: "Cannot send friend request to yourself" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if a request already exists (pending, confirmed, or blocked)
    // TODO: Add handling for blocked status if implemented
    const { data: existingRequest, error: checkError } = await supabaseClient
      .from("friend_requests")
      .select("id, status")
      .or(
        `and(requester_id.eq.${sender_id},recipient_id.eq.${receiver_id})`,
        `and(requester_id.eq.${receiver_id},recipient_id.eq.${sender_id})`,
      )
      .maybeSingle(); // Use maybeSingle as there should be at most one request between two users

    if (checkError) {
      console.error("[send-friend-request] DB check error:", checkError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing requests" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (existingRequest) {
      let message = "Friend request already exists.";
      if (existingRequest.status === "confirmed") {
        message = "You are already friends.";
      } else if (existingRequest.status === "pending") {
        message = "A friend request is already pending.";
      }
      // Add logic for 'rejected' or 'blocked' if needed
      return new Response(JSON.stringify({ error: message }), {
        status: 409, // Conflict
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert the new friend request
    const { data, error } = await supabaseClient
      .from("friend_requests")
      .insert([{
        requester_id: sender_id,
        recipient_id: receiver_id,
        status: "pending",
      }])
      .select()
      .single();

    if (error) {
      console.error("[send-friend-request] DB insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send friend request" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });
  } catch (err) {
    console.error("[send-friend-request] Unexpected error:", err);
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
