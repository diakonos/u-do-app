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
    const username = body?.username; // Changed from friend_id to username
    console.log(`Received username: ${username}`);

    if (!username) {
      console.log("username missing in request body");
      return new Response(
        JSON.stringify({ error: "Missing username in request body" }), // Updated error message
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch the friend's user ID based on the username
    console.log(`Fetching user ID for username: ${username}...`);
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("username", username)
      .single();

    if (profileError || !profileData) {
      console.error(
        "Error fetching profile or profile not found:",
        profileError?.message || "Profile not found",
      );
      const status = profileError?.code === "PGRST116" ? 404 : 500; // PGRST116: Row not found
      const message = status === 404
        ? "User not found"
        : "Internal server error fetching user profile";
      return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const friendUserId = profileData.user_id; // Renamed variable
    console.log(`Found user ID for ${username}: ${friendUserId}`);

    // Prevent users from fetching their own tasks via this endpoint
    if (requestingUserId === friendUserId) {
      console.log(
        "User attempted to fetch their own tasks via friend endpoint.",
      );
      return new Response(
        JSON.stringify({ error: "Cannot fetch own tasks using this endpoint" }),
        {
          status: 403, // Forbidden
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `Checking friendship between ${requestingUserId} and ${friendUserId}...`, // Updated log
    );
    // Define filters uniquely using the fetched friendUserId
    const friendFilter1 =
      `and(requester_id.eq.${requestingUserId},recipient_id.eq.${friendUserId},status.eq.confirmed)`; // Use friendUserId
    const friendFilter2 =
      `and(requester_id.eq.${friendUserId},recipient_id.eq.${requestingUserId},status.eq.confirmed)`; // Use friendUserId
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
        `Friendship between ${requestingUserId} and ${friendUserId} not found or not confirmed.`, // Updated log
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
      `Friendship confirmed between ${requestingUserId} and ${friendUserId}.`, // Updated log
    );

    const todayDate = new Date().toISOString().split("T")[0];
    console.log(
      `Fetching tasks for user ${friendUserId} (username: ${username}) due on ${todayDate}...`,
    ); // Updated log

    const { data: tasksData, error: tasksFetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", friendUserId) // Use friendUserId
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
      `Found ${
        tasksData?.length ?? 0
      } tasks for user ${friendUserId} (username: ${username}) due today.`, // Updated log
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
