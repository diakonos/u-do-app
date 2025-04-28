// Setup type definitions for built-in Supabase Runtime APIs
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
    const { task_name, due_date } = await req.json();
    if (!task_name || !due_date) {
      return new Response(
        JSON.stringify({ error: "Task name and due date are required" }),
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
      console.error("[create-new-task] Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert the new task
    const { data, error } = await supabaseClient
      .from("tasks")
      .insert([{ user_id: user.id, task_name, due_date }])
      .select();

    if (error) {
      console.error("[create-new-task] DB error:", error);
      return new Response(JSON.stringify({ error: "Failed to create task" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });
  } catch (err) {
    console.error("[create-new-task] Unexpected error:", err);
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
