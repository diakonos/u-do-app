// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
    });
  }
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization"),
          },
        },
      },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(
      token,
    );
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
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
    const { task_name, due_date } = await req.json();
    const { data, error } = await supabase.from("tasks").insert({
      task_name,
      due_date,
      updated_at: new Date().toISOString(),
      user_id: user.id,
    }).select();
    if (error) {
      throw error;
    }
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
    return new Response(
      JSON.stringify({
        message: err?.message ?? err,
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
