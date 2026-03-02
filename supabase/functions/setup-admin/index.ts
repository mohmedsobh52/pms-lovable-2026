import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***@***";
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.log("setup-admin: Invalid or expired token", claimsError?.message);
      return new Response(JSON.stringify({ error: "not_authenticated", message: "Invalid or expired session. Please log in again." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = { id: claimsData.claims.sub as string, email: (claimsData.claims.email as string) || "unknown" };
    console.log("setup-admin: Authenticated user:", user.id, user.email);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if any admin already exists
    const { data: existingAdmins, error: checkError } = await adminClient
      .from("user_roles")
      .select("user_id")
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
      
      // Get admin email for contact info
      let adminEmail = "";
      try {
        const adminUserId = existingAdmins[0].user_id;
        const { data: adminUser } = await adminClient.auth.admin.getUserById(adminUserId);
        if (adminUser?.user?.email) {
          adminEmail = maskEmail(adminUser.user.email);
        }
      } catch (e) {
        console.error("Error fetching admin email:", e);
      }

      return new Response(JSON.stringify({ 
        error: "admin_exists", 
        message: "An admin already exists",
        admin_email: adminEmail || undefined,
      }), {
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
