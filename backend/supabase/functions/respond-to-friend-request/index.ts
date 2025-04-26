import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflight();
  }

  console.log("[respond-to-friend-request] Received request");

  if (req.method !== "POST") {
    console.log("[respond-to-friend-request] Invalid method:", req.method);
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.log("[respond-to-friend-request] Missing Authorization header");
    return new Response(
      JSON.stringify({
        error: "Authorization header is missing",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      },
    );
  }

  try {
    console.log("[respond-to-friend-request] Creating Supabase client");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error(
        "[respond-to-friend-request] Missing environment variables",
      );
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    console.log("[respond-to-friend-request] Verifying user token");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(
      token,
    );

    if (userError) {
      console.error(
        "[respond-to-friend-request] User verification error:",
        userError,
      );
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: userError.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    if (!userData?.user) {
      console.log("[respond-to-friend-request] No user found for token");
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: "No user found",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const { user } = userData;
    const body = await req.json();
    const { request_id, action } = body;

    if (!request_id || !action) {
      return new Response(
        JSON.stringify({
          error: "request_id and action are required",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    if (action !== "accept" && action !== "reject") {
      return new Response(
        JSON.stringify({
          error: "action must be either 'accept' or 'reject'",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Get the friend request and verify the user is the recipient
    const { data: request, error: requestError } = await supabase
      .from("friend_requests")
      .select()
      .eq("id", request_id)
      .eq("recipient_id", user.id)
      .single();

    if (requestError) {
      console.error(
        "[respond-to-friend-request] Error fetching request:",
        requestError,
      );
      return new Response(
        JSON.stringify({
          error: "Friend request not found or you are not the recipient",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    if (request.status !== "pending") {
      return new Response(
        JSON.stringify({
          error: "Friend request has already been processed",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Update the request status
    const newStatus = action === "accept" ? "confirmed" : "rejected";
    const { data: updatedRequest, error: updateError } = await supabase
      .from("friend_requests")
      .update({ status: newStatus })
      .eq("id", request_id)
      .select();

    if (updateError) {
      console.error("[respond-to-friend-request] Database error:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        data: updatedRequest,
        message: `Friend request ${action}ed successfully`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    console.error("[respond-to-friend-request] Unexpected error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
