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
      return new Response(JSON.stringify({ error: "not_authenticated", message: "No authentication token provided" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user with anon client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "not_authenticated", message: "Invalid or expired session" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Check admin role using service client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "unauthorized", message: "You do not have admin privileges" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch stats with service client
    const [
      projectsRes,
      contractsRes,
      quotationsRes,
      templatesRes,
    ] = await Promise.all([
      adminClient.from("saved_projects").select("id, project_name, created_at, items_count, user_id"),
      adminClient.from("contracts").select("id", { count: "exact", head: true }),
      adminClient.from("price_quotations").select("id", { count: "exact", head: true }),
      adminClient.from("boq_templates").select("id", { count: "exact", head: true }),
    ]);

    const projects = projectsRes.data || [];
    const uniqueUsers = new Set(projects.map((p: any) => p.user_id)).size;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentProjects = projects.filter(
      (p: any) => new Date(p.created_at) > thirtyDaysAgo
    ).length;

    const latestProjects = [...projects]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((p: any) => ({
        id: p.id,
        name: p.project_name,
        created_at: p.created_at,
        items_count: p.items_count || 0,
      }));

    return new Response(
      JSON.stringify({
        totalUsers: uniqueUsers,
        totalProjects: projects.length,
        recentProjects,
        totalContracts: contractsRes.count || 0,
        totalQuotations: quotationsRes.count || 0,
        totalTemplates: templatesRes.count || 0,
        latestProjects,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Admin stats error:", err);
    return new Response(JSON.stringify({ error: "internal_error", message: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
