import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

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
    console.log("[send-friend-request] Creating Supabase client");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[send-friend-request] Missing environment variables");
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

    console.log("[send-friend-request] Verifying user token");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(
      token,
    );

    if (userError) {
      console.error(
        "[send-friend-request] User verification error:",
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
      console.log("[send-friend-request] No user found for token");
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
    const { recipient_id } = body;

    if (!recipient_id) {
      return new Response(
        JSON.stringify({
          error: "recipient_id is required",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Check if a friend request already exists
    const { data: existingRequest, error: checkError } = await supabase
      .from("friend_requests")
      .select()
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .or(`requester_id.eq.${recipient_id},recipient_id.eq.${recipient_id}`)
      .single();

    if (checkError && checkError.code !== "PGRST116") { // PGRST116 means no rows found
      console.error(
        "[send-friend-request] Error checking existing request:",
        checkError,
      );
      throw checkError;
    }

    if (existingRequest) {
      return new Response(
        JSON.stringify({
          error: "A friend request already exists between these users",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Create new friend request
    const { data, error } = await supabase.from("friend_requests").insert({
      requester_id: user.id,
      recipient_id,
      status: "pending",
    }).select();

    if (error) {
      console.error("[send-friend-request] Database error:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({
        data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      },
    );
  } catch (err) {
    console.error("[send-friend-request] Unexpected error:", err);
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
