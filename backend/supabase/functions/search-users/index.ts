import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
Deno.serve(async (req)=>{
  console.log("[search-users] Received request");
  try {
    // Verify authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[search-users] Missing Authorization header");
      return new Response(JSON.stringify({
        error: "Missing Authorization header"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const body = await req.json();
    console.log("[search-users] Request body:", JSON.stringify(body));
    const { query } = body;
    if (!query || typeof query !== "string") {
      console.log("[search-users] Invalid query:", query);
      return new Response(JSON.stringify({
        error: "Search query is required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    console.log("[search-users] Creating Supabase client");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey) {
      console.error("[search-users] Missing environment variables");
      throw new Error("Missing required environment variables");
    }
    // Create client with auth context
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      },
      auth: {
        persistSession: false
      }
    });
    // Verify the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error("[search-users] Authentication failed:", authError);
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    console.log("[search-users] Executing search query:", query);
    const { data: users, error } = await supabaseClient.from("user_profiles").select("id, email, username").or(`email.ilike.%${query}%,username.ilike.%${query}%`).limit(10);
    if (error) {
      console.error("[search-users] Database error:", error);
      return new Response(JSON.stringify({
        error: "Failed to search users"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    console.log("[search-users] Found users:", users?.length ?? 0);
    const formattedUsers = users.map((user)=>({
        id: user.id,
        email: user.email,
        username: user.username
      }));
    return new Response(JSON.stringify({
      users: formattedUsers
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("[search-users] Unexpected error:", err);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: err instanceof Error ? err.message : String(err)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
