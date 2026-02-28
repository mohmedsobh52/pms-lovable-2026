import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("setup-admin: No auth token provided");
      return new Response(JSON.stringify({ error: "not_authenticated", message: "No authentication token provided" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.log("setup-admin: Invalid or expired token", userError?.message);
      return new Response(JSON.stringify({ error: "not_authenticated", message: "Invalid or expired session. Please log in again." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("setup-admin: Authenticated user:", user.id, user.email);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if any admin already exists
    const { data: existingAdmins, error: checkError } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (checkError) {
      console.error("Check admin error:", checkError);
      return new Response(JSON.stringify({ error: "internal_error", message: "Failed to check admin status" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingAdmins && existingAdmins.length > 0) {
      console.log("setup-admin: Admin already exists");
      return new Response(JSON.stringify({ error: "admin_exists", message: "An admin already exists" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No admin exists — assign current user as admin
    const { error: insertError } = await adminClient
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" });

    if (insertError) {
      console.error("Insert admin error:", insertError);
      return new Response(JSON.stringify({ error: "insert_failed", message: "Failed to assign admin role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("setup-admin: Successfully assigned admin role to", user.email);
    return new Response(JSON.stringify({ success: true, message: "You are now the system admin" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Setup admin error:", err);
    return new Response(JSON.stringify({ error: "internal_error", message: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
