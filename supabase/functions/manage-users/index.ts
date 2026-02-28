import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifyAdmin(req: Request): Promise<{ userId: string; adminClient: any } | { error: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { error: "not_authenticated" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error } = await userClient.auth.getClaims(token);
  if (error || !claimsData?.claims?.sub) return { error: "not_authenticated" };

  const userId = claimsData.claims.sub as string;
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) return { error: "unauthorized" };
  return { userId, adminClient };
}

async function listUsers(adminClient: any, isArabic = false) {
  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({ perPage: 500 });
  if (authError) throw authError;

  const { data: roles } = await adminClient.from("user_roles").select("user_id, role");
  const roleMap = new Map<string, string>();
  (roles || []).forEach((r: any) => roleMap.set(r.user_id, r.role));

  const users = (authData?.users || []).map((u: any) => ({
    id: u.id,
    email: u.email || "",
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    role: roleMap.get(u.id) || "user",
    has_role_record: roleMap.has(u.id),
  }));

  const totalAdmins = users.filter((u: any) => u.role === "admin").length;
  const totalModerators = users.filter((u: any) => u.role === "moderator").length;
  const totalRegular = users.length - totalAdmins - totalModerators;

  return {
    users,
    stats: { total: users.length, admins: totalAdmins, moderators: totalModerators, regular: totalRegular },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const result = await verifyAdmin(req);
    if ("error" in result) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { adminClient } = result;

    // ============= GET: List users (backward compat) =============
    if (req.method === "GET") {
      const data = await listUsers(adminClient);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============= POST: Actions =============
    if (req.method === "POST") {
      const body = await req.json();
      const { action, user_id, role } = body;

      // List users via POST
      if (action === "list_users") {
        const data = await listUsers(adminClient);
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "set_role") {
        if (!["admin", "moderator", "user"].includes(role)) {
          return new Response(JSON.stringify({ error: "Invalid role" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (role === "user") {
          await adminClient.from("user_roles").delete().eq("user_id", user_id);
        } else {
          const { error: upsertError } = await adminClient
            .from("user_roles")
            .upsert({ user_id, role }, { onConflict: "user_id,role" });

          if (upsertError) {
            await adminClient.from("user_roles").delete().eq("user_id", user_id);
            const { error: insertError } = await adminClient
              .from("user_roles")
              .insert({ user_id, role });
            if (insertError) throw insertError;
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "remove_role") {
        await adminClient.from("user_roles").delete().eq("user_id", user_id);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("manage-users error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
