// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  console.log("[create-task] Received request");

  if (req.method !== "POST") {
    console.log("[create-task] Invalid method:", req.method);
    return new Response("Method Not Allowed", {
      status: 405,
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.log("[create-task] Missing Authorization header");
    return new Response(
      JSON.stringify({
        error: "Authorization header is missing",
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
        status: 401,
      },
    );
  }

  try {
    console.log("[create-task] Creating Supabase client");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[create-task] Missing environment variables");
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

    console.log("[create-task] Verifying user token");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(
      token,
    );

    if (userError) {
      console.error("[create-task] User verification error:", userError);
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: userError.message,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 401,
        },
      );
    }

    if (!userData?.user) {
      console.log("[create-task] No user found for token");
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: "No user found",
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 401,
        },
      );
    }

    const { user } = userData;
    console.log("[create-task] User verified:", user.id);

    const body = await req.json();
    console.log("[create-task] Request body:", JSON.stringify(body));
    const { task_name, due_date } = body;

    if (!task_name) {
      console.log("[create-task] Missing task_name in request");
      return new Response(
        JSON.stringify({
          error: "task_name is required",
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 400,
        },
      );
    }

    console.log("[create-task] Creating new task");
    const { data, error } = await supabase.from("tasks").insert({
      task_name,
      due_date,
      updated_at: new Date().toISOString(),
      user_id: user.id,
    }).select();

    if (error) {
      console.error("[create-task] Database error:", error);
      throw error;
    }

    console.log("[create-task] Task created successfully:", data?.[0]?.id);
    return new Response(
      JSON.stringify({
        data,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
        status: 201,
      },
    );
  } catch (err) {
    console.error("[create-task] Unexpected error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
        status: 500,
      },
    );
  }
});
