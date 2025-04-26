import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase.ts"; // Import the shared function

Deno.serve(async (req) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Attempting to authenticate user...");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("Authorization header missing");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create client using the shared function
    const supabase = createSupabaseClient(authHeader);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "Authentication error:",
        userError?.message || "User not found",
      );
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const requestingUserId = user.id;
    console.log(`Authenticated user ID: ${requestingUserId}`);

    const body = await req.json();
    const friend_id = body?.friend_id;
    console.log(`Received friend_id: ${friend_id}`);

    if (!friend_id) {
      console.log("friend_id missing in request body");
      return new Response(
        JSON.stringify({ error: "Missing friend_id in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `Checking friendship between ${requestingUserId} and ${friend_id}...`,
    );
    // Define filters uniquely
    const friendFilter1 =
      `and(requester_id.eq.${requestingUserId},recipient_id.eq.${friend_id},status.eq.confirmed)`;
    const friendFilter2 =
      `and(requester_id.eq.${friend_id},recipient_id.eq.${requestingUserId},status.eq.confirmed)`;
    const friendOrFilter = `${friendFilter1},${friendFilter2}`;

    const { data: friendshipData, error: friendshipCheckError } = await supabase
      .from("friend_requests")
      .select("status")
      .or(friendOrFilter)
      .maybeSingle();

    if (friendshipCheckError) {
      console.error("Error checking friendship:", friendshipCheckError);
      return new Response(
        JSON.stringify({ error: "Internal server error checking friendship" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!friendshipData) {
      console.log(
        `Friendship between ${requestingUserId} and ${friend_id} not found or not confirmed.`,
      );
      return new Response(
        JSON.stringify({ error: "Not friends or friendship not confirmed" }),
        {
          status: 403, // Forbidden
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    console.log(
      `Friendship confirmed between ${requestingUserId} and ${friend_id}.`,
    );

    const todayDate = new Date().toISOString().split("T")[0]; // Renamed variable
    console.log(`Fetching tasks for user ${friend_id} due on ${todayDate}...`);

    const { data: tasksData, error: tasksFetchError } = await supabase // Renamed variables
      .from("tasks")
      .select("*")
      .eq("user_id", friend_id)
      .eq("due_date", todayDate);

    if (tasksFetchError) {
      console.error("Error fetching tasks:", tasksFetchError);
      return new Response(
        JSON.stringify({ error: "Internal server error fetching tasks" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `Found ${tasksData?.length ?? 0} tasks for user ${friend_id} due today.`,
    );
    return new Response(
      JSON.stringify(tasksData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Caught unexpected error in request handler:", error);
    // Check if the error is due to missing env vars from the shared function
    if (
      error instanceof Error &&
      error.message.includes("Missing required Supabase environment variables")
    ) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
